import { requireAdminApi } from "@/lib/admin-auth";
import {
  loadSiteConfig,
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

  return Response.json(
    { config: await loadSiteConfig() },
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
    };

    const config = await saveSiteConfig(
      body.config ?? {}
    );

    return Response.json({ ok: true, config });
  } catch {
    return Response.json(
      { error: "Configuração inválida." },
      { status: 400 }
    );
  }
}
