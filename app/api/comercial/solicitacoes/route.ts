import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { commercialError, limitedJson, sameOrigin } from "@/lib/commercial";
import { createAuditStatement } from "@/lib/audit-log";
import { CURRENT_SITE_ID } from "@/lib/site-context";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return commercialError("Entre com sua conta.", 401);
  const rows = await env.DB.prepare(`SELECT id, kind, status, plan_id, coupon_code, amount_cents, note, created_at, updated_at
    FROM commercial_requests WHERE user_id = ? AND email = ? ORDER BY created_at DESC LIMIT 30`)
    .bind(user.id, user.email.trim().toLowerCase()).all();
  return Response.json({ requests: rows.results }, { headers: { "cache-control": "no-store, private" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return commercialError("Origem inválida.", 403);
  const user = await getChatGPTUser();
  if (!user) return commercialError("Entre com sua conta.", 401);
  const body = await limitedJson(request, 2000);
  if (!body) return commercialError("Dados inválidos.");
  const email = user.email.trim().toLowerCase();
  const audit = (action: string, id: string) => createAuditStatement({ siteId: CURRENT_SITE_ID, actor: user, action, entityType: "commercial_request", entityId: id });

  try {
    if (body.action === "request.cancel") {
      const id = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return commercialError("Solicitação inválida.");
      const result = await env.DB.prepare(`UPDATE commercial_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND email = ? AND kind IN ('trial','order') AND status IN ('trial_requested','awaiting_payment_setup')`)
        .bind(id, user.id, email).run();
      if (!result.meta.changes) return commercialError("Solicitação não encontrada ou já encerrada.", 404);
      await audit("commercial.request_cancelled", id).run();
      return GET();
    }

    if (body.action === "support.open") {
      const note = String(body.note ?? "").trim();
      if (note.length < 15 || note.length > 500) return commercialError("Descreva a dúvida em 15 a 500 caracteres.");
      const open = await env.DB.prepare("SELECT COUNT(*) AS total FROM commercial_requests WHERE user_id = ? AND email = ? AND kind = 'support' AND status = 'open'")
        .bind(user.id, email).first<{ total: number }>();
      if (Number(open?.total ?? 0) >= 3) return commercialError("Você já tem três chamados em aberto.", 409);
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO commercial_requests (id, user_id, email, kind, status, note) VALUES (?, ?, ?, 'support', 'open', ?)").bind(id, user.id, email, note),
        audit("commercial.support_opened", id),
      ]);
      return GET();
    }

    if (body.action !== "trial.request" && body.action !== "order.request") return commercialError("Operação inválida.");
    const planId = String(body.planId ?? "");
    const plan = await env.DB.prepare("SELECT id, price_cents FROM platform_plans WHERE id = ? AND active = 1")
      .bind(planId).first<{ id: string; price_cents: number }>();
    if (!plan) return commercialError("Plano não encontrado.", 404);
    const kind = body.action === "trial.request" ? "trial" : "order";
    const status = kind === "trial" ? "trial_requested" : "awaiting_payment_setup";
    const code = kind === "order" ? String(body.couponCode ?? "").trim().toUpperCase() : "";
    if (code && !/^[A-Z0-9]{4,24}$/.test(code)) return commercialError("Cupom inválido.");
    const coupon = code ? await env.DB.prepare(`SELECT discount_percent FROM commercial_coupons
      WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at >= date('now'))`)
      .bind(code).first<{ discount_percent: number }>() : null;
    if (code && !coupon) return commercialError("Cupom indisponível ou vencido.", 409);
    const amount = kind === "order" && plan.price_cents > 0
      ? Math.max(0, Math.round(plan.price_cents * (100 - (coupon?.discount_percent ?? 0)) / 100)) : null;
    const id = crypto.randomUUID();
    const result = await env.DB.prepare(`INSERT INTO commercial_requests
      (id, user_id, email, kind, status, plan_id, coupon_code, amount_cents)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM commercial_requests WHERE user_id = ? AND email = ? AND kind = ?
        AND status IN ('trial_requested','awaiting_payment_setup')
      )`).bind(id, user.id, email, kind, status, plan.id, code, amount, user.id, email, kind).run();
    if (!result.meta.changes) return commercialError("Já existe uma solicitação deste tipo em andamento.", 409);
    await audit(`commercial.${kind}_requested`, id).run();
    return GET();
  } catch (failure) {
    console.error("Commercial request failed", failure);
    return commercialError("Não foi possível registrar. Tente novamente.", 409);
  }
}
