import { sameOrigin } from "@/lib/request-origin";
import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAuditStatement } from "@/lib/audit-log";
import { cleanSiteConfig, savePixConfig, saveSiteConfig } from "@/lib/runtime-config";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { loadSiteEditorState } from "@/lib/site-editor";
import { validateSiteEditor } from "@/lib/site-config-validation";
import { ensurePlatformUser } from "@/lib/account-access";
import { galleryLimitExceeded } from "@/lib/platform-limits";
import type { PixAdminConfig, SiteConfig } from "@/types/gift";

export async function GET() {
  const auth = await requireAdminApi("event.settings.edit");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  return Response.json(await loadSiteEditorState(auth.user.id), { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await requireAdminApi("event.settings.edit");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  if (Number(request.headers.get("content-length") ?? 0) > 70000) return Response.json({ error: "Dados enviados em excesso." }, { status: 413 });

  try {
    const actorId = await ensurePlatformUser(auth.user);
    const body = await request.json() as {
      action?: "draft" | "publish" | "restore" | "discard";
      config?: SiteConfig;
      pix?: PixAdminConfig;
      pixKey?: string;
      versionId?: number;
    };
    const action = body.action ?? "draft";
    if (action === "discard") {
      await env.DB.prepare("DELETE FROM site_config_drafts WHERE site_id = ? AND user_id = ?").bind(CURRENT_SITE_ID, actorId).run();
      return Response.json(await loadSiteEditorState(actorId));
    }
    if (action === "restore") {
      const version = await env.DB.prepare("SELECT payload, pix_payload FROM site_config_versions WHERE id = ? AND site_id = ? LIMIT 1").bind(Number(body.versionId), CURRENT_SITE_ID).first<{ payload: string; pix_payload: string }>();
      if (!version) return Response.json({ error: "Versão não encontrada." }, { status: 404 });
      await env.DB.prepare(`INSERT INTO site_config_drafts (site_id, user_id, payload, pix_payload, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(site_id, user_id) DO UPDATE SET payload = excluded.payload, pix_payload = excluded.pix_payload, updated_at = CURRENT_TIMESTAMP`)
        .bind(CURRENT_SITE_ID, actorId, version.payload, version.pix_payload).run();
      await createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "site.version_restored_to_draft", entityType: "site_config_version", entityId: body.versionId }).run();
      return Response.json(await loadSiteEditorState(actorId));
    }
    if (!body.config || !body.pix) return Response.json({ error: "Configuração incompleta." }, { status: 400 });
    const issues = validateSiteEditor(body.config, body.pix, Boolean(body.pixKey?.trim()));
    const pixDraft = { enabled: body.pix.enabled, receiver: body.pix.receiver, city: body.pix.city, hasKey: body.pix.hasKey };

    if (action === "draft") {
      await env.DB.prepare(`INSERT INTO site_config_drafts (site_id, user_id, payload, pix_payload, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(site_id, user_id) DO UPDATE SET payload = excluded.payload, pix_payload = excluded.pix_payload, updated_at = CURRENT_TIMESTAMP`)
        .bind(CURRENT_SITE_ID, actorId, JSON.stringify(body.config), JSON.stringify(pixDraft)).run();
      return Response.json({ ok: true, savedAt: new Date().toISOString(), issues });
    }

    const errors = issues.filter((issue) => issue.level === "error");
    if (errors.length) return Response.json({ error: "Corrija os campos indicados antes de publicar.", issues }, { status: 422 });
    if (await galleryLimitExceeded(CURRENT_SITE_ID, body.config.photoGallery?.length ?? 0)) {
      return Response.json({ error: "A galeria ultrapassa o limite de fotos do plano." }, { status: 409 });
    }
    const config = cleanSiteConfig(body.config);
    const [publishedConfig, publishedPix] = await Promise.all([
      saveSiteConfig(config),
      savePixConfig({ ...pixDraft, key: body.pixKey }),
    ]);
    const versionPix = { enabled: publishedPix.enabled, receiver: publishedPix.receiver, city: publishedPix.city, hasKey: publishedPix.hasKey };
    const statements = [
      env.DB.prepare(`INSERT INTO site_config_versions (site_id, payload, pix_payload, created_by, created_by_email)
        VALUES (?, ?, ?, ?, ?)`).bind(CURRENT_SITE_ID, JSON.stringify(publishedConfig), JSON.stringify(versionPix), actorId, auth.user.email.trim().toLowerCase()),
      env.DB.prepare("DELETE FROM site_config_drafts WHERE site_id = ? AND user_id = ?").bind(CURRENT_SITE_ID, actorId),
      createAuditStatement({ siteId: CURRENT_SITE_ID, actor: auth.user, action: "site.configuration_published", entityType: "site", entityId: CURRENT_SITE_ID }),
    ];
    await env.DB.batch(statements);
    return Response.json({ ok: true, ...(await loadSiteEditorState(actorId)), issues: [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível concluir a operação." }, { status: 400 });
  }
}
