import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { csvCell } from "@/lib/csv-export";

export async function GET(request: Request) {
  const auth = await requireAdminApi("reports.export");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const type = new URL(request.url).searchParams.get("type");
  if (!type || !["presentes", "pix", "convidados"].includes(type)) return Response.json({ error: "Relatório inválido." }, { status: 400 });
  if (type === "convidados") {
    const [reservations, contributions] = await env.DB.batch([
      env.DB.prepare("SELECT guest_name, guest_contact, created_at FROM reservations WHERE site_id = ? ORDER BY created_at DESC").bind(CURRENT_SITE_ID),
      env.DB.prepare("SELECT guest_name, guest_contact, amount_cents, created_at FROM contributions WHERE site_id = ? ORDER BY created_at DESC").bind(CURRENT_SITE_ID),
    ]);
    const guests = new Map<string, { nome: string; contato: string; presentes: number; pix_centavos: number; interacoes: number; ultima_interacao: string }>();
    const add = (row: Record<string, unknown>, kind: "gift" | "pix") => {
      const nome = String(row.guest_name ?? "");
      const contato = String(row.guest_contact ?? "");
      const key = (contato || nome).trim().toLocaleLowerCase("pt-BR");
      const current = guests.get(key) ?? { nome, contato, presentes: 0, pix_centavos: 0, interacoes: 0, ultima_interacao: String(row.created_at ?? "") };
      current.interacoes += 1;
      if (kind === "gift") current.presentes += 1;
      else current.pix_centavos += Number(row.amount_cents ?? 0);
      if (String(row.created_at ?? "") > current.ultima_interacao) current.ultima_interacao = String(row.created_at ?? "");
      guests.set(key, current);
    };
    reservations.results.forEach((row) => add(row as Record<string, unknown>, "gift"));
    contributions.results.forEach((row) => add(row as Record<string, unknown>, "pix"));
    const rows = [...guests.values()];
    const headers = ["nome", "contato", "presentes", "pix_centavos", "interacoes", "ultima_interacao"];
    const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="convidados-cha-casa-nova.csv"', "cache-control": "no-store" } });
  }
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
