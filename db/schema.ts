import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
