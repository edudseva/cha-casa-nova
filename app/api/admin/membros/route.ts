import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensurePlatformUser } from "@/lib/account-access";
import { createAuditStatement } from "@/lib/audit-log";
import { loadEventMembers } from "@/lib/event-members";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { memberLimitReached } from "@/lib/platform-limits";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITABLE_ROLES = new Set(["editor", "viewer"]);

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

export async function GET() {
  const auth = await requireAdminApi("members.manage");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  return Response.json(await loadEventMembers(CURRENT_SITE_ID), { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await requireAdminApi("members.manage");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  if (Number(request.headers.get("content-length") ?? 0) > 4_000) return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });

  const body = await request.json().catch(() => null) as { email?: string; role?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const role = body?.role ?? "";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (!INVITABLE_ROLES.has(role)) return Response.json({ error: "Selecione uma permissão válida." }, { status: 400 });

  const member = await env.DB.prepare(`SELECT m.id FROM site_memberships m
    INNER JOIN platform_users u ON u.id = m.user_id
    WHERE m.site_id = ? AND lower(u.email) = ? AND m.status = 'active' LIMIT 1`)
    .bind(CURRENT_SITE_ID, email).first();
  if (member) return Response.json({ error: "Essa pessoa já possui acesso ao evento." }, { status: 409 });
  if (await memberLimitReached(CURRENT_SITE_ID)) return Response.json({ error: "O limite de membros do plano foi atingido." }, { status: 409 });

  const actorId = await ensurePlatformUser(auth.user);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO site_invitations
      (site_id, email, role, status, invited_by, expires_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, datetime('now', '+7 days'), CURRENT_TIMESTAMP)
      ON CONFLICT(site_id, email) DO UPDATE SET role = excluded.role, status = 'pending',
        invited_by = excluded.invited_by, expires_at = excluded.expires_at,
        accepted_by = NULL, accepted_at = NULL, updated_at = CURRENT_TIMESTAMP`)
      .bind(CURRENT_SITE_ID, email, role, actorId),
    createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "invitation.created", entityType: "invitation", entityId: email, metadata: { role } }),
  ]);
  return Response.json({ ok: true, ...(await loadEventMembers(CURRENT_SITE_ID)) }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await requireAdminApi("members.manage");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  if (Number(request.headers.get("content-length") ?? 0) > 2_000) return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });

  const body = await request.json().catch(() => null) as { kind?: string; id?: number | string; action?: string; role?: string } | null;
  if (body?.kind === "member") {
    const userId = String(body.id ?? "");
    if (!userId || userId.length > 200 || !["role", "revoke"].includes(body.action ?? "")) return Response.json({ error: "Atualização de acesso inválida." }, { status: 400 });
    const membership = await env.DB.prepare(`SELECT role FROM site_memberships WHERE site_id = ? AND user_id = ? AND status = 'active' LIMIT 1`)
      .bind(CURRENT_SITE_ID, userId).first<{ role: string }>();
    if (!membership) return Response.json({ error: "Acesso não encontrado." }, { status: 404 });
    if (membership.role === "owner") return Response.json({ error: "O responsável principal não pode ter o acesso alterado." }, { status: 409 });

    if (body.action === "role") {
      if (!INVITABLE_ROLES.has(body.role ?? "")) return Response.json({ error: "Selecione um perfil válido." }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("UPDATE site_memberships SET role = ? WHERE site_id = ? AND user_id = ? AND status = 'active'").bind(body.role, CURRENT_SITE_ID, userId),
        createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "membership.role_updated", entityType: "membership", entityId: userId, metadata: { from: membership.role, to: body.role } }),
      ]);
    } else {
      await env.DB.batch([
        env.DB.prepare("UPDATE site_memberships SET status = 'revoked' WHERE site_id = ? AND user_id = ? AND status = 'active'").bind(CURRENT_SITE_ID, userId),
        createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "membership.revoked", entityType: "membership", entityId: userId, metadata: { role: membership.role } }),
      ]);
    }
    return Response.json({ ok: true, ...(await loadEventMembers(CURRENT_SITE_ID)) });
  }

  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1 || !["cancel", "resend"].includes(body?.action ?? "")) return Response.json({ error: "Atualização inválida." }, { status: 400 });
  const result = body?.action === "cancel"
    ? await env.DB.prepare("UPDATE site_invitations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND site_id = ? AND status = 'pending'").bind(id, CURRENT_SITE_ID).run()
    : await env.DB.prepare(`UPDATE site_invitations SET status = 'pending', expires_at = datetime('now', '+7 days'), accepted_by = NULL, accepted_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND site_id = ? AND status != 'accepted'`).bind(id, CURRENT_SITE_ID).run();
  if (!result.meta.changes) return Response.json({ error: "Convite não encontrado ou já concluído." }, { status: 409 });
  await createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: body.action === "cancel" ? "invitation.cancelled" : "invitation.resent", entityType: "invitation", entityId: id }).run();
  return Response.json({ ok: true, ...(await loadEventMembers(CURRENT_SITE_ID)) });
}
