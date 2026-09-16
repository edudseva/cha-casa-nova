import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import type { PlatformInvitation, PlatformMember } from "@/lib/platform-workspace";

export type OwnerPlan = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  maxSites: number;
  maxMembers: number;
  maxGifts: number;
  maxGalleryImages: number;
  customDomainEnabled: boolean;
  exportsEnabled: boolean;
};

export type OwnerTemplate = {
  id: string;
  code: string;
  name: string;
  description: string;
  previewTheme: string;
};

export type OwnerClient = {
  id: string;
  name: string;
  email: string;
  status: string;
  sites: number;
};

export type OwnerSite = {
  id: string;
  slug: string;
  name: string;
  coupleNames: string;
  status: string;
  environment: string;
  onboardingStatus: string;
  clientId: string | null;
  clientName: string | null;
  planId: string | null;
  planName: string | null;
  templateId: string | null;
  templateName: string | null;
  healthStatus: string;
  lastHealthCheckAt: string | null;
  memberCount: number;
  giftCount: number;
  galleryCount: number;
};

export type OwnerDomain = {
  id: number;
  siteId: string;
  siteName: string;
  hostname: string;
  status: string;
  dnsTarget: string;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
};

export type OwnerSupportSession = {
  id: string;
  siteId: string;
  siteName: string;
  actorEmail: string;
  reason: string;
  scope: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export type OwnerDeletionRequest = {
  id: string;
  siteId: string;
  siteName: string;
  status: string;
  scheduledFor: string;
  createdAt: string;
};

export type OwnerAuditEntry = {
  id: number;
  siteId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

async function seedOwnerCatalog(user: ChatGPTUser, siteName: string, coupleNames: string) {
  const clientId = `client:${user.id}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO platform_users (id, email, display_name, platform_role, updated_at)
      VALUES (?, ?, ?, 'owner', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      platform_role = 'owner', updated_at = CURRENT_TIMESTAMP`).bind(user.id, user.email.toLowerCase(), user.displayName),
    env.DB.prepare(`INSERT INTO event_sites
      (id, slug, name, couple_names, event_type, onboarding_status, status, environment, created_by, updated_at)
      VALUES (?, ?, ?, ?, 'cha-de-panela', 'configured', 'active', 'homologation', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, couple_names = excluded.couple_names,
      onboarding_status = 'configured', status = 'active', updated_at = CURRENT_TIMESTAMP`)
      .bind(CURRENT_SITE_ID, CURRENT_SITE_ID, siteName, coupleNames, user.id),
    env.DB.prepare(`INSERT INTO site_memberships (site_id, user_id, role, status)
      VALUES (?, ?, 'owner', 'active')
      ON CONFLICT(site_id, user_id) DO UPDATE SET role = 'owner', status = 'active'`).bind(CURRENT_SITE_ID, user.id),
    env.DB.prepare(`INSERT INTO platform_plans
      (id, code, name, price_cents, max_sites, max_members, max_gifts, max_gallery_images, custom_domain_enabled, exports_enabled, updated_at)
      VALUES ('plan-essencial', 'essencial', 'Essencial', 0, 1, 2, 80, 20, 0, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`),
    env.DB.prepare(`INSERT INTO platform_plans
      (id, code, name, price_cents, max_sites, max_members, max_gifts, max_gallery_images, custom_domain_enabled, exports_enabled, updated_at)
      VALUES ('plan-celebracao', 'celebracao', 'Celebração', 0, 2, 5, 200, 60, 1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`),
    env.DB.prepare(`INSERT INTO platform_plans
      (id, code, name, price_cents, max_sites, max_members, max_gifts, max_gallery_images, custom_domain_enabled, exports_enabled, updated_at)
      VALUES ('plan-premium', 'premium', 'Premium', 0, 5, 10, 500, 150, 1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`),
    env.DB.prepare(`INSERT INTO site_templates (id, code, name, description, preview_theme, updated_at)
      VALUES ('template-botanico', 'botanico', 'Botânico', 'Verde profundo, creme e detalhes naturais.', 'botanical', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`),
    env.DB.prepare(`INSERT INTO site_templates (id, code, name, description, preview_theme, updated_at)
      VALUES ('template-classico', 'classico', 'Clássico', 'Tipografia editorial e composição atemporal.', 'classic', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`),
    env.DB.prepare(`INSERT INTO site_templates (id, code, name, description, preview_theme, updated_at)
      VALUES ('template-contemporaneo', 'contemporaneo', 'Contemporâneo', 'Contraste limpo e superfícies modernas.', 'contemporary', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`),
    env.DB.prepare(`INSERT INTO platform_clients (id, name, email, status, updated_at)
      VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING`)
      .bind(clientId, coupleNames || user.displayName, user.email.toLowerCase()),
    env.DB.prepare(`INSERT INTO site_commercial_settings
      (site_id, client_id, plan_id, template_id, health_status, health_summary, updated_at)
      VALUES (?, ?, 'plan-premium', 'template-botanico', 'pending', '{}', CURRENT_TIMESTAMP)
      ON CONFLICT(site_id) DO NOTHING`).bind(CURRENT_SITE_ID, clientId),
  ]);
}

export async function loadOwnerWorkspace(user: ChatGPTUser, siteName: string, coupleNames: string) {
  await seedOwnerCatalog(user, siteName, coupleNames);

  const [plans, templates, clients, sites, domains, support, deletions, members, invitations, audits, totals] = await env.DB.batch([
    env.DB.prepare(`SELECT id, code, name, price_cents, max_sites, max_members, max_gifts,
      max_gallery_images, custom_domain_enabled, exports_enabled
      FROM platform_plans WHERE active = 1 ORDER BY price_cents`),
    env.DB.prepare(`SELECT id, code, name, description, preview_theme
      FROM site_templates WHERE active = 1 ORDER BY name`),
    env.DB.prepare(`SELECT c.id, c.name, c.email, c.status, COUNT(scs.site_id) AS sites
      FROM platform_clients c
      LEFT JOIN site_commercial_settings scs ON scs.client_id = c.id
      GROUP BY c.id, c.name, c.email, c.status ORDER BY c.created_at DESC`),
    env.DB.prepare(`SELECT s.id, s.slug, s.name, s.couple_names, s.status, s.environment, s.onboarding_status,
      scs.client_id, c.name AS client_name, scs.plan_id, p.name AS plan_name,
      scs.template_id, t.name AS template_name, COALESCE(scs.health_status, 'pending') AS health_status,
      scs.last_health_check_at,
      (SELECT COUNT(*) FROM site_memberships m WHERE m.site_id = s.id AND m.status = 'active') AS member_count,
      COALESCE((SELECT json_array_length(json_extract(cc.payload, '$')) FROM catalog_cache cc WHERE cc.site_id = s.id LIMIT 1), 0) AS gift_count,
      COALESCE(json_array_length(json_extract(cfg.payload, '$.photoGallery')), 0) AS gallery_count
      FROM event_sites s
      LEFT JOIN site_commercial_settings scs ON scs.site_id = s.id
      LEFT JOIN platform_clients c ON c.id = scs.client_id
      LEFT JOIN platform_plans p ON p.id = scs.plan_id
      LEFT JOIN site_templates t ON t.id = scs.template_id
      LEFT JOIN site_config cfg ON cfg.site_id = s.id
      WHERE s.status != 'archived'
      ORDER BY CASE s.status WHEN 'active' THEN 0 ELSE 1 END, s.created_at DESC`),
    env.DB.prepare(`SELECT d.id, d.site_id, s.name AS site_name, d.hostname, d.status, d.dns_target,
      d.verified_at, d.last_checked_at FROM site_domains d
      INNER JOIN event_sites s ON s.id = d.site_id ORDER BY d.created_at DESC`),
    env.DB.prepare(`SELECT ss.id, ss.site_id, s.name AS site_name, ss.actor_email, ss.reason, ss.scope,
      CASE WHEN ss.status = 'active' AND ss.expires_at < CURRENT_TIMESTAMP THEN 'expired' ELSE ss.status END AS status,
      ss.expires_at, ss.created_at FROM platform_support_sessions ss
      INNER JOIN event_sites s ON s.id = ss.site_id ORDER BY ss.created_at DESC LIMIT 20`),
    env.DB.prepare(`SELECT dr.id, dr.site_id, s.name AS site_name, dr.status, dr.scheduled_for, dr.created_at
      FROM site_deletion_requests dr INNER JOIN event_sites s ON s.id = dr.site_id
      ORDER BY dr.created_at DESC LIMIT 20`),
    env.DB.prepare(`SELECT u.id, u.email, u.display_name, m.role, m.status
      FROM site_memberships m INNER JOIN platform_users u ON u.id = m.user_id
      WHERE m.site_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.display_name`).bind(CURRENT_SITE_ID),
    env.DB.prepare(`SELECT id, email, role,
      CASE WHEN status = 'pending' AND expires_at < CURRENT_TIMESTAMP THEN 'expired' ELSE status END AS status,
      expires_at, created_at FROM site_invitations WHERE site_id = ? ORDER BY created_at DESC`).bind(CURRENT_SITE_ID),
    env.DB.prepare(`SELECT id, site_id, actor_email, action, entity_type, entity_id, created_at
      FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 30`),
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM event_sites WHERE status != 'archived') AS sites,
      (SELECT COUNT(*) FROM platform_clients WHERE status = 'active') AS clients,
      (SELECT COUNT(*) FROM site_domains WHERE status = 'active') AS domains,
      (SELECT COUNT(*) FROM platform_support_sessions WHERE status = 'active' AND expires_at >= CURRENT_TIMESTAMP) AS support_sessions`),
  ]);

  const totalRow = totals.results[0] as Record<string, unknown> | undefined;
  return {
    currentSiteId: CURRENT_SITE_ID,
    metrics: {
      sites: Number(totalRow?.sites ?? 0),
      clients: Number(totalRow?.clients ?? 0),
      domains: Number(totalRow?.domains ?? 0),
      supportSessions: Number(totalRow?.support_sessions ?? 0),
    },
    plans: plans.results.map((row) => ({
      id: String(row.id), code: String(row.code), name: String(row.name), priceCents: Number(row.price_cents),
      maxSites: Number(row.max_sites), maxMembers: Number(row.max_members), maxGifts: Number(row.max_gifts),
      maxGalleryImages: Number(row.max_gallery_images), customDomainEnabled: Boolean(row.custom_domain_enabled),
      exportsEnabled: Boolean(row.exports_enabled),
    })) as OwnerPlan[],
    templates: templates.results.map((row) => ({
      id: String(row.id), code: String(row.code), name: String(row.name), description: String(row.description),
      previewTheme: String(row.preview_theme),
    })) as OwnerTemplate[],
    clients: clients.results.map((row) => ({
      id: String(row.id), name: String(row.name), email: String(row.email), status: String(row.status), sites: Number(row.sites),
    })) as OwnerClient[],
    sites: sites.results.map((row) => ({
      id: String(row.id), slug: String(row.slug), name: String(row.name), coupleNames: String(row.couple_names || ""),
      status: String(row.status), environment: String(row.environment), onboardingStatus: String(row.onboarding_status),
      clientId: row.client_id ? String(row.client_id) : null, clientName: row.client_name ? String(row.client_name) : null,
      planId: row.plan_id ? String(row.plan_id) : null, planName: row.plan_name ? String(row.plan_name) : null,
      templateId: row.template_id ? String(row.template_id) : null, templateName: row.template_name ? String(row.template_name) : null,
      healthStatus: String(row.health_status), lastHealthCheckAt: row.last_health_check_at ? String(row.last_health_check_at) : null,
      memberCount: Number(row.member_count), giftCount: Number(row.gift_count), galleryCount: Number(row.gallery_count),
    })) as OwnerSite[],
    domains: domains.results.map((row) => ({
      id: Number(row.id), siteId: String(row.site_id), siteName: String(row.site_name), hostname: String(row.hostname),
      status: String(row.status), dnsTarget: String(row.dns_target), verifiedAt: row.verified_at ? String(row.verified_at) : null,
      lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    })) as OwnerDomain[],
    supportSessions: support.results.map((row) => ({
      id: String(row.id), siteId: String(row.site_id), siteName: String(row.site_name), actorEmail: String(row.actor_email),
      reason: String(row.reason), scope: String(row.scope), status: String(row.status), expiresAt: String(row.expires_at), createdAt: String(row.created_at),
    })) as OwnerSupportSession[],
    deletionRequests: deletions.results.map((row) => ({
      id: String(row.id), siteId: String(row.site_id), siteName: String(row.site_name), status: String(row.status),
      scheduledFor: String(row.scheduled_for), createdAt: String(row.created_at),
    })) as OwnerDeletionRequest[],
    members: members.results.map((row) => ({
      id: String(row.id), email: String(row.email), displayName: String(row.display_name || row.email), role: String(row.role), status: String(row.status),
    })) as PlatformMember[],
    invitations: invitations.results.map((row) => ({
      id: Number(row.id), email: String(row.email), role: String(row.role), status: String(row.status),
      expiresAt: String(row.expires_at), createdAt: String(row.created_at),
    })) as PlatformInvitation[],
    audits: audits.results.map((row) => ({
      id: Number(row.id), siteId: String(row.site_id), actorEmail: String(row.actor_email), action: String(row.action),
      entityType: String(row.entity_type), entityId: String(row.entity_id), createdAt: String(row.created_at),
    })) as OwnerAuditEntry[],
  };
}

export type OwnerWorkspace = Awaited<ReturnType<typeof loadOwnerWorkspace>>;
