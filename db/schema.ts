import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().default("cha-casa-nova-homologacao"),
  giftId: text("gift_id").notNull(),
  guestName: text("guest_name").notNull(),
  guestContact: text("guest_contact").notNull().default(""),
  deliveryChoice: text("delivery_choice").notNull().default(""),
  orderReference: text("order_reference").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("purchased"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_reservations_site_gift").on(table.siteId, table.giftId),
  index("idx_reservations_site_status").on(table.siteId, table.status),
]);

export const contributions = sqliteTable("contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().default("cha-casa-nova-homologacao"),
  guestName: text("guest_name").notNull(),
  guestContact: text("guest_contact").notNull().default(""),
  amountCents: integer("amount_cents").notNull(),
  transactionReference: text("transaction_reference").notNull().default(""),
  message: text("message").notNull().default(""),
  paymentStatus: text("payment_status").notNull().default("declared"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_contributions_site_status").on(table.siteId, table.paymentStatus, table.createdAt),
]);

export const catalogCache = sqliteTable("catalog_cache", {
  id: integer("id").primaryKey(),
  siteId: text("site_id").notNull().default("cha-casa-nova-homologacao"),
  payload: text("payload").notNull(),
  syncedAt: text("synced_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_catalog_cache_site").on(table.siteId)]);

export const siteConfig = sqliteTable("site_config", {
  id: integer("id").primaryKey(),
  siteId: text("site_id").notNull().default("cha-casa-nova-homologacao"),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_site_config_site").on(table.siteId)]);

export const pixConfig = sqliteTable("pix_config", {
  id: integer("id").primaryKey(),
  siteId: text("site_id").notNull().default("cha-casa-nova-homologacao"),
  pixKey: text("pix_key").notNull(),
  receiver: text("receiver").notNull(),
  city: text("city").notNull(),
  enabled: integer("enabled").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_pix_config_site").on(table.siteId)]);

export const platformUsers = sqliteTable("platform_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  platformRole: text("platform_role").notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const eventSites = sqliteTable("event_sites", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  coupleNames: text("couple_names").notNull().default(""),
  eventType: text("event_type").notNull().default("cha-de-panela"),
  eventDate: text("event_date"),
  onboardingStatus: text("onboarding_status").notNull().default("draft"),
  status: text("status").notNull().default("draft"),
  environment: text("environment").notNull().default("homologation"),
  createdBy: text("created_by").notNull().references(() => platformUsers.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const platformPlans = sqliteTable("platform_plans", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  maxSites: integer("max_sites").notNull().default(1),
  maxMembers: integer("max_members").notNull().default(2),
  maxGifts: integer("max_gifts").notNull().default(100),
  maxGalleryImages: integer("max_gallery_images").notNull().default(20),
  customDomainEnabled: integer("custom_domain_enabled").notNull().default(0),
  exportsEnabled: integer("exports_enabled").notNull().default(1),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const commercialLaunch = sqliteTable("commercial_launch", {
  id: integer("id").primaryKey(),
  headline: text("headline").notNull().default("Seu evento, do seu jeito"),
  description: text("description").notNull().default("Crie um espaço para celebrar e organizar seu evento."),
  trialDays: integer("trial_days").notNull().default(14),
  salesEmail: text("sales_email").notNull().default(""),
  termsDraft: text("terms_draft").notNull().default(""),
  privacyDraft: text("privacy_draft").notNull().default(""),
  billingStatus: text("billing_status").notNull().default("unconfigured"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const commercialCoupons = sqliteTable("commercial_coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  expiresAt: text("expires_at"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_coupons_active_expiry").on(table.active, table.expiresAt),
  check("coupon_percent_range", sql`${table.discountPercent} BETWEEN 1 AND 100`),
]);

export const commercialRequests = sqliteTable("commercial_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  planId: text("plan_id").references(() => platformPlans.id),
  couponCode: text("coupon_code").notNull().default(""),
  amountCents: integer("amount_cents"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_commercial_requests_user_created").on(table.userId, table.createdAt),
  index("idx_commercial_requests_status_created").on(table.status, table.createdAt),
  uniqueIndex("idx_commercial_one_pending_kind").on(table.userId, table.email, table.kind)
    .where(sql`${table.kind} IN ('trial','order') AND ${table.status} IN ('trial_requested','awaiting_payment_setup')`),
  check("commercial_request_kind", sql`${table.kind} IN ('trial','order','support')`),
  check("commercial_request_amount", sql`${table.amountCents} IS NULL OR ${table.amountCents} >= 0`),
]);

export const siteTemplates = sqliteTable("site_templates", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  previewTheme: text("preview_theme").notNull().default("botanical"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const platformClients = sqliteTable("platform_clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteCommercialSettings = sqliteTable("site_commercial_settings", {
  siteId: text("site_id").primaryKey().references(() => eventSites.id, { onDelete: "cascade" }),
  clientId: text("client_id").references(() => platformClients.id, { onDelete: "set null" }),
  planId: text("plan_id").references(() => platformPlans.id, { onDelete: "set null" }),
  templateId: text("template_id").references(() => siteTemplates.id, { onDelete: "set null" }),
  healthStatus: text("health_status").notNull().default("pending"),
  healthSummary: text("health_summary").notNull().default("{}"),
  lastHealthCheckAt: text("last_health_check_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_site_commercial_client").on(table.clientId),
  index("idx_site_commercial_plan").on(table.planId),
]);

export const siteDomains = sqliteTable("site_domains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull().unique(),
  status: text("status").notNull().default("pending"),
  dnsTarget: text("dns_target").notNull().default(""),
  verifiedAt: text("verified_at"),
  lastCheckedAt: text("last_checked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_site_domains_site_status").on(table.siteId, table.status)]);

export const platformSupportSessions = sqliteTable("platform_support_sessions", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").notNull().references(() => platformUsers.id),
  actorEmail: text("actor_email").notNull(),
  reason: text("reason").notNull(),
  scope: text("scope").notNull().default("read_only"),
  status: text("status").notNull().default("active"),
  expiresAt: text("expires_at").notNull(),
  endedAt: text("ended_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_support_sessions_site_status").on(table.siteId, table.status, table.createdAt)]);

export const platformDataExports = sqliteTable("platform_data_exports", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").notNull().references(() => platformUsers.id),
  requestedByEmail: text("requested_by_email").notNull(),
  status: text("status").notNull().default("completed"),
  recordCount: integer("record_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_data_exports_site_created").on(table.siteId, table.createdAt)]);

export const siteDeletionRequests = sqliteTable("site_deletion_requests", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").notNull().references(() => platformUsers.id),
  requestedByEmail: text("requested_by_email").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("scheduled"),
  scheduledFor: text("scheduled_for").notNull(),
  cancelledAt: text("cancelled_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_deletion_requests_site_status").on(table.siteId, table.status, table.createdAt),
]);

export const siteConfigDrafts = sqliteTable("site_config_drafts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  pixPayload: text("pix_payload").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_site_config_drafts_site_user").on(table.siteId, table.userId),
  index("idx_site_config_drafts_site_updated").on(table.siteId, table.updatedAt),
]);

export const siteConfigVersions = sqliteTable("site_config_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  pixPayload: text("pix_payload").notNull().default("{}"),
  createdBy: text("created_by").notNull().references(() => platformUsers.id),
  createdByEmail: text("created_by_email").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_site_config_versions_site_created").on(table.siteId, table.createdAt)]);

export const siteMemberships = sqliteTable("site_memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_site_memberships_site_user").on(table.siteId, table.userId),
]);

export const siteInvitations = sqliteTable("site_invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull().references(() => eventSites.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("editor"),
  status: text("status").notNull().default("pending"),
  invitedBy: text("invited_by").notNull().references(() => platformUsers.id),
  acceptedBy: text("accepted_by").references(() => platformUsers.id),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_site_invitations_site_email").on(table.siteId, table.email),
  index("idx_site_invitations_site_status").on(table.siteId, table.status),
]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_audit_logs_site_created").on(table.siteId, table.createdAt),
  index("idx_audit_logs_actor_created").on(table.actorUserId, table.createdAt),
]);
