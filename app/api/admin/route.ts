import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";
import { loadCatalog } from "@/lib/catalog";
import { createAuditStatement } from "@/lib/audit-log";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { roleHasPermission } from "@/lib/event-access";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

export async function GET() {
  const auth = await requireAdminApi("event.view");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const [reservations, contributions] = await env.DB.batch([
    env.DB.prepare("SELECT id, gift_id, guest_name, guest_contact, delivery_choice, order_reference, message, status, created_at FROM reservations WHERE site_id = ? ORDER BY created_at DESC").bind(CURRENT_SITE_ID),
    env.DB.prepare("SELECT id, guest_name, guest_contact, amount_cents, transaction_reference, message, payment_status, created_at FROM contributions WHERE site_id = ? ORDER BY created_at DESC").bind(CURRENT_SITE_ID),
  ]);

  const catalog = await loadCatalog();
  const names = new Map(catalog.gifts.map((gift) => [gift.id, gift.name]));
  return Response.json({
    reservations: reservations.results.map((row) => ({ ...row, gift_name: names.get(String(row.gift_id)) ?? String(row.gift_id) })),
    contributions: contributions.results,
  }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await requireAdminApi("event.view");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  if (Number(request.headers.get("content-length") ?? 0) > 5_000) return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });

  const body = await request.json() as { kind?: string; id?: number; status?: string };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Registro inválido." }, { status: 400 });

  if (body.kind === "reservation" && ["purchased", "cancelled"].includes(body.status ?? "")) {
    if (!roleHasPermission(auth.access.role, "gifts.manage")) return Response.json({ error: "Seu perfil não permite alterar presentes." }, { status: 403 });
    const current = await env.DB.prepare("SELECT status FROM reservations WHERE id = ? AND site_id = ?").bind(id, CURRENT_SITE_ID).first<{ status: string }>();
    if (!current) return Response.json({ error: "Registro não encontrado." }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare("UPDATE reservations SET status = ? WHERE id = ? AND site_id = ?").bind(body.status, id, CURRENT_SITE_ID),
      createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "reservation.status_updated", entityType: "reservation", entityId: id, metadata: { from: current.status, to: body.status } }),
    ]);
    return Response.json({ ok: true });
  }
  if (body.kind === "contribution" && ["declared", "confirmed", "rejected"].includes(body.status ?? "")) {
    if (!roleHasPermission(auth.access.role, "pix.manage")) return Response.json({ error: "Seu perfil não permite conferir contribuições." }, { status: 403 });
    const current = await env.DB.prepare("SELECT payment_status FROM contributions WHERE id = ? AND site_id = ?").bind(id, CURRENT_SITE_ID).first<{ payment_status: string }>();
    if (!current) return Response.json({ error: "Registro não encontrado." }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare("UPDATE contributions SET payment_status = ? WHERE id = ? AND site_id = ?").bind(body.status, id, CURRENT_SITE_ID),
      createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "contribution.status_updated", entityType: "contribution", entityId: id, metadata: { from: current.payment_status, to: body.status } }),
    ]);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Atualização inválida." }, { status: 400 });
}
