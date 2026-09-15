import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("gera os artefatos públicos e administrativos esperados", () => {
  const clientManifest = JSON.parse(read("dist/client/.vite/manifest.json"));
  const serverManifest = JSON.parse(read("dist/server/.vite/manifest.json"));

  assert.ok(clientManifest["app/gift-catalog-v2.tsx"]);
  assert.ok(clientManifest["app/admin/admin-dashboard.tsx"]);
  assert.ok(clientManifest["app/admin/personalizacao/personalization-form.tsx"]);
  assert.ok(serverManifest["virtual:cloudflare/worker-entry"]);
});

test("preserva os cabeçalhos de segurança no Worker compilado", () => {
  const worker = read("dist/server/index.js");
  assert.match(worker, /Strict-Transport-Security/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /frame-ancestors 'none'/);
});
