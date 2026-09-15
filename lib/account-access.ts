import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export type AccountMembership = {
  id: number;
  siteId: string;
  siteName: string;
  siteSlug: string;
  role: string;
  status: string;
};

export type AccountInvitation = {
  id: number;
  siteId: string;
  siteName: string;
  role: string;
  status: string;
  expiresAt: string;
};

export async function ensurePlatformUser(user: ChatGPTUser) {
  const email = user.email.trim().toLowerCase();
  const existing = await env.DB.prepare("SELECT id FROM platform_users WHERE id = ? OR lower(email) = ? LIMIT 1")
    .bind(user.id, email).first<{ id: string }>();
  if (existing) {
    await env.DB.prepare("UPDATE platform_users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(user.displayName, existing.id).run();
    return existing.id;
  }
  await env.DB.prepare(`INSERT INTO platform_users (id, email, display_name, platform_role, updated_at)
    VALUES (?, ?, ?, 'user', CURRENT_TIMESTAMP)`).bind(user.id, email, user.displayName).run();
  return user.id;
}

export async function loadAccountAccess(user: ChatGPTUser) {
  const storedUserId = await ensurePlatformUser(user);
  const email = user.email.trim().toLowerCase();
  const [memberships, invitations] = await env.DB.batch([
    env.DB.prepare(`SELECT m.id, m.site_id, s.name AS site_name, s.slug AS site_slug, m.role, m.status
      FROM site_memberships m
      INNER JOIN event_sites s ON s.id = m.site_id
      WHERE m.user_id = ? AND m.status = 'active' AND s.status != 'archived'
      ORDER BY s.name`).bind(storedUserId),
    env.DB.prepare(`SELECT i.id, i.site_id, s.name AS site_name, i.role,
      CASE WHEN i.status = 'pending' AND i.expires_at < CURRENT_TIMESTAMP THEN 'expired' ELSE i.status END AS status,
      i.expires_at
      FROM site_invitations i
      INNER JOIN event_sites s ON s.id = i.site_id
      WHERE lower(i.email) = ? AND i.status IN ('pending', 'expired')
      ORDER BY i.created_at DESC`).bind(email),
  ]);
  return {
    memberships: memberships.results.map((row) => ({
      id: Number(row.id), siteId: String(row.site_id), siteName: String(row.site_name),
      siteSlug: String(row.site_slug), role: String(row.role), status: String(row.status),
    })) satisfies AccountMembership[],
    invitations: invitations.results.map((row) => ({
      id: Number(row.id), siteId: String(row.site_id), siteName: String(row.site_name),
      role: String(row.role), status: String(row.status), expiresAt: String(row.expires_at),
    })) satisfies AccountInvitation[],
  };
}
