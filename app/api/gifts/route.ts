import { loadCatalog } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    const catalog = await loadCatalog({ forceRefresh: refresh });
    return Response.json(catalog, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o catálogo." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
