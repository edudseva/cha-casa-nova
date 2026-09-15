import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const local = JSON.parse(readFileSync(new URL('../data/gifts.json', import.meta.url), 'utf8'));
const siteConfig = JSON.parse(readFileSync(new URL('../data/site-config.json', import.meta.url), 'utf8'));
async function loadSource(path, replacements) {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of replacements) source = source.replace(from, to);
  return import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
}
const catalog = await loadSource('../lib/catalog.ts', [
  [/import \{ env \} from "cloudflare:workers";/, 'const env = { DB: { prepare() { throw new Error("database offline"); } } };'],
  [/import localGifts from "@\/data\/gifts.json";/, `const localGifts = ${JSON.stringify(local)};`],
  [/import \{ loadSiteConfig \} from "@\/lib\/runtime-config";/, "const loadSiteConfig = async () => siteConfig;"],
]);

test('only current sheet rows appear, including an intentionally empty catalogue', () => {
  const result = catalog.giftsFromSheet('Categoria,Item,Faixa de preço,Link\n,Cooktop 5 bocas inox,645,https://www.amazon.com.br/dp/B0DJ3D3TXK');
  assert.equal(result.length, 1);
  assert.ok(!result.some(item => /alexa/i.test(item.name)));
  assert.deepEqual(catalog.giftsFromSheet('Categoria,Item,Faixa de preço,Link\n'), []);
});

test('changing the vacuum link cannot revive a legacy photograph', () => {
  const result = catalog.giftsFromSheet('Categoria,Item,Faixa de preço,Link\n,Aspirador de pó e líquido,500,https://www.amazon.com.br/dp/B0CJYJH5TD');
  assert.equal(result[0].url, 'https://www.amazon.com.br/dp/B0CJYJH5TD');
  assert.equal(result[0].image, null);
});

test('incomplete rows remain visible without restoring a deleted link', () => {
  const result = catalog.giftsFromSheet('Categoria,Item,Faixa de preço,Link\n,Jogo de panelas,,');
  assert.equal(result.length, 1);
  assert.equal(result[0].url, null);
});

test('a failed sheet and absent cache never return bundled items', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 503 });
  try { await assert.rejects(catalog.loadCatalog(), /temporariamente/); }
  finally { globalThis.fetch = original; }
});

test('a failed marketplace API still tries the product page', async () => {
  const route = await loadSource('../app/api/product-image/route.ts', [
    [/import gifts from "@\/data\/gifts.json";/, `const gifts = ${JSON.stringify(local)};`],
    [/import \{ env \} from "cloudflare:workers";/, 'const env = { PRODUCT_IMAGES: { async get() { return null; }, async put() {} } };'],
  ]);
  const original = globalThis.fetch;
  const product = 'https://www.mercadolivre.com.br/example/p/MLB54775758';
  let pageFetched = false;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('api.mercadolibre.com')) throw new Error('API blocked');
    if (url === product) {
      pageFetched = true;
      const response = new Response('<meta property="og:image" content="https://http2.mlstatic.com/product.jpg">');
      Object.defineProperty(response, 'url', { value: product });
      return response;
    }
    return new Response(new Uint8Array(2000), { headers: { 'content-type': 'image/jpeg' } });
  };
  try {
    const response = await route.GET(new Request(`https://example.com/api/product-image?gift=robo-aspirador&url=${encodeURIComponent(product)}`));
    assert.equal(response.status, 200);
    assert.ok(pageFetched);
  } finally { globalThis.fetch = original; }
});

test('image loading survives a denied cache getter and a rejected cache lookup', async () => {
  const route = await loadSource('../app/api/product-image/route.ts', [
    [/import gifts from "@\/data\/gifts.json";/, `const gifts = ${JSON.stringify(local)};`],
    [/import \{ env \} from "cloudflare:workers";/, 'const env = { PRODUCT_IMAGES: { async get() { return null; }, async put() {} } };'],
  ]);
  const oldCache = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array(2000), { headers: { 'content-type': 'image/jpeg' } });
  const request = new Request('https://example.com/api/product-image?url=https%3A%2F%2Fwww.amazon.com.br%2Fdp%2FB0CJYJH5TD');
  try {
    Object.defineProperty(globalThis, 'caches', { configurable: true, get() { throw new Error('Cache API unavailable'); } });
    assert.equal((await route.GET(request)).status, 200);
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: { match() { return Promise.reject(new Error('Cache match denied')); } } } });
    assert.equal((await route.GET(request)).status, 200);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldCache) Object.defineProperty(globalThis, 'caches', oldCache);
    else delete globalThis.caches;
  }
});

test('an unavailable store image is not replaced by a misleading illustration', async () => {
  const route = await loadSource('../app/api/product-image/route.ts', [
    [/import gifts from "@\/data\/gifts.json";/, `const gifts = ${JSON.stringify(local)};`],
    [/import \{ env \} from "cloudflare:workers";/, 'const env = { PRODUCT_IMAGES: { async get() { return null; }, async put() {} } };'],
  ]);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 503 });
  try {
    const response = await route.GET(new Request('https://example.com/api/product-image?name=Jogo%20de%20panelas&category=Cozinha'));
    assert.equal(response.status, 404);
  } finally { globalThis.fetch = original; }
});

test('mobile dialogs do not depend on translated viewport centering', () => {
  const dialog = readFileSync(new URL('../components/ui/dialog.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.match(dialog, /fixed inset-0 z-50 m-auto/);
  assert.doesNotMatch(dialog, /translate-[xy]-\[-50%\]/);
  assert.match(styles, /\.mobile-filter-dialog \{ inset: 0 !important;[^}]*margin: 0 !important;/);
  assert.match(styles, /\.reservation-dialog \{\s*inset: auto 8px max\(8px, env\(safe-area-inset-bottom\)\) !important;/);
});
