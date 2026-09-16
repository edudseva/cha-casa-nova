import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("painel do casal reúne operação, convidados e relatórios", () => {
  const dashboard = read("app/admin/admin-dashboard.tsx");
  for (const section of ["Presentes", "Pix", "Convidados", "Relatórios"]) assert.match(dashboard, new RegExp(section));
  assert.match(dashboard, /admin-workspace-nav/);
  assert.match(dashboard, /\/api\/admin\/export\?type=convidados/);
});

test("responsável gerencia usuários pelo painel do evento", () => {
  assert.equal(existsSync(new URL("app/admin/usuarios/page.tsx", root)), true);
  const page = read("app/admin/usuarios/page.tsx");
  const route = read("app/api/admin/membros/route.ts");
  const access = read("lib/event-access.ts");
  assert.match(page, /requireAdminPageAccess\("members\.manage"/);
  assert.match(route, /requireAdminApi\("members\.manage"\)/);
  assert.match(route, /membership\.role === "owner"/);
  assert.match(access, /owner: new Set\([^\n]*"members\.manage"/);
  assert.doesNotMatch(access, /editor: new Set\([^\n]*"members\.manage"/);
});

test("galeria pode ser alterada sem editar o código", () => {
  const form = read("app/admin/personalizacao/personalization-form.tsx");
  const config = read("lib/runtime-config.ts");
  const photos = read("app/fotos/page.tsx");
  assert.match(form, /Galeria de fotos/);
  assert.match(config, /input\.photoGallery/);
  assert.match(photos, /config\.photoGallery/);
});

test("relatórios e dados permanecem isolados pelo site atual", () => {
  const admin = read("app/api/admin/route.ts");
  const exportRoute = read("app/api/admin/export/route.ts");
  assert.match(admin, /WHERE site_id = \?/);
  assert.match(exportRoute, /WHERE site_id = \?/);
  assert.match(exportRoute, /type === "convidados"/);
});

test("portão final inclui inspeção visual completa", () => {
  const plan = read("docs/plataforma/plano-mestre.md");
  for (const term of ["todos os botões", "quebra", "truncamento", "bordas", "200% de zoom", "vazamentos horizontais"]) {
    assert.match(plan, new RegExp(term, "i"));
  }
});
