import { env } from "cloudflare:workers";
import type { PlatformInvitation, PlatformMember } from "@/lib/platform-workspace";

export async function loadEventMembers(siteId: string) {
  const [members, invitations] = await env.DB.batch([
    env.DB.prepare(`SELECT u.id, u.email, u.display_name, m.role, m.status
      FROM site_memberships m
      INNER JOIN platform_users u ON u.id = m.user_id
      WHERE m.site_id = ? AND m.status = 'active'
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.display_name`).bind(siteId),
    env.DB.prepare(`SELECT id, email, role,
      CASE WHEN status = 'pending' AND expires_at < CURRENT_TIMESTAMP THEN 'expired' ELSE status END AS status,
      expires_at, created_at
      FROM site_invitations WHERE site_id = ? ORDER BY created_at DESC`).bind(siteId),
  ]);

  return {
    members: members.results.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name || row.email),
      role: String(row.role),
      status: String(row.status),
    })) satisfies PlatformMember[],
    invitations: invitations.results.map((row) => ({
      id: Number(row.id),
      email: String(row.email),
      role: String(row.role),
      status: String(row.status),
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
    })) satisfies PlatformInvitation[],
  };
}
