import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";
import { CURRENT_SITE_ID } from "@/lib/site-context";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const auth = await requireAdminApi("reports.export");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const type = new URL(request.url).searchParams.get("type");
  const isPix = type === "pix";
  const query = isPix
    ? "SELECT id, guest_name, guest_contact, amount_cents, transaction_reference, message, payment_status, created_at FROM contributions WHERE site_id = ? ORDER BY created_at DESC"
    : "SELECT id, gift_id, guest_name, guest_contact, delivery_choice, order_reference, message, status, created_at FROM reservations WHERE site_id = ? ORDER BY created_at DESC";
  const result = await env.DB.prepare(query).bind(CURRENT_SITE_ID).all<Record<string, unknown>>();
  const rows = result.results;
  const headers = rows.length ? Object.keys(rows[0]) : (isPix
    ? ["id", "guest_name", "guest_contact", "amount_cents", "transaction_reference", "message", "payment_status", "created_at"]
    : ["id", "gift_id", "guest_name", "guest_contact", "delivery_choice", "order_reference", "message", "status", "created_at"]);
  const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${isPix ? "pix" : "presentes"}-cha-casa-nova.csv"`,
      "cache-control": "no-store",
    },
  });
}
