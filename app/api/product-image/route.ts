import gifts from "@/data/gifts.json";
import { env } from "cloudflare:workers";

const allowedRetailers = [
  "amazon.com.br", "a.co", "amzn.la", "fastshop.com.br", "mercadolivre.com.br",
  "magazineluiza.com.br", "madeiramadeira.com.br", "shp.ee", "shopee.com.br", "meli.la", "dfcolchoes.com.br", "electrolux.com.br",
];

const MAX_PAGE_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 12_000_000;

type ImageBucket = {
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> } | null>;
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<void>;
  delete(key: string): Promise<void>;
};

function imageBucket() {
  return (env as unknown as { PRODUCT_IMAGES?: ImageBucket }).PRODUCT_IMAGES;
}

async function objectKey(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `products/${[...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("")}.bin`;
}

async function storedImage(key: string) {
  try {
    const object = await imageBucket()?.get(key);
    if (!object) return null;
    // Old releases cached decorative fallbacks. Discard those and retry the
    // source image instead of ever showing a fake product photo.
    if (object.customMetadata?.fallback === "true") {
      await imageBucket()?.delete(key);
      return null;
    }
    return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "public, max-age=3600, s-maxage=31536000", "x-content-type-options": "nosniff" } });
  } catch (error) {
    console.error("Could not read saved product image", error);
    return null;
  }
}

async function saveImage(key: string, response: Response) {
  try {
    const bytes = await response.clone().arrayBuffer();
    await imageBucket()?.put(key, bytes, { httpMetadata: { contentType: response.headers.get("content-type") ?? "image/jpeg" }, customMetadata: { source: "verified" } });
  } catch (error) {
    console.error("Could not save product image", error);
  }
}

function isAllowedRetailer(hostname: string) {
  const normalized = hostname.toLowerCase();
  return allowedRetailers.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}

function isPublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".") || host.endsWith(".") ||
      host === "localhost" || /\.(?:local|localhost|internal|test|invalid)$/.test(host) || host.includes(":")) return false;
    if (/^\d+(?:\.\d+){3}$/.test(host) || host === "0.0.0.0") return false;
    if (/^(10|127|169\.254|192\.168)\./.test(host)) return false;
    const match = host.match(/^172\.(\d+)\./);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchCheckedRedirects(url: string, init: RequestInit, allowed: (url: string) => boolean) {
  let current = url;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!allowed(current)) return null;
    const response = await fetch(current, { ...init, redirect: "manual" });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) return null;
      current = new URL(location, current).toString();
      continue;
    }
    if (response.url && !allowed(response.url)) return null;
    return { response, url: response.url || current };
  }
  return null;
}

async function readPageBounded(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_PAGE_BYTES) { await reader.cancel(); return null; }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function extractPrimaryImage(html: string, pageUrl: string) {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = attribute(tag, "property") ?? attribute(tag, "name");
    if (!["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"].includes(property?.toLowerCase() ?? "")) continue;
    const content = attribute(tag, "content");
    if (content) return new URL(decodeHtml(content), pageUrl).toString();
  }

  const landingImage = html.match(/<img\b[^>]*\bid=["']landingImage["'][^>]*>/i)?.[0];
  if (landingImage) {
    const highResolution = attribute(landingImage, "data-old-hires");
    const source = attribute(landingImage, "src");
    if (highResolution || source) return new URL(decodeHtml(highResolution || source!), pageUrl).toString();

    const dynamicImages = decodeHtml(attribute(landingImage, "data-a-dynamic-image") ?? "");
    const dynamicImage = dynamicImages.match(/https:[^"']+/i)?.[0];
    if (dynamicImage) return dynamicImage.split("\\/").join("/");
  }

  // Only Product structured data is eligible. A generic first "image" match
  // may belong to a recommendation, a logo, or a different colour.
  for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(script[1]);
      const nodes = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const node of nodes) {
        if (![node["@type"]].flat().includes("Product")) continue;
        const value = Array.isArray(node.image) ? node.image[0] : node.image;
        const image = typeof value === "string" ? value : value?.url;
        if (image) return new URL(image, pageUrl).toString();
      }
    } catch { /* Try the next structured data block. */ }
  }
  return null;
}

function extractMarketplaceImage(html: string, pageUrl: string) {
  // Mercado Livre product pages expose the chosen variation in serialized
  // state even when their Open Graph tags are stripped for automated visits.
  // Restrict the match to its own CDN and retain the first product picture.
  const secureUrl = html.match(/(?:"secure_url"|"secureUrl")\s*:\s*"(https:[^" ]+(?:mlstatic|meli\.com)[^" ]+)"/i)?.[1];
  if (secureUrl) {
    try { return new URL(secureUrl.replace(/\\\//g, "/"), pageUrl).toString(); } catch { /* try the next source */ }
  }
  const cdnUrl = html.match(/https:[^" ]+(?:mlstatic\.com|meli\.com)[^" ]+/i)?.[0];
  if (cdnUrl) {
    try { return new URL(cdnUrl.replace(/\\\//g, "/"), pageUrl).toString(); } catch { /* no usable CDN URL */ }
  }
  return null;
}

function amazonAsin(value: string) {
  try {
    return new URL(value).pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

function mercadoLivreIds(value: string) {
  try {
    const url = new URL(value);
    const productId = url.pathname.match(/\/(?:p|up)\/(MLB[U]?\d+)(?:[/?]|$)/i)?.[1]?.toUpperCase() ?? null;
    const decoded = decodeURIComponent(`${url.search} ${url.hash}`);
    const itemId = decoded.match(/(?:item_id:|[?&#]wid=)(MLB\d+)/i)?.[1]?.toUpperCase() ?? null;
    return { productId, itemId };
  } catch {
    return { productId: null, itemId: null };
  }
}

async function mercadoLivreImage(value: string) {
  const { productId, itemId } = mercadoLivreIds(value);
  if (!productId && !itemId) return null;

  const endpoints = [
    itemId ? `https://api.mercadolibre.com/items/${itemId}` : null,
    productId ? `https://api.mercadolibre.com/products/${productId}` : null,
    productId?.startsWith("MLB") && !productId.startsWith("MLBU") ? `https://api.mercadolibre.com/items/${productId}` : null,
  ].filter((endpoint): endpoint is string => Boolean(endpoint));

  for (const endpoint of endpoints) {
    try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(1_500), redirect: "error", headers: { accept: "application/json" } });
    if (!response.ok) continue;
    const data = await response.json() as {
      pictures?: Array<{ secure_url?: string; url?: string }>;
      thumbnail?: string;
      secure_thumbnail?: string;
    };
    const image = data.pictures?.[0]?.secure_url ?? data.pictures?.[0]?.url ?? data.secure_thumbnail ?? data.thumbnail;
    if (image && isPublicHttpsUrl(image)) return image;
    } catch { /* A blocked API must not prevent trying the product page. */ }
  }
  return null;
}

async function fetchImage(imageUrl: string) {
  try {
    if (!isPublicHttpsUrl(imageUrl)) return null;
    const fetched = await fetchCheckedRedirects(imageUrl, { signal: AbortSignal.timeout(3_000), headers: { accept: "image/avif,image/webp,image/jpeg,image/png" } }, isPublicHttpsUrl);
    if (!fetched) return null;
    const image = fetched.response;
    const contentType = image.headers.get("content-type") ?? "";
    const mediaType = contentType.split(";")[0].trim().toLowerCase();
    const contentLength = Number(image.headers.get("content-length") ?? "0");
    if (
      !image.ok ||
      !image.body ||
      !["image/avif", "image/webp", "image/jpeg", "image/png"].includes(mediaType) ||
      (contentLength > 0 && contentLength < 1_000) ||
      contentLength > MAX_IMAGE_BYTES
    ) return null;

    // Count streamed bytes, too: many CDNs omit Content-Length entirely.
    const reader = image.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
    if (size < 1_000) return null;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return null;
  }
}

function cachedImageUrl(imageUrl: string) {
  const cached = new URL("https://wsrv.nl/");
  cached.searchParams.set("url", imageUrl);
  cached.searchParams.set("w", "900");
  cached.searchParams.set("h", "700");
  cached.searchParams.set("fit", "inside");
  cached.searchParams.set("output", "webp");
  cached.searchParams.set("q", "82");
  return cached.toString();
}

async function proxyImage(imageUrl: string, cacheFirst = false) {
  if (!isPublicHttpsUrl(imageUrl)) return null;
  const candidates = cacheFirst ? [cachedImageUrl(imageUrl), imageUrl] : [imageUrl, cachedImageUrl(imageUrl)];
  const responses = await Promise.all(candidates.map((candidate) => fetchImage(candidate)));
  return responses.find((response) => response !== null) ?? null;
}

async function resolveImage(request: Request) {
  let fallbackImageUrl: string | null = null;
  try {
    const requestUrl = new URL(request.url);
    const giftId = requestUrl.searchParams.get("gift")?.trim() ?? "";
    const suppliedProductUrl = requestUrl.searchParams.get("url")?.trim() ?? "";
    const suppliedImageUrl = requestUrl.searchParams.get("image")?.trim() ?? "";
    const gift = gifts.find((item) => item.id === giftId);
    if (!gift && !suppliedProductUrl) return new Response("Imagem indisponível", { status: 404 });

    // The optional "Imagem" column is the explicit, curated override from
    // the catalogue Sheet. When it is present, it must win over any metadata
    // that a store returns (stores often return a generic or a different
    // colour/variation). This endpoint still only accepts public HTTPS image
    // URLs and keeps the result in our own cache.
    fallbackImageUrl = suppliedImageUrl && isPublicHttpsUrl(suppliedImageUrl) ? suppliedImageUrl : null;
    const fallbackOrNotFound = async () => {
      if (fallbackImageUrl) {
        const fallback = await proxyImage(fallbackImageUrl, true);
        if (fallback) return fallback;
      }
      return new Response("Imagem indisponível", { status: 404 });
    };

    // A selected picture in the Sheet is deliberate. Do not let a shop's
    // Open Graph tag replace it with another model, colour or variation.
    if (fallbackImageUrl) {
      const curatedImage = await proxyImage(fallbackImageUrl, true);
      if (curatedImage) return curatedImage;
    }

    // The live Sheet URL must win over the bundled fallback. This keeps the
    // photograph aligned with the exact model and variation selected there.
    const productUrlValue = suppliedProductUrl;
    if (!productUrlValue) return fallbackOrNotFound();

    const productUrl = new URL(productUrlValue);
    if (!isPublicHttpsUrl(productUrlValue) || !isAllowedRetailer(productUrl.hostname)) return new Response("Loja não permitida", { status: 403 });

    // A busca da Amazon não representa um produto único e, portanto, não tem
    // uma imagem confiável para o cartão.
    if (productUrl.hostname.endsWith("amazon.com.br") && productUrl.pathname === "/s") {
      return fallbackOrNotFound();
    }

    const directAsin = amazonAsin(productUrl.toString());
    if (directAsin) {
      const amazonImage = await proxyImage(`https://images-na.ssl-images-amazon.com/images/P/${directAsin}.01.LZZZZZZZ.jpg`);
      if (amazonImage) return amazonImage;
    }

    const mlImage = await mercadoLivreImage(productUrl.toString());
    if (mlImage) {
      const proxied = await proxyImage(mlImage);
      if (proxied) return proxied;
    }

    const pageFetch = await fetchCheckedRedirects(productUrl.toString(), {
      signal: AbortSignal.timeout(3_500),
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9",
        "user-agent": "Mozilla/5.0 (compatible; ChaCasaNova/1.0; +https://evametodo.com.br)",
      },
    }, (value) => isPublicHttpsUrl(value) && isAllowedRetailer(new URL(value).hostname));
    if (!pageFetch) return fallbackOrNotFound();
    const { response: page, url: pageUrl } = pageFetch;

    // Links curtos podem revelar o produto mesmo quando a loja bloqueia o HTML.
    const redirectedAsin = amazonAsin(pageUrl);
    if (redirectedAsin) {
      const amazonImage = await proxyImage(`https://images-na.ssl-images-amazon.com/images/P/${redirectedAsin}.01.LZZZZZZZ.jpg`);
      if (amazonImage) return amazonImage;
    }
    const redirectedMlImage = await mercadoLivreImage(pageUrl);
    if (redirectedMlImage) {
      const proxied = await proxyImage(redirectedMlImage);
      if (proxied) return proxied;
    }

    const pageLength = Number(page.headers.get("content-length") ?? "0");
    if (!page.ok || pageLength > MAX_PAGE_BYTES) return fallbackOrNotFound();

    const html = await readPageBounded(page);
    if (html === null) return fallbackOrNotFound();
    const imageUrl = extractPrimaryImage(html, pageUrl)
      ?? (new URL(pageUrl).hostname.endsWith("mercadolivre.com.br") ? extractMarketplaceImage(html, pageUrl) : null);
    if (!imageUrl || !isPublicHttpsUrl(imageUrl)) return fallbackOrNotFound();

    return await proxyImage(imageUrl) ?? await fallbackOrNotFound();
  } catch (error) {
    console.error("Could not load product image", error);
    if (fallbackImageUrl) {
      const fallback = await proxyImage(fallbackImageUrl, true);
      if (fallback) return fallback;
    }
    return new Response("Imagem indisponível", { status: 404 });
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const productUrl = requestUrl.searchParams.get("url")?.trim() ?? "";
  const explicitImageUrl = requestUrl.searchParams.get("image")?.trim() ?? "";
  const giftId = requestUrl.searchParams.get("gift")?.trim() ?? "";
  const name = requestUrl.searchParams.get("name")?.trim() ?? "Presente para a casa";
  const category = requestUrl.searchParams.get("category")?.trim() ?? "";
  // Give a Sheet-supplied image its own cache key. A visitor cannot overwrite
  // another product's cached artwork merely by changing query parameters.
  const key = await objectKey(
    explicitImageUrl && isPublicHttpsUrl(explicitImageUrl)
      ? `sheet-image:${giftId}:${explicitImageUrl}`
      : productUrl || `gift:${giftId}:${name}:${category}`,
  );

  // A successful image or an intentional illustration is stored in R2. The
  // visitor never depends on a retailer responding while the page is loading.
  const saved = await storedImage(key);
  if (saved) return saved;

  const response = await resolveImage(request);
  if (!response.ok) return response;
  await saveImage(key, response);
  return response;
}
