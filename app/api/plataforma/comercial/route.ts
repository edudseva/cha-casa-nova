import { env } from "cloudflare:workers";
import { requirePlatformOwnerApi } from "@/lib/platform-access";
import { commercialCatalog, commercialError, limitedJson, sameOrigin } from "@/lib/commercial";
import { createAuditStatement } from "@/lib/audit-log";
import { CURRENT_SITE_ID } from "@/lib/site-context";

export async function GET() {
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return commercialError(auth.error, auth.status);
  const [catalog, coupons, requests, metrics] = await Promise.all([
    commercialCatalog(),
    env.DB.prepare("SELECT id, code, discount_percent, expires_at, active, created_at FROM commercial_coupons ORDER BY created_at DESC LIMIT 100").all(),
    env.DB.prepare("SELECT id, email, kind, status, plan_id, coupon_code, amount_cents, note, created_at, updated_at FROM commercial_requests ORDER BY created_at DESC LIMIT 100").all(),
    env.DB.prepare("SELECT kind, status, COUNT(*) AS total FROM commercial_requests GROUP BY kind, status").all(),
  ]);
  return Response.json({ ...catalog, coupons: coupons.results, requests: requests.results, metrics: metrics.results }, { headers: { "cache-control": "no-store, private" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return commercialError("Origem inválida.", 403);
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return commercialError(auth.error, auth.status);
  const body = await limitedJson(request);
  if (!body) return commercialError("Dados inválidos ou muito extensos.");
  const audit = (action: string, id: string) => createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action, entityType: "commercial", entityId: id });

  try {
    if (body.action === "settings.save") {
      const headline = String(body.headline ?? "").trim();
      const description = String(body.description ?? "").trim();
      const email = String(body.salesEmail ?? "").trim().toLowerCase();
      const terms = String(body.termsDraft ?? "").trim();
      const privacy = String(body.privacyDraft ?? "").trim();
      const trialDays = Number(body.trialDays);
      if (headline.length < 8 || headline.length > 100 || description.length < 20 || description.length > 400 ||
        (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
        !Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90 || terms.length > 10000 || privacy.length > 10000) {
        return commercialError("Revise título, descrição, prazo, e-mail e textos jurídicos.");
      }
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO commercial_launch (id, headline, description, trial_days, sales_email, terms_draft, privacy_draft)
          VALUES (1, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET headline=excluded.headline,
          description=excluded.description, trial_days=excluded.trial_days, sales_email=excluded.sales_email,
          terms_draft=excluded.terms_draft, privacy_draft=excluded.privacy_draft, updated_at=CURRENT_TIMESTAMP`)
          .bind(headline, description, trialDays, email, terms, privacy),
        audit("commercial.settings_saved", "1"),
      ]);
    } else if (body.action === "coupon.create") {
      const code = String(body.code ?? "").trim().toUpperCase();
      const percent = Number(body.discountPercent);
      const expiresAt = String(body.expiresAt ?? "");
      if (!/^[A-Z0-9]{4,24}$/.test(code) || !Number.isInteger(percent) || percent < 1 || percent > 100 ||
        (expiresAt && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) || !Number.isFinite(Date.parse(`${expiresAt}T23:59:59Z`)) || expiresAt < new Date().toISOString().slice(0, 10)))) {
        return commercialError("Código, desconto ou validade inválidos.");
      }
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO commercial_coupons (id, code, discount_percent, expires_at) VALUES (?, ?, ?, ?)")
          .bind(id, code, percent, expiresAt || null),
        audit("commercial.coupon_created", id),
      ]);
    } else if (body.action === "coupon.disable") {
      const id = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return commercialError("Cupom inválido.");
      const result = await env.DB.prepare("UPDATE commercial_coupons SET active = 0 WHERE id = ? AND active = 1").bind(id).run();
      if (!result.meta.changes) return commercialError("Cupom não encontrado ou já desativado.", 404);
      await audit("commercial.coupon_disabled", id).run();
    } else if (body.action === "support.resolve") {
      const id = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return commercialError("Solicitação inválida.");
      const result = await env.DB.prepare("UPDATE commercial_requests SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND kind = 'support' AND status = 'open'").bind(id).run();
      if (!result.meta.changes) return commercialError("Chamado não encontrado ou já encerrado.", 404);
      await audit("commercial.support_resolved", id).run();
    } else return commercialError("Operação inválida.");
    return GET();
  } catch (failure) {
    console.error("Commercial operation failed", failure);
    return commercialError("Não foi possível salvar. Confira os dados e tente novamente.", 409);
  }
}
