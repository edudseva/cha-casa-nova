import { sameOrigin } from "@/lib/request-origin";
import { env } from "cloudflare:workers";
import { requirePlatformOwnerApi } from "@/lib/platform-access";
import { createAuditStatement } from "@/lib/audit-log";
import { SITE_ENVIRONMENT } from "@/lib/site-context";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
const EVENT_TYPES = new Set(["cha-de-panela", "casamento", "cha-revelacao", "aniversario", "outro"]);

async function listSites() {
  const result = await env.DB.prepare(`SELECT id, slug, name, couple_names, event_type, event_date,
    onboarding_status, status, environment, created_at
    FROM event_sites
    WHERE status != 'archived'
    ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC`).all();
  return result.results.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    coupleNames: String(row.couple_names || ""),
    eventType: String(row.event_type),
    eventDate: row.event_date ? String(row.event_date) : null,
    onboardingStatus: String(row.onboarding_status),
    status: String(row.status),
    environment: String(row.environment),
    createdAt: String(row.created_at),
  }));
}

export async function GET() {
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  return Response.json({ sites: await listSites() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (SITE_ENVIRONMENT !== "homologation") return Response.json({ error: "Cadastro de novos sites indisponível antes da abertura comercial." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await requirePlatformOwnerApi();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  if (Number(request.headers.get("content-length") ?? 0) > 8_000) {
    return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });
  }

  const body = await request.json().catch(() => null) as {
    name?: string; coupleNames?: string; eventType?: string; eventDate?: string; slug?: string; ownerEmail?: string;
  } | null;
  const name = body?.name?.trim() ?? "";
  const coupleNames = body?.coupleNames?.trim() ?? "";
  const eventType = body?.eventType?.trim() ?? "";
  const eventDate = body?.eventDate?.trim() || null;
  const slug = body?.slug?.trim().toLowerCase() ?? "";
  const ownerEmail = body?.ownerEmail?.trim().toLowerCase() || null;

  if (name.length < 3 || name.length > 100) return Response.json({ error: "Informe um nome de evento entre 3 e 100 caracteres." }, { status: 400 });
  if (coupleNames.length < 2 || coupleNames.length > 100) return Response.json({ error: "Informe os nomes dos responsáveis pelo evento." }, { status: 400 });
  if (!EVENT_TYPES.has(eventType)) return Response.json({ error: "Selecione um tipo de evento válido." }, { status: 400 });
  if (!SLUG_PATTERN.test(slug)) return Response.json({ error: "Use um identificador de 3 a 48 caracteres, com letras minúsculas, números e hífens." }, { status: 400 });
  const parsedEventDate = eventDate ? new Date(`${eventDate}T12:00:00Z`) : null;
  if (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !parsedEventDate || Number.isNaN(parsedEventDate.getTime()) || parsedEventDate.toISOString().slice(0, 10) !== eventDate)) {
    return Response.json({ error: "Informe uma data válida." }, { status: 400 });
  }
  if (ownerEmail && (ownerEmail.length > 254 || !EMAIL_PATTERN.test(ownerEmail))) {
    return Response.json({ error: "Informe um e-mail válido para o administrador inicial." }, { status: 400 });
  }

  const duplicate = await env.DB.prepare("SELECT id FROM event_sites WHERE slug = ? LIMIT 1").bind(slug).first();
  if (duplicate) return Response.json({ error: "Esse identificador já está sendo usado." }, { status: 409 });

  const normalizedUserEmail = auth.user.email.trim().toLowerCase();
  let storedUser = await env.DB.prepare("SELECT id FROM platform_users WHERE id = ? OR lower(email) = ? LIMIT 1")
    .bind(auth.user.id, normalizedUserEmail).first<{ id: string }>();
  if (!storedUser) {
    await env.DB.prepare(`INSERT INTO platform_users (id, email, display_name, platform_role, updated_at)
      VALUES (?, ?, ?, 'owner', CURRENT_TIMESTAMP)`)
      .bind(auth.user.id, normalizedUserEmail, auth.user.displayName).run();
    storedUser = { id: auth.user.id };
  }

  const siteId = crypto.randomUUID();
  const statements = [
    env.DB.prepare(`INSERT INTO event_sites
      (id, slug, name, couple_names, event_type, event_date, onboarding_status, status, environment, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'started', 'draft', 'homologation', ?, CURRENT_TIMESTAMP)`)
      .bind(siteId, slug, name, coupleNames, eventType, eventDate, storedUser.id),
    env.DB.prepare(`INSERT INTO site_memberships (site_id, user_id, role, status)
      VALUES (?, ?, 'owner', 'active')`).bind(siteId, storedUser.id),
  ];
  if (ownerEmail && ownerEmail !== normalizedUserEmail) {
    statements.push(env.DB.prepare(`INSERT INTO site_invitations
      (site_id, email, role, status, invited_by, expires_at, updated_at)
      VALUES (?, ?, 'editor', 'pending', ?, datetime('now', '+7 days'), CURRENT_TIMESTAMP)`)
      .bind(siteId, ownerEmail, storedUser.id));
  }
  statements.push(createAuditStatement({
    siteId,
    actor: auth.user,
    action: "site.created",
    entityType: "site",
    entityId: siteId,
    metadata: { slug, eventType, invitedAdmin: Boolean(ownerEmail && ownerEmail !== normalizedUserEmail) },
  }));

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error("Could not create event site", error);
    return Response.json({ error: "Não foi possível criar a estrutura do site. Tente outro identificador." }, { status: 409 });
  }

  return Response.json({ ok: true, siteId, sites: await listSites() }, { status: 201 });
}
