import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { isPlatformOwner } from "@/lib/platform-access";
import { CURRENT_SITE_ID } from "@/lib/site-context";

export type EventRole = "owner" | "editor" | "viewer";
export type EventPermission =
  | "event.view"
  | "event.settings.edit"
  | "gifts.manage"
  | "pix.manage"
  | "reports.export"
  | "members.manage";

export type EventAccess = {
  siteId: string;
  role: EventRole;
  source: "platform-owner" | "configured-admin" | "membership";
};

type AdminEnvironment = { ADMIN_EMAIL?: string; ADMIN_EMAILS?: string };

const PASSWORD_ADMIN_EMAIL = "admin@cha-casa-nova.local";
const PASSWORD_ADMIN_ID = "admin-password-session";

const permissions: Record<EventRole, ReadonlySet<EventPermission>> = {
  owner: new Set(["event.view", "event.settings.edit", "gifts.manage", "pix.manage", "reports.export", "members.manage"]),
  editor: new Set(["event.view", "event.settings.edit", "gifts.manage", "pix.manage", "reports.export"]),
  viewer: new Set(["event.view"]),
};

function configuredAdminEmails() {
  const adminEnvironment = env as unknown as AdminEnvironment;
  return new Set(
    [adminEnvironment.ADMIN_EMAIL, adminEnvironment.ADMIN_EMAILS]
      .filter(Boolean)
      .flatMap((value) => value!.split(/[;,\n]/))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function roleHasPermission(role: EventRole, permission: EventPermission) {
  return permissions[role].has(permission);
}

export async function getEventAccess(user: ChatGPTUser, siteId = CURRENT_SITE_ID): Promise<EventAccess | null> {
  const email = user.email.trim().toLowerCase();
  // This identity can only be created by the Worker after validating the
  // password-backed, HttpOnly session cookie and stripping browser headers.
  if (user.id === PASSWORD_ADMIN_ID && email === PASSWORD_ADMIN_EMAIL) {
    return { siteId, role: "owner", source: "configured-admin" };
  }
  if (isPlatformOwner(email)) return { siteId, role: "owner", source: "platform-owner" };
  if (configuredAdminEmails().has(email)) return { siteId, role: "owner", source: "configured-admin" };

  const membership = await env.DB.prepare(
    "SELECT m.role FROM site_memberships m " +
    "INNER JOIN platform_users u ON u.id = m.user_id " +
    "WHERE m.site_id = ? AND m.status = 'active' " +
    "AND (u.id = ? OR lower(u.email) = ?) LIMIT 1",
  ).bind(siteId, user.id, email).first<{ role: string }>();
  if (!membership || !["owner", "editor", "viewer"].includes(membership.role)) return null;
  return { siteId, role: membership.role as EventRole, source: "membership" };
}

export async function requireEventPage(permission: EventPermission, _returnTo: string, siteId = CURRENT_SITE_ID) {
  const requestHeaders = await headers();
  const email = requestHeaders.get("x-admin-access-email");
  if (!email) return null;
  const fullName = requestHeaders.get("x-admin-access-name");
  const user: ChatGPTUser = {
    id: requestHeaders.get("x-admin-access-id") ?? email.trim().toLowerCase(),
    email,
    displayName: fullName ?? email,
    fullName,
  };
  const access = await getEventAccess(user, siteId);
  if (!access || !roleHasPermission(access.role, permission)) return null;
  return { user, access };
}

export async function requireEventApi(permission: EventPermission, siteId = CURRENT_SITE_ID) {
  const requestHeaders = await headers();
  const email = requestHeaders.get("x-admin-access-email");
  if (!email) return { ok: false as const, status: 401, error: "Autenticação do painel não identificada." };
  const fullName = requestHeaders.get("x-admin-access-name");
  const user: ChatGPTUser = {
    id: requestHeaders.get("x-admin-access-id") ?? email.trim().toLowerCase(),
    email,
    displayName: fullName ?? email,
    fullName,
  };
  const access = await getEventAccess(user, siteId);
  if (!access) return { ok: false as const, status: 403, error: "Sua conta não possui acesso a este evento." };
  if (!roleHasPermission(access.role, permission)) {
    return { ok: false as const, status: 403, error: "Seu perfil não permite esta operação." };
  }
  return { ok: true as const, user, access };
}
