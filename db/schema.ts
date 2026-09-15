import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  giftId: text("gift_id").notNull().unique(),
  guestName: text("guest_name").notNull(),
  guestContact: text("guest_contact").notNull().default(""),
  deliveryChoice: text("delivery_choice").notNull().default(""),
  orderReference: text("order_reference").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("purchased"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contributions = sqliteTable("contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guestName: text("guest_name").notNull(),
  guestContact: text("guest_contact").notNull().default(""),
  amountCents: integer("amount_cents").notNull(),
  transactionReference: text("transaction_reference").notNull().default(""),
  message: text("message").notNull().default(""),
  paymentStatus: text("payment_status").notNull().default("declared"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const catalogCache = sqliteTable("catalog_cache", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  syncedAt: text("synced_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteConfig = sqliteTable("site_config", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pixConfig = sqliteTable("pix_config", {
  id: integer("id").primaryKey(),
  pixKey: text("pix_key").notNull(),
  receiver: text("receiver").notNull(),
  city: text("city").notNull(),
  enabled: integer("enabled").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
  status: text("status").notNull().default("draft"),
  environment: text("environment").notNull().default("homologation"),
  createdBy: text("created_by").notNull().references(() => platformUsers.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
