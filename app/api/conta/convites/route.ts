import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensurePlatformUser, loadAccountAccess } from "@/lib/account-access";
import { createAuditStatement } from "@/lib/audit-log";
import { memberLimitReached } from "@/lib/platform-limits";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre com sua conta para continuar." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 1_000) {
    return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });
  }

  const body = await request.json().catch(() => null) as { id?: number; action?: string } | null;
  const id = Number(body?.id);
  const action = body?.action;
  if (!Number.isInteger(id) || id < 1 || !["accept", "decline"].includes(action ?? "")) {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  const email = user.email.trim().toLowerCase();
  const invitation = await env.DB.prepare(`SELECT id, site_id, role
    FROM site_invitations
    WHERE id = ? AND lower(email) = ? AND status = 'pending' AND expires_at >= CURRENT_TIMESTAMP
    LIMIT 1`).bind(id, email).first<{ id: number; site_id: string; role: string }>();
  if (!invitation) return Response.json({ error: "Este convite expirou, foi cancelado ou não pertence à sua conta." }, { status: 409 });

  if (action === "decline") {
    const result = await env.DB.prepare(`UPDATE site_invitations
      SET status = 'declined', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND lower(email) = ? AND status = 'pending' AND expires_at >= CURRENT_TIMESTAMP`)
      .bind(id, email).run();
    if (!result.meta.changes) return Response.json({ error: "Não foi possível recusar o convite." }, { status: 409 });
    await createAuditStatement({ siteId: invitation.site_id, actor: user, action: "invitation.declined", entityType: "invitation", entityId: id }).run();
  } else {
    const storedUserId = await ensurePlatformUser(user);
    if (await memberLimitReached(invitation.site_id, storedUserId)) return Response.json({ error: "O limite de membros do plano foi atingido. Solicite ao administrador um ajuste antes de aceitar." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO site_memberships (site_id, user_id, role, status)
        VALUES (?, ?, ?, 'active')
        ON CONFLICT(site_id, user_id) DO UPDATE SET role = excluded.role, status = 'active'`)
        .bind(invitation.site_id, storedUserId, invitation.role),
      env.DB.prepare(`UPDATE site_invitations
        SET status = 'accepted', accepted_by = ?, accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND lower(email) = ? AND status = 'pending' AND expires_at >= CURRENT_TIMESTAMP`)
        .bind(storedUserId, id, email),
      createAuditStatement({ siteId: invitation.site_id, actor: user, action: "invitation.accepted", entityType: "invitation", entityId: id, metadata: { role: invitation.role } }),
    ]);
  }

  return Response.json({ ok: true, ...(await loadAccountAccess(user)) });
}
