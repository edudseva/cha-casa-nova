import { env } from "cloudflare:workers";

type ContributionPayload = {
  amount?: number;
  guestName?: string;
  guestContact?: string;
  transactionReference?: string;
  message?: string;
  paymentConfirmed?: boolean;
  website?: string;
};

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
      return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });
    }
    const payload = (await request.json()) as ContributionPayload;
    if (payload.website) return Response.json({ ok: true }, { status: 201 });
    const amountCents = Math.round(Number(payload.amount) * 100);
    const guestName = payload.guestName?.trim() ?? "";
    const guestContact = payload.guestContact?.trim() ?? "";
    const transactionReference = payload.transactionReference?.trim() ?? "";
    const message = payload.message?.trim() ?? "";

    if (!payload.paymentConfirmed) return Response.json({ error: "Confirme que o Pix foi enviado." }, { status: 400 });
    if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 100000000) {
      return Response.json({ error: "Informe um valor válido entre R$ 1 e R$ 1.000.000." }, { status: 400 });
    }
    if (guestName.length < 2 || guestName.length > 80 || guestContact.length > 120 || transactionReference.length > 120 || message.length > 400) {
      return Response.json({ error: "Revise os dados informados." }, { status: 400 });
    }

    await env.DB.prepare(
      "INSERT INTO contributions (guest_name, guest_contact, amount_cents, transaction_reference, message, payment_status) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(guestName, guestContact, amountCents, transactionReference, message, "declared").run();

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Could not register contribution", error);
    return Response.json({ error: "Não foi possível registrar a contribuição." }, { status: 500 });
  }
}
