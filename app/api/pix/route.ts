import { env } from "cloudflare:workers";

type PixEnvironment = {
  PIX_KEY?: string;
  PIX_RECEIVER?: string;
  PIX_CITY?: string;
};

function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function clean(value: string, maxLength: number) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").toUpperCase().slice(0, maxLength);
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function config() {
  const fixed = env as unknown as PixEnvironment;
  return {
    key: fixed.PIX_KEY?.trim() ?? "",
    receiver: clean(fixed.PIX_RECEIVER?.trim() ?? "", 25),
    city: clean(fixed.PIX_CITY?.trim() || "BRASILIA", 15),
  };
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

export async function GET() {
  const pix = config();
  return Response.json(
    { ready: Boolean(pix.key && pix.receiver), receiver: pix.receiver || null },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const pix = config();
  if (!pix.key || !pix.receiver) {
    return Response.json({ error: "O Pix ainda está sendo configurado." }, { status: 503 });
  }

  const payload = (await request.json()) as { amount?: number };
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) {
    return Response.json({ error: "Informe um valor válido entre R$ 1 e R$ 1.000.000." }, { status: 400 });
  }

  const txid = `CHA${crypto.randomUUID().replace(/-/g, "").slice(0, 22)}`.toUpperCase();
  const merchantAccount = field("00", "BR.GOV.BCB.PIX") + field("01", pix.key);
  const additional = field("05", txid);
  const base = [
    field("00", "01"), field("01", "12"), field("26", merchantAccount), field("52", "0000"),
    field("53", "986"), field("54", amount.toFixed(2)), field("58", "BR"),
    field("59", pix.receiver), field("60", pix.city), field("62", additional), "6304",
  ].join("");

  return Response.json({
    amount,
    receiver: pix.receiver,
    pixCopyPaste: `${base}${crc16(base)}`,
    transactionReference: txid,
  }, { headers: { "cache-control": "no-store" } });
}
