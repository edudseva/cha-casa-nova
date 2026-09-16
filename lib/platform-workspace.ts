import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { CURRENT_SITE_ID, SITE_ENVIRONMENT } from "@/lib/site-context";

export { CURRENT_SITE_ID } from "@/lib/site-context";

export type PlatformMember = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
};

export type PlatformInvitation = {
  id: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export type PlatformSite = {
  id: string;
  slug: string;
  name: string;
  coupleNames: string;
  eventType: string;
  eventDate: string | null;
  onboardingStatus: string;
  status: string;
  environment: string;
  createdAt: string;
};

export type PlatformAuditEntry = {
  id: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export async function loadPlatformWorkspace(user: ChatGPTUser, siteName: string, coupleNames: string) {
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO platform_users (id, email, display_name, platform_role, updated_at)
      VALUES (?, ?, ?, 'owner', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      platform_role = 'owner', updated_at = CURRENT_TIMESTAMP`).bind(user.id, user.email.toLowerCase(), user.displayName),
    env.DB.prepare(`INSERT INTO event_sites
      (id, slug, name, couple_names, event_type, onboarding_status, status, environment, created_by, updated_at)
      VALUES (?, ?, ?, ?, 'cha-de-panela', 'configured', 'active', ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, couple_names = excluded.couple_names,
      onboarding_status = 'configured', status = 'active', environment = excluded.environment, updated_at = CURRENT_TIMESTAMP`)
      .bind(CURRENT_SITE_ID, CURRENT_SITE_ID, siteName, coupleNames, SITE_ENVIRONMENT, user.id),
    env.DB.prepare(`INSERT INTO site_memberships (site_id, user_id, role, status)
      VALUES (?, ?, 'owner', 'active')
      ON CONFLICT(site_id, user_id) DO UPDATE SET role = 'owner', status = 'active'`).bind(CURRENT_SITE_ID, user.id),
  ]);

  const [sites, members, reservations, contributions, memberRows, invitationRows, siteRows, auditRows] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS total FROM event_sites WHERE status != 'archived'"),
    env.DB.prepare("SELECT COUNT(*) AS total FROM site_memberships WHERE status = 'active'"),
    env.DB.prepare("SELECT COUNT(*) AS total FROM reservations WHERE site_id = ? AND status = 'purchased'").bind(CURRENT_SITE_ID),
    env.DB.prepare("SELECT COUNT(*) AS total FROM contributions WHERE site_id = ? AND payment_status = 'confirmed'").bind(CURRENT_SITE_ID),
    env.DB.prepare(`SELECT u.id, u.email, u.display_name, m.role, m.status
      FROM site_memberships m
      INNER JOIN platform_users u ON u.id = m.user_id
      WHERE m.site_id = ?
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.display_name`).bind(CURRENT_SITE_ID),
    env.DB.prepare(`SELECT id, email, role,
      CASE WHEN status = 'pending' AND expires_at < CURRENT_TIMESTAMP THEN 'expired' ELSE status END AS status,
      expires_at, created_at
      FROM site_invitations
      WHERE site_id = ?
      ORDER BY created_at DESC`).bind(CURRENT_SITE_ID),
    env.DB.prepare(`SELECT id, slug, name, couple_names, event_type, event_date,
      onboarding_status, status, environment, created_at
      FROM event_sites
      WHERE status != 'archived'
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC`),
    env.DB.prepare(`SELECT id, actor_email, action, entity_type, entity_id, created_at
      FROM audit_logs WHERE site_id = ? ORDER BY created_at DESC, id DESC LIMIT 12`).bind(CURRENT_SITE_ID),
  ]);

  const total = (result: D1Result<unknown>) => Number((result.results[0] as { total?: number } | undefined)?.total ?? 0);
  return {
    siteId: CURRENT_SITE_ID,
    sites: total(sites),
    members: total(members),
    confirmedGifts: total(reservations),
    confirmedPix: total(contributions),
    memberRows: memberRows.results.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name || row.email),
      role: String(row.role),
      status: String(row.status),
    })) satisfies PlatformMember[],
    invitationRows: invitationRows.results.map((row) => ({
      id: Number(row.id),
      email: String(row.email),
      role: String(row.role),
      status: String(row.status),
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
    })) satisfies PlatformInvitation[],
    siteRows: siteRows.results.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      coupleNames: String(row.couple_names || ""),
      eventType: String(row.event_type),
      eventDate: row.event_date ? String(row.event_date) : null,
      onboardingStatus: String(row.onboarding_status),
      status: String(row.status),
      environment: String(row.environment),
      createdAt: String(row.created_at),
    })) satisfies PlatformSite[],
    auditRows: auditRows.results.map((row) => ({
      id: Number(row.id),
      actorEmail: String(row.actor_email),
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      createdAt: String(row.created_at),
    })) satisfies PlatformAuditEntry[],
  };
}
