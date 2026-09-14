import { requireAdminApi } from "@/lib/admin-auth";
import {
  loadPixAdminConfig,
  loadSiteConfig,
  savePixConfig,
  saveSiteConfig,
} from "@/lib/runtime-config";
import type { SiteConfig } from "@/types/gift";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !origin ||
    new URL(origin).host === new URL(request.url).host
  );
}

export async function GET() {
  const auth = await requireAdminApi();

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

  const auth = await requireAdminApi();

  if (!auth.ok) {
    return Response.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  if (
    Number(request.headers.get("content-length") ?? 0) >
    30000
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

              const [config, pix] = await Promise.all([
                saveSiteConfig(body.config ?? {}),
                savePixConfig(body.pix ?? {}),
              ]);

              return Response.json({ ok: true, config, pix });
            } catch (error) {
              return Response.json(
                { error: error instanceof Error ? error.message : "Configuração inválida." },
      { status: 400 }
    );
  }
}
