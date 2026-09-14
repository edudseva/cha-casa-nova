import { env } from "cloudflare:workers";
import localGifts from "@/data/gifts.json";
import { loadSiteConfig } from "@/lib/runtime-config";
import type { Gift, GiftPriority } from "@/types/gift";

const CACHE_ID = 1;

const allowedRetailers = [
  "amazon.com.br", "a.co", "amzn.la", "fastshop.com.br", "mercadolivre.com.br",
  "magazineluiza.com.br", "madeiramadeira.com.br", "shp.ee", "shopee.com.br", "meli.la", "dfcolchoes.com.br", "electrolux.com.br",
];

export function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value: string) {
  return normalize(value).replace(/\s+/g, "-") || "presente";
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field); field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; field = "";
    } else field += character;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function safeStoreUrl(value: string) {
  try {
    const trimmed = value.trim();
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !allowedRetailers.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return null;
    return url.toString();
  } catch { return null; }
}

function safeImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || host === "localhost" || host.endsWith(".local")) return null;
    if (/^(10|127|169\.254|192\.168)\./.test(host)) return null;
    const match = host.match(/^172\.(\d+)\./);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return null;
    return url.toString();
  } catch { return null; }
}

function priceFrom(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/[^\d.-]/g, "");
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function productIdentity(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1];
    if (asin) return `amazon:${asin.toUpperCase()}`;
    const mercadoLivre = url.pathname.match(/\/(MLB[U]?\d+)(?:[/?_-]|$)/i)?.[1];
    if (mercadoLivre) return `mercadolivre:${mercadoLivre.toUpperCase()}`;
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch { return null; }
}

function categoryForNewItem(value: string) {
  const category = value.trim();
  if (!category || ["itens grandes", "itens medios", "a pesquisar"].includes(normalize(category))) return "Outros";
  return category;
}

function priorityFrom(value: string, fallback: GiftPriority): GiftPriority {
  const normalized = normalize(value);
  if (normalized === "alta") return "alta";
  if (normalized === "baixa") return "baixa";
  if (normalized === "media") return "media";
  return fallback;
}

function isInactive(value: string) {
  return ["nao", "false", "0", "inativo", "ocultar"].includes(normalize(value));
}

export function giftsFromSheet(csv: string): Gift[] {
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error("A planilha não contém cabeçalho.");
  const headers = rows[0].map(normalize);
  const categoryIndex = headers.indexOf("categoria");
  const itemIndex = headers.indexOf("item");
  const priceIndex = headers.findIndex((header) => header.includes("preco"));
  const linkIndex = headers.indexOf("link");
  const imageIndex = headers.indexOf("imagem");
  const activeIndex = headers.indexOf("ativo");
  const priorityIndex = headers.indexOf("prioridade");
  const noteIndex = headers.findIndex((header) => header === "observacao" || header === "nota");
  if (itemIndex < 0) throw new Error("A coluna Item não foi encontrada.");

  const local = localGifts as Gift[];
  const byName = new Map(local.map((gift) => [normalize(gift.name), gift]));
  const byProduct = new Map(local.map((gift) => [productIdentity(gift.url), gift]).filter((entry): entry is [string, Gift] => Boolean(entry[0])));
  const aliases = new Map<string, string>([
    ["maquina de lavar", "maquina-lavar-12kg"], ["maquina de lavar 12kg", "maquina-lavar-12kg"],
    ["microondas", "microondas"], ["sugar", "acucareiro"],
    ["base cama queen", "base-bau-queen"], ["garrafa de cafe", "garrafa-cafe"],
    ["robo aspirador", "robo-aspirador"], ["vapor wash", "vapor-wash"], ["mop", "mop-giratorio"],
    ["bowls", "bowls"], ["kit ferramentas sparta 129 pecas", "kit-ferramentas"],
    ["jogo de toalhas", "jogo-toalhas"], ["tapete sala de tv", "tapete-sala-tv"],
    ["kit utensilios de cozinha", "kit-utensilios"], ["jogo de lencol", "jogo-lencol"],
    ["tabua de corte", "tabua-corte"], ["fruteira", "fruteira"],
  ]);
  const byId = new Map(local.map((gift) => [gift.id, gift]));
  const seen = new Set<string>();
  const result: Gift[] = [];

  rows.slice(1).forEach((cells, rowIndex) => {
    const name = (cells[itemIndex] ?? "").trim();
    if (!name || normalize(name) === "item" || normalize(name).startsWith("colocar link")) return;
    if (activeIndex >= 0 && isInactive(cells[activeIndex] ?? "")) return;
    const safeUrl = linkIndex >= 0 ? safeStoreUrl(cells[linkIndex] ?? "") : null;
    const explicitImage = imageIndex >= 0 ? safeImageUrl(cells[imageIndex] ?? "") : null;
    const explicitNote = noteIndex >= 0 ? (cells[noteIndex] ?? "").trim() : "";
    const match = byName.get(normalize(name)) ?? byProduct.get(productIdentity(safeUrl) ?? "") ?? byId.get(aliases.get(normalize(name)) ?? "");
    if (match) {
      if (seen.has(match.id)) return;
      seen.add(match.id);
      // A bundled photograph is safe only when the spreadsheet still points
      // to the very same product (or when there is no store link yet). This
      // prevents an older colour/model from appearing on a new product link.
      const sameProduct = Boolean(safeUrl && productIdentity(safeUrl) && productIdentity(safeUrl) === productIdentity(match.url));
      const verifiedFallbackImage = explicitImage ?? (!safeUrl || sameProduct ? match.image : null);
      result.push({
        ...match,
        name,
        category: categoryForNewItem(categoryIndex >= 0 ? cells[categoryIndex] ?? "" : "") === "Outros" ? match.category : categoryForNewItem(cells[categoryIndex] ?? ""),
        price: priceIndex >= 0 ? priceFrom(cells[priceIndex] ?? "") ?? match.price : match.price,
        url: safeUrl,
        image: verifiedFallbackImage,
        note: explicitNote || match.note,
        priority: priorityFrom(priorityIndex >= 0 ? cells[priorityIndex] ?? "" : "", match.priority),
      });
      return;
    }
    const baseId = slug(name);
    let id = baseId;
    while (seen.has(id) || byId.has(id)) id = `${baseId}-${rowIndex + 2}`;
    seen.add(id);
    result.push({
      id,
      category: categoryForNewItem(categoryIndex >= 0 ? cells[categoryIndex] ?? "" : ""),
      name,
      price: priceIndex >= 0 ? priceFrom(cells[priceIndex] ?? "") : null,
      url: safeUrl,
      note: explicitNote || null,
      priority: priorityFrom(priorityIndex >= 0 ? cells[priorityIndex] ?? "" : "", "media"),
      image: explicitImage,
    });
  });
  return result;
}

async function cachedCatalog() {
  try {
    const row = await env.DB.prepare("SELECT payload FROM catalog_cache WHERE id = ?").bind(CACHE_ID).first<{ payload: string }>();
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as Gift[];
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

export async function loadCatalog(): Promise<{ gifts: Gift[]; source: "google-sheets" | "database-cache" }> {
  try {
    const siteConfig = await loadSiteConfig();
    const response = await fetch(siteConfig.giftSheetCsvUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { accept: "text/csv" } });
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);
    const gifts = giftsFromSheet(await response.text());
    try {
      await env.DB.prepare(
        "INSERT INTO catalog_cache (id, payload, synced_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, synced_at = CURRENT_TIMESTAMP"
      ).bind(CACHE_ID, JSON.stringify(gifts)).run();
    } catch (error) { console.error("Could not persist catalog cache", error); }
    return { gifts, source: "google-sheets" };
  } catch (error) {
    console.error("Could not refresh gifts from Google Sheets", error);
    const cached = await cachedCatalog();
    if (cached) return { gifts: cached, source: "database-cache" };
    throw new Error("O catálogo está temporariamente indisponível. Tente novamente.");
  }
}
