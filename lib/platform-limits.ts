import { env } from "cloudflare:workers";

export async function memberLimitReached(siteId: string, excludingUserId?: string) {
  const row = await env.DB.prepare(`SELECT p.max_members AS max_members,
      (SELECT COUNT(*) FROM site_memberships m WHERE m.site_id = ? AND m.status = 'active' AND (? IS NULL OR m.user_id != ?)) AS members
    FROM site_commercial_settings scs
    JOIN platform_plans p ON p.id = scs.plan_id
    WHERE scs.site_id = ? AND p.active = 1 LIMIT 1`)
    .bind(siteId, excludingUserId ?? null, excludingUserId ?? null, siteId)
    .first<{ max_members: number; members: number }>();
  return row ? Number(row.members) >= Number(row.max_members) : false;
}

export async function galleryLimitExceeded(siteId: string, count: number) {
  const row = await env.DB.prepare(`SELECT p.max_gallery_images AS maximum
    FROM site_commercial_settings scs JOIN platform_plans p ON p.id = scs.plan_id
    WHERE scs.site_id = ? AND p.active = 1 LIMIT 1`).bind(siteId).first<{ maximum: number }>();
  return row ? count > Number(row.maximum) : false;
}
