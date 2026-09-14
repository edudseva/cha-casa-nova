import { loadCatalog } from "@/lib/catalog";

export async function GET() {
  try {
    const catalog = await loadCatalog();
    return Response.json(catalog, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o catálogo." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
