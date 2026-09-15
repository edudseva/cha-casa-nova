import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { isPlatformOwner } from "@/lib/platform-access";
import { CURRENT_SITE_ID } from "@/lib/platform-workspace";

type AdminEnvironment = { ADMIN_EMAIL?: string; ADMIN_EMAILS?: string };

function configuredEmails() {
  const adminEnvironment = env as unknown as AdminEnvironment;
  return new Set(
    [adminEnvironment.ADMIN_EMAIL, adminEnvironment.ADMIN_EMAILS]
      .filter(Boolean)
      .flatMap((value) => value!.split(/[;,\n]/))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isConfiguredAdmin(email: string) {
  return configuredEmails().has(email.trim().toLowerCase());
}

async function hasEventAdminAccess(user: ChatGPTUser) {
  const email = user.email.trim().toLowerCase();
  if (isConfiguredAdmin(email) || isPlatformOwner(email)) return true;

  const membership = await env.DB.prepare(`SELECT m.id
    FROM site_memberships m
    INNER JOIN platform_users u ON u.id = m.user_id
    WHERE m.site_id = ? AND m.status = 'active' AND m.role IN ('owner', 'editor')
      AND (u.id = ? OR lower(u.email) = ?)
    LIMIT 1`).bind(CURRENT_SITE_ID, user.id, email).first();
  if (membership) return true;

  const invitation = await env.DB.prepare(`SELECT id
    FROM site_invitations
    WHERE site_id = ? AND lower(email) = ? AND status = 'pending' AND expires_at >= CURRENT_TIMESTAMP
    LIMIT 1`).bind(CURRENT_SITE_ID, email).first<{ id: number }>();
  if (!invitation) return false;

  await env.DB.prepare(`INSERT INTO platform_users (id, email, display_name, platform_role, updated_at)
    VALUES (?, ?, ?, 'user', CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, updated_at = CURRENT_TIMESTAMP`)
    .bind(user.id, email, user.displayName).run();
  const storedUser = await env.DB.prepare("SELECT id FROM platform_users WHERE lower(email) = ? LIMIT 1")
    .bind(email).first<{ id: string }>();
  if (!storedUser) return false;

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO site_memberships (site_id, user_id, role, status)
      SELECT site_id, ?, role, 'active' FROM site_invitations WHERE id = ?
      ON CONFLICT(site_id, user_id) DO UPDATE SET role = excluded.role, status = 'active'`)
      .bind(storedUser.id, invitation.id),
    env.DB.prepare(`UPDATE site_invitations
      SET status = 'accepted', accepted_by = ?, accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'`).bind(storedUser.id, invitation.id),
  ]);
  return true;
}

export async function requireAdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!await hasEventAdminAccess(user)) return null;
  return user;
}

export async function requireAdminApi() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, status: 401, error: "Entre com sua conta para acessar." };
  if (!await hasEventAdminAccess(user)) {
    return { ok: false as const, status: 403, error: "Acesso não autorizado." };
  }
  return { ok: true as const, user };
}
