import { requireAdminApi } from "@/lib/admin-auth";
import {
  loadPixAdminConfig,
  loadSiteConfig,
  savePixConfig,
  saveSiteConfig,
} from "@/lib/runtime-config";
import type { SiteConfig } from "@/types/gift";
import { createAuditStatement } from "@/lib/audit-log";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { galleryLimitExceeded } from "@/lib/platform-limits";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !origin ||
    new URL(origin).host === new URL(request.url).host
  );
}

export async function GET() {
  const auth = await requireAdminApi("event.settings.edit");

  if (!auth.ok) {
    return Response.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

    const [config, pix] = await Promise.all([loadSiteConfig(), loadPixAdminConfig()]);
    return Response.json(
      { config, pix },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json(
      { error: "Origem inválida." },
      { status: 403 }
    );
  }

  const auth = await requireAdminApi("event.settings.edit");

  if (!auth.ok) {
    return Response.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  if (
    Number(request.headers.get("content-length") ?? 0) >
    60000
  ) {
    return Response.json(
      { error: "Dados enviados em excesso." },
      { status: 413 }
    );
  }

  try {
              const body = (await request.json()) as {
                config?: Partial<SiteConfig>;
                pix?: { enabled?: boolean; key?: string; receiver?: string; city?: string };
              };

              if (body.config?.photoGallery && await galleryLimitExceeded(CURRENT_SITE_ID, body.config.photoGallery.length)) {
                return Response.json({ error: "A galeria ultrapassa o limite de fotos do plano." }, { status: 409 });
              }

              const [config, pix] = await Promise.all([
                saveSiteConfig(body.config ?? {}),
                savePixConfig(body.pix ?? {}),
              ]);
              await createAuditStatement({
                siteId: CURRENT_SITE_ID,
                actor: auth.user,
                action: "site.configuration_updated",
                entityType: "site",
                entityId: CURRENT_SITE_ID,
                metadata: { configuration: Boolean(body.config), pix: Boolean(body.pix) },
              }).run();

              return Response.json({ ok: true, config, pix });
            } catch (error) {
              return Response.json(
                { error: error instanceof Error ? error.message : "Configuração inválida." },
      { status: 400 }
    );
  }
}
