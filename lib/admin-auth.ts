import type { EventPermission } from "@/lib/event-access";
import { requireEventApi, requireEventPage } from "@/lib/event-access";

export async function requireAdminPage(permission: EventPermission = "event.view", returnTo = "/admin") {
  const result = await requireEventPage(permission, returnTo);
  return result?.user ?? null;
}

export async function requireAdminPageAccess(permission: EventPermission = "event.view", returnTo = "/admin") {
  return requireEventPage(permission, returnTo);
}

export async function requireAdminApi(permission: EventPermission = "event.view") {
  return requireEventApi(permission);
}
