import { env } from "cloudflare:workers";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { sameOrigin } from "@/lib/request-origin";

type Person = { name?: unknown; attending?: unknown };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
      return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });
    }
    const body = await request.json() as { people?: Person[]; website?: string };
    if (body.website) return Response.json({ ok: true }, { status: 201 });
    if (!Array.isArray(body.people) || body.people.length < 1 || body.people.length > 20) {
      return Response.json({ error: "Informe de 1 a 20 pessoas." }, { status: 400 });
    }
    const people = body.people.map((person) => ({
      name: typeof person.name === "string" ? person.name.trim() : "",
      attending: person.attending,
    }));
    if (people.some((person) => person.name.length < 2 || person.name.length > 100 || typeof person.attending !== "boolean")) {
      return Response.json({ error: "Confira os nomes e as respostas de presença." }, { status: 400 });
    }

    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS attendance_confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      attending INTEGER NOT NULL CHECK (attending IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();

    const groupId = crypto.randomUUID();
    await env.DB.batch(people.map((person) =>
      env.DB.prepare("INSERT INTO attendance_confirmations (site_id, group_id, guest_name, attending) VALUES (?, ?, ?, ?)")
        .bind(CURRENT_SITE_ID, groupId, person.name, person.attending ? 1 : 0)
    ));
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Could not save attendance confirmations", error);
    return Response.json({ error: "Não foi possível registrar agora. Tente novamente." }, { status: 500 });
  }
}
