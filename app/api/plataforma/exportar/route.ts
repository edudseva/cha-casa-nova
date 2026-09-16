import { env } from "cloudflare:workers";
import { requirePlatformOwnerApi } from "@/lib/platform-access";
import { createAuditStatement } from "@/lib/audit-log";

export async function GET(request: Request) {
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const siteId = new URL(request.url).searchParams.get("siteId") ?? "";
  if (!siteId || siteId.length > 100) return Response.json({ error: "Informe o site." }, { status: 400 });
  const site = await env.DB.prepare("SELECT id, slug, name, status, environment, created_at FROM event_sites WHERE id = ? AND status != 'archived'").bind(siteId).first<Record<string, unknown>>();
  if (!site) return Response.json({ error: "Site não encontrado." }, { status: 404 });
  const settings = await env.DB.prepare(`SELECT p.exports_enabled FROM site_commercial_settings scs
    JOIN platform_plans p ON p.id = scs.plan_id WHERE scs.site_id = ?`).bind(siteId).first<{ exports_enabled: number }>();
  if (settings && !settings.exports_enabled) return Response.json({ error: "O plano não permite exportação." }, { status: 403 });

  const [configuration, pix, reservations, contributions, memberships, invitations, domains] = await env.DB.batch([
    env.DB.prepare("SELECT payload, updated_at FROM site_config WHERE site_id = ? LIMIT 1").bind(siteId),
    env.DB.prepare("SELECT receiver, city, enabled, updated_at FROM pix_config WHERE site_id = ? LIMIT 1").bind(siteId),
    env.DB.prepare(`SELECT gift_id, guest_name, guest_contact, delivery_choice, order_reference, message, status, created_at
      FROM reservations WHERE site_id = ? ORDER BY id DESC LIMIT 5001`).bind(siteId),
    env.DB.prepare(`SELECT guest_name, guest_contact, amount_cents, transaction_reference, message, payment_status, created_at
      FROM contributions WHERE site_id = ? ORDER BY id DESC LIMIT 5001`).bind(siteId),
    env.DB.prepare(`SELECT u.email, u.display_name, m.role, m.status, m.created_at FROM site_memberships m
      JOIN platform_users u ON u.id = m.user_id WHERE m.site_id = ? ORDER BY m.id DESC LIMIT 5001`).bind(siteId),
    env.DB.prepare("SELECT email, role, status, expires_at, created_at FROM site_invitations WHERE site_id = ? ORDER BY id DESC LIMIT 5001").bind(siteId),
    env.DB.prepare("SELECT hostname, status, created_at FROM site_domains WHERE site_id = ? ORDER BY id DESC LIMIT 5001").bind(siteId),
  ]);
  const groups = [reservations, contributions, memberships, invitations, domains];
  if (groups.some((group) => group.results.length > 5000)) {
    return Response.json({ error: "Volume alto demais para exportação direta. Solicite uma exportação assistida." }, { status: 413 });
  }
  const recordCount = groups.reduce((total, group) => total + group.results.length, 0);
  const id = crypto.randomUUID();
  const configurationRow = configuration.results[0] as { payload?: string; updated_at?: string } | undefined;
  const data = {
    exportedAt: new Date().toISOString(),
    site,
    configuration: configurationRow?.payload ? JSON.parse(configurationRow.payload) : null,
    configurationUpdatedAt: configurationRow?.updated_at ?? null,
    pix: pix.results[0] ?? null,
    reservations: reservations.results,
    contributions: contributions.results,
    memberships: memberships.results,
    invitations: invitations.results,
    domains: domains.results,
  };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO platform_data_exports (id, site_id, requested_by, requested_by_email, status, record_count)
      VALUES (?, ?, ?, ?, 'completed', ?)`).bind(id, siteId, auth.user.id, auth.user.email.toLowerCase(), recordCount),
    createAuditStatement({ siteId, actor: auth.user, action: "site.data_exported", entityType: "data_export", entityId: id, metadata: { recordCount } }),
  ]);
  return new Response(JSON.stringify(data, null, 2), { headers: {
    "content-type": "application/json; charset=utf-8",
    "content-disposition": `attachment; filename="dados-${String(site.slug).replace(/[^a-z0-9-]/g, "")}.json"`,
    "cache-control": "no-store, private",
    "x-content-type-options": "nosniff",
  } });
}
