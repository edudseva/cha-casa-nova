import { sameOrigin } from "@/lib/request-origin";
import { env } from "cloudflare:workers";
import { requirePlatformOwnerApi } from "@/lib/platform-access";
import { createAuditStatement } from "@/lib/audit-log";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { loadSiteConfig } from "@/lib/runtime-config";
import { loadOwnerWorkspace } from "@/lib/platform-owner";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

type Input = { action?: string; id?: string; siteId?: string; name?: string; email?: string; description?: string; previewTheme?: string;
  clientId?: string; planId?: string; templateId?: string; hostname?: string; reason?: string;
  maxSites?: number; maxMembers?: number; maxGifts?: number; maxGalleryImages?: number;
  priceCents?: number; customDomainEnabled?: boolean; exportsEnabled?: boolean; status?: string; slug?: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hostnamePattern = /^(?=.{4,253}$)(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const reservedHost = "cha.evametodo.com.br";

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

async function ownerSite(siteId: string) {
  if (!siteId || siteId.length > 100) return null;
  return env.DB.prepare("SELECT id, slug, status FROM event_sites WHERE id = ? AND status != 'archived' LIMIT 1")
    .bind(siteId).first<{ id: string; slug: string; status: string }>();
}

function audit(siteId: string, actor: ChatGPTUser, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  return createAuditStatement({ siteId, actor, action, entityType, entityId, metadata });
}

async function readBody(request: Request): Promise<Input | null> {
  if (Number(request.headers.get("content-length") ?? 0) > 8_000) return null;
  const text = await request.text();
  if (text.length > 8_000) return null;
  try {
    const data: unknown = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data as Input : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return error(auth.error, auth.status);
  const config = await loadSiteConfig();
  const data = await loadOwnerWorkspace(auth.user, config.eventTitle, config.coupleNames);
  const siteId = new URL(request.url).searchParams.get("supportSiteId");
  if (!siteId) return Response.json(data, { headers: { "cache-control": "no-store" } });
  const site = await ownerSite(siteId);
  if (!site) return error("Site não encontrado.", 404);
  const session = await env.DB.prepare(`SELECT id FROM platform_support_sessions
    WHERE site_id = ? AND actor_user_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC LIMIT 1`).bind(siteId, auth.user.id).first<{ id: string }>();
  if (!session) return error("Abra uma sessão de suporte para consultar os dados.", 403);
  const [members, invitations, recentAudit] = await env.DB.batch([
    env.DB.prepare(`SELECT u.display_name, u.email, m.role, m.status
      FROM site_memberships m INNER JOIN platform_users u ON u.id = m.user_id
      WHERE m.site_id = ? ORDER BY m.created_at DESC LIMIT 50`).bind(siteId),
    env.DB.prepare("SELECT email, role, status, expires_at FROM site_invitations WHERE site_id = ? ORDER BY created_at DESC LIMIT 20").bind(siteId),
    env.DB.prepare("SELECT action, actor_email, created_at FROM audit_logs WHERE site_id = ? ORDER BY created_at DESC LIMIT 20").bind(siteId),
  ]);
  await audit(siteId, auth.user, "support.data_viewed", "support_session", session.id).run();
  return Response.json({ siteId, sessionId: session.id, members: members.results, invitations: invitations.results, recentAudit: recentAudit.results }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return error("Origem inválida.", 403);
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return error(auth.error, auth.status);
  const body = await readBody(request);
  if (!body) return error("Dados inválidos ou muito extensos.");
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  const site = siteId ? await ownerSite(siteId) : null;

  try {
    switch (body.action) {
      case "client.create": {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (name.length < 2 || name.length > 120 || email.length > 254 || !emailPattern.test(email)) return error("Informe nome e e-mail válidos.");
        const id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO platform_clients (id, name, email) VALUES (?, ?, ?)").bind(id, name, email),
          audit(CURRENT_SITE_ID, auth.user, "client.created", "client", id),
        ]);
        break;
      }
      case "client.update": {
        const id = typeof body.id === "string" ? body.id : "";
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!id || name.length < 2 || name.length > 120 || email.length > 254 || !emailPattern.test(email)) return error("Informe nome e e-mail válidos.");
        if (!(await env.DB.prepare("SELECT id FROM platform_clients WHERE id = ? AND status = 'active'").bind(id).first())) return error("Cliente não encontrado.", 404);
        await env.DB.batch([
          env.DB.prepare("UPDATE platform_clients SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, email, id),
          audit(CURRENT_SITE_ID, auth.user, "client.updated", "client", id),
        ]);
        break;
      }
      case "template.create": {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const description = typeof body.description === "string" ? body.description.trim() : "";
        const theme = body.previewTheme;
        if (name.length < 3 || name.length > 80 || description.length > 300 || !["botanical", "classic", "contemporary"].includes(theme ?? "")) return error("Informe nome, descrição e estilo válidos.");
        const id = crypto.randomUUID();
        const code = id.slice(0, 12);
        await env.DB.batch([
          env.DB.prepare("INSERT INTO site_templates (id, code, name, description, preview_theme) VALUES (?, ?, ?, ?, ?)").bind(id, code, name, description, theme),
          audit(CURRENT_SITE_ID, auth.user, "template.created", "template", id),
        ]);
        break;
      }
      case "site.assign": {
        if (!site) return error("Site não encontrado.", 404);
        const clientId = body.clientId || null;
        const planId = body.planId || null;
        const templateId = body.templateId || null;
        if (clientId && !(await env.DB.prepare("SELECT id FROM platform_clients WHERE id = ? AND status = 'active'").bind(clientId).first())) return error("Cliente inválido.");
        const plan = planId ? await env.DB.prepare("SELECT id, max_sites, max_members, max_gifts, max_gallery_images FROM platform_plans WHERE id = ? AND active = 1").bind(planId).first<{ id: string; max_sites: number; max_members: number; max_gifts: number; max_gallery_images: number }>() : null;
        if (planId && !plan) return error("Plano inválido.");
        if (templateId && !(await env.DB.prepare("SELECT id FROM site_templates WHERE id = ? AND active = 1").bind(templateId).first())) return error("Modelo inválido.");
        if (plan) {
          const usage = await env.DB.prepare(`SELECT
            (SELECT COUNT(*) FROM site_memberships WHERE site_id = ? AND status = 'active') AS members,
            COALESCE((SELECT json_array_length(payload) FROM catalog_cache WHERE site_id = ? LIMIT 1), 0) AS gifts,
            COALESCE((SELECT json_array_length(json_extract(payload, '$.photoGallery')) FROM site_config WHERE site_id = ? LIMIT 1), 0) AS photos`)
            .bind(siteId, siteId, siteId).first<{ members: number; gifts: number; photos: number }>();
          if (Number(usage?.members ?? 0) > plan.max_members || Number(usage?.gifts ?? 0) > plan.max_gifts || Number(usage?.photos ?? 0) > plan.max_gallery_images) {
            return error("O uso atual ultrapassa os limites do plano selecionado.", 409);
          }
        }
        if (clientId && plan) {
          const result = await env.DB.prepare(`SELECT COUNT(*) AS total FROM site_commercial_settings scs
            JOIN event_sites s ON s.id = scs.site_id WHERE scs.client_id = ?
            AND scs.site_id != ? AND s.status != 'archived'`).bind(clientId, siteId).first<{ total: number }>();
          if (Number(result?.total ?? 0) >= Number(plan.max_sites)) return error("O cliente atingiu o limite de sites deste plano.", 409);
        }
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO site_commercial_settings (site_id, client_id, plan_id, template_id, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(site_id) DO UPDATE SET
            client_id = excluded.client_id, plan_id = excluded.plan_id, template_id = excluded.template_id,
            updated_at = CURRENT_TIMESTAMP`).bind(siteId, clientId, planId, templateId),
          audit(siteId, auth.user, "site.commercial_assigned", "site", siteId, { clientId, planId, templateId }),
        ]);
        break;
      }
      case "plan.update": {
        const id = typeof body.id === "string" ? body.id : "";
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const values = [body.maxSites, body.maxMembers, body.maxGifts, body.maxGalleryImages];
        if (!id || name.length < 2 || name.length > 80 || values.some((v) => !Number.isInteger(v) || Number(v) < 1 || Number(v) > 10_000) || !Number.isInteger(body.priceCents) || Number(body.priceCents) < 0 || Number(body.priceCents) > 10_000_000) return error("Informe limites e valores válidos.");
        if (!(await env.DB.prepare("SELECT id FROM platform_plans WHERE id = ? AND active = 1").bind(id).first())) return error("Plano não encontrado.", 404);
        await env.DB.batch([
          env.DB.prepare(`UPDATE platform_plans SET name = ?, price_cents = ?, max_sites = ?, max_members = ?,
            max_gifts = ?, max_gallery_images = ?, custom_domain_enabled = ?, exports_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(name, body.priceCents, ...values, body.customDomainEnabled ? 1 : 0, body.exportsEnabled ? 1 : 0, id),
          audit(CURRENT_SITE_ID, auth.user, "plan.updated", "plan", id),
        ]);
        break;
      }
      case "domain.register": {
        if (!site) return error("Site não encontrado.", 404);
        const hostname = typeof body.hostname === "string" ? body.hostname.trim().toLowerCase().replace(/\.$/, "") : "";
        if (!hostnamePattern.test(hostname) || hostname === reservedHost) return error("Use um domínio válido diferente do domínio de produção atual.");
        const commercial = await env.DB.prepare(`SELECT p.custom_domain_enabled FROM site_commercial_settings scs
          JOIN platform_plans p ON p.id = scs.plan_id WHERE scs.site_id = ?`).bind(siteId).first<{ custom_domain_enabled: number }>();
        if (!commercial?.custom_domain_enabled) return error("O plano do site não prevê domínio personalizado.", 409);
        await env.DB.batch([
          env.DB.prepare("INSERT INTO site_domains (site_id, hostname, status) VALUES (?, ?, 'pending')").bind(siteId, hostname),
          audit(siteId, auth.user, "domain.registered", "domain", hostname),
        ]);
        break;
      }
      case "domain.remove": {
        const id = Number(body.id);
        if (!site || !Number.isInteger(id) || id < 1) return error("Domínio inválido.");
        const row = await env.DB.prepare("SELECT hostname FROM site_domains WHERE id = ? AND site_id = ? AND status = 'pending'").bind(id, siteId).first<{ hostname: string }>();
        if (!row) return error("Só é possível remover um domínio pendente.", 409);
        await env.DB.batch([
          env.DB.prepare("DELETE FROM site_domains WHERE id = ? AND site_id = ? AND status = 'pending'").bind(id, siteId),
          audit(siteId, auth.user, "domain.removed", "domain", row.hostname),
        ]);
        break;
      }
      case "health.check": {
        if (!site) return error("Site não encontrado.", 404);
        const [config, owner, catalog, pending, drafts] = await env.DB.batch([
          env.DB.prepare("SELECT 1 AS present FROM site_config WHERE site_id = ? LIMIT 1").bind(siteId),
          env.DB.prepare("SELECT 1 AS present FROM site_memberships WHERE site_id = ? AND role = 'owner' AND status = 'active' LIMIT 1").bind(siteId),
          env.DB.prepare("SELECT synced_at FROM catalog_cache WHERE site_id = ? LIMIT 1").bind(siteId),
          env.DB.prepare("SELECT COUNT(*) AS count FROM site_invitations WHERE site_id = ? AND status = 'pending' AND expires_at < CURRENT_TIMESTAMP").bind(siteId),
          env.DB.prepare("SELECT COUNT(*) AS count FROM site_config_drafts WHERE site_id = ?").bind(siteId),
        ]);
        const summary = { configured: Boolean(config.results.length), ownerAssigned: Boolean(owner.results.length),
          catalogSyncedAt: catalog.results[0]?.synced_at ?? null,
          expiredInvites: Number(pending.results[0]?.count ?? 0), draftCount: Number(drafts.results[0]?.count ?? 0) };
        const status = !summary.ownerAssigned ? "attention" : summary.configured && summary.catalogSyncedAt && !summary.expiredInvites ? "healthy" : "attention";
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO site_commercial_settings (site_id, health_status, health_summary, last_health_check_at, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(site_id) DO UPDATE SET
            health_status = excluded.health_status, health_summary = excluded.health_summary,
            last_health_check_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`).bind(siteId, status, JSON.stringify(summary)),
          audit(siteId, auth.user, "site.health_checked", "site", siteId, { status }),
        ]);
        break;
      }
      case "support.start": {
        if (!site) return error("Site não encontrado.", 404);
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (reason.length < 10 || reason.length > 300) return error("Descreva o motivo do suporte em 10 a 300 caracteres.");
        const id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO platform_support_sessions (id, site_id, actor_user_id, actor_email, reason, scope, expires_at)
            VALUES (?, ?, ?, ?, ?, 'read_only', datetime('now', '+30 minutes'))`).bind(id, siteId, auth.user.id, auth.user.email.toLowerCase(), reason),
          audit(siteId, auth.user, "support.started", "support_session", id, { scope: "read_only" }),
        ]);
        break;
      }
      case "support.end": {
        const id = typeof body.id === "string" ? body.id : "";
        const session = await env.DB.prepare("SELECT site_id FROM platform_support_sessions WHERE id = ? AND actor_user_id = ? AND status = 'active'").bind(id, auth.user.id).first<{ site_id: string }>();
        if (!session) return error("Sessão de suporte não encontrada.", 404);
        await env.DB.batch([
          env.DB.prepare("UPDATE platform_support_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ? AND actor_user_id = ?").bind(id, auth.user.id),
          audit(session.site_id, auth.user, "support.ended", "support_session", id),
        ]);
        break;
      }
      case "deletion.schedule": {
        if (!site || siteId === CURRENT_SITE_ID) return error("O site atual não pode entrar na fila de exclusão.", 409);
        if (body.slug !== site.slug) return error("Confirme o identificador exato do site.", 409);
        const existing = await env.DB.prepare("SELECT id FROM site_deletion_requests WHERE site_id = ? AND status = 'scheduled'").bind(siteId).first();
        if (existing) return error("Já existe uma solicitação de exclusão pendente.", 409);
        const id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO site_deletion_requests (id, site_id, requested_by, requested_by_email, reason, scheduled_for)
            VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))`).bind(id, siteId, auth.user.id, auth.user.email.toLowerCase(), String(body.reason ?? "").slice(0, 300)),
          audit(siteId, auth.user, "deletion.scheduled", "deletion_request", id),
        ]);
        break;
      }
      case "deletion.cancel": {
        const id = typeof body.id === "string" ? body.id : "";
        const row = await env.DB.prepare("SELECT site_id FROM site_deletion_requests WHERE id = ? AND status = 'scheduled'").bind(id).first<{ site_id: string }>();
        if (!row) return error("Solicitação não encontrada.", 404);
        await env.DB.batch([
          env.DB.prepare("UPDATE site_deletion_requests SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'scheduled'").bind(id),
          audit(row.site_id, auth.user, "deletion.cancelled", "deletion_request", id),
        ]);
        break;
      }
      case "deletion.execute": {
        const id = typeof body.id === "string" ? body.id : "";
        const requestRow = await env.DB.prepare(`SELECT d.site_id, s.slug FROM site_deletion_requests d
          JOIN event_sites s ON s.id = d.site_id
          WHERE d.id = ? AND d.status = 'scheduled' AND d.scheduled_for <= CURRENT_TIMESTAMP
          AND s.status != 'archived' LIMIT 1`).bind(id).first<{ site_id: string; slug: string }>();
        if (!requestRow || requestRow.site_id === CURRENT_SITE_ID) return error("A exclusão ainda não está disponível.", 409);
        if (body.slug !== requestRow.slug) return error("Confirme o identificador exato do site.", 409);
        const exported = await env.DB.prepare(`SELECT id FROM platform_data_exports
          WHERE site_id = ? AND status = 'completed' AND created_at >=
          (SELECT created_at FROM site_deletion_requests WHERE id = ?) LIMIT 1`).bind(requestRow.site_id, id).first();
        if (!exported) return error("Exporte os dados após a solicitação antes de concluir a exclusão.", 409);
        const target = requestRow.site_id;
        await env.DB.batch([
          env.DB.prepare("DELETE FROM reservations WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM contributions WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM catalog_cache WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_config WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM pix_config WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_config_drafts WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_config_versions WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_memberships WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_invitations WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_domains WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM platform_support_sessions WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM site_commercial_settings WHERE site_id = ?").bind(target),
          env.DB.prepare("DELETE FROM audit_logs WHERE site_id = ?").bind(target),
          env.DB.prepare("UPDATE platform_data_exports SET requested_by_email = '' WHERE site_id = ?").bind(target),
          env.DB.prepare("UPDATE site_deletion_requests SET status = 'completed', reason = '', requested_by_email = '' WHERE site_id = ?").bind(target),
          env.DB.prepare(`UPDATE event_sites SET name = 'Evento excluído', couple_names = '', slug = ?, event_date = NULL,
            status = 'archived', onboarding_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(`deleted-${target.replace(/[^a-z0-9-]/g, "")}`, target),
          audit(target, auth.user, "site.data_deleted", "site", target, { requestId: id }),
        ]);
        break;
      }
      default: return error("Operação inválida.");
    }
    const config = await loadSiteConfig();
    return Response.json({ ok: true, workspace: await loadOwnerWorkspace(auth.user, config.eventTitle, config.coupleNames) }, { headers: { "cache-control": "no-store" } });
  } catch (failure) {
    console.error("Platform owner operation failed", failure);
    return error("Não foi possível concluir a operação. Confira os dados e tente novamente.", 409);
  }
}
