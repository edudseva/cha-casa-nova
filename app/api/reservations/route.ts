import { sameOrigin } from "@/lib/request-origin";
import { env } from "cloudflare:workers";
import { loadCatalog } from "@/lib/catalog";
import { CURRENT_SITE_ID } from "@/lib/site-context";

type ReservationPayload = {
  giftId?: string;
  guestName?: string;
  guestContact?: string;
  deliveryChoice?: string;
  orderReference?: string;
  message?: string;
  purchaseConfirmed?: boolean;
  website?: string;
};

export async function GET() {
  try {
    const result = await env.DB.prepare(
      "SELECT gift_id, status FROM reservations WHERE site_id = ? AND status = ? ORDER BY created_at DESC"
    ).bind(CURRENT_SITE_ID, "purchased").all<{ gift_id: string; status: string }>();

    return Response.json({
      reservations: result.results.map((row: { gift_id: string; status: string }) => ({
        giftId: row.gift_id,
        status: row.status,
      })),
    });
  } catch (error) {
    console.error("Could not load reservations", error);
    return Response.json({ reservations: [], unavailable: true }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
      return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });
    }
    const payload = (await request.json()) as ReservationPayload;
    const giftId = payload.giftId?.trim() ?? "";
    const guestName = payload.guestName?.trim() ?? "";
    const guestContact = payload.guestContact?.trim() ?? "";
    const deliveryChoice = payload.deliveryChoice?.trim() ?? "";
    const orderReference = payload.orderReference?.trim() ?? "";
    const message = payload.message?.trim() ?? "";

    if (payload.website) return Response.json({ ok: true }, { status: 201 });
    const catalog = await loadCatalog();
    if (!catalog.gifts.some((gift) => gift.id === giftId)) {
      return Response.json({ error: "Presente inválido." }, { status: 400 });
    }
    if (!payload.purchaseConfirmed) {
      return Response.json({ error: "Confirme que a compra foi concluída." }, { status: 400 });
    }
    if (guestName.length < 2 || guestName.length > 80) {
      return Response.json({ error: "Informe seu nome para reservar o presente." }, { status: 400 });
    }
    if (!["casal", "convidado", "outro"].includes(deliveryChoice)) {
      return Response.json({ error: "Informe para onde o presente será enviado." }, { status: 400 });
    }
    if (guestContact.length > 120 || orderReference.length > 120 || message.length > 400) {
      return Response.json({ error: "Os dados informados são muito longos." }, { status: 400 });
    }

    const reopened = await env.DB.prepare(
      "UPDATE reservations SET guest_name = ?, guest_contact = ?, delivery_choice = ?, order_reference = ?, message = ?, status = ?, created_at = CURRENT_TIMESTAMP WHERE site_id = ? AND gift_id = ? AND status != ?"
    ).bind(guestName, guestContact, deliveryChoice, orderReference, message, "purchased", CURRENT_SITE_ID, giftId, "purchased").run();

    if (!reopened.meta.changes) {
      await env.DB.prepare(
        "INSERT INTO reservations (site_id, gift_id, guest_name, guest_contact, delivery_choice, order_reference, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(CURRENT_SITE_ID, giftId, guestName, guestContact, deliveryChoice, orderReference, message, "purchased").run();
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "Este presente acabou de ser escolhido por outra pessoa." }, { status: 409 });
    }
    console.error("Could not create reservation", error);
    return Response.json({ error: "Não foi possível reservar agora. Tente novamente." }, { status: 500 });
  }
}
