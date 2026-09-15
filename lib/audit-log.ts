import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

type AuditEntry = {
  siteId: string;
  actor: ChatGPTUser;
  action: string;
  entityType: string;
  entityId?: string | number;
  metadata?: Record<string, unknown>;
};

export function createAuditStatement({ siteId, actor, action, entityType, entityId = "", metadata = {} }: AuditEntry) {
  return env.DB.prepare(`INSERT INTO audit_logs
    (site_id, actor_user_id, actor_email, action, entity_type, entity_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      siteId,
      actor.id,
      actor.email.trim().toLowerCase(),
      action,
      entityType,
      String(entityId),
      JSON.stringify(metadata),
    );
}
