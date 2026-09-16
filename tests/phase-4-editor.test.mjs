import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("rascunhos e versões permanecem isolados por site e usuário", () => {
  const schema = read("db/schema.ts");
  const migration = read("drizzle/0008_neat_wild_child.sql");
  assert.match(schema, /sqliteTable\("site_config_drafts"/);
  assert.match(schema, /idx_site_config_drafts_site_user/);
  assert.match(schema, /sqliteTable\("site_config_versions"/);
  assert.match(migration, /FOREIGN KEY \(`site_id`\) REFERENCES `event_sites`/);
  assert.match(migration, /UNIQUE INDEX `idx_site_config_drafts_site_user`/);
});

test("autosave não publica e não envia a chave Pix", () => {
  const editor = read("app/admin/personalizacao/personalization-form.tsx");
  const api = read("app/api/admin/editor/route.ts");
  assert.match(editor, /action: "draft", config: preparedConfig, pix/);
  assert.doesNotMatch(editor, /action: "draft"[^\n]+pixKey/);
  assert.match(api, /action === "draft"/);
  assert.match(api, /JSON\.stringify\(pixDraft\)/);
  assert.match(api, /action: "site\.configuration_published"/);
});

test("publicação exige validação e cria uma versão auditável", () => {
  const api = read("app/api/admin/editor/route.ts");
  const validation = read("lib/site-config-validation.ts");
  assert.match(api, /requireAdminApi\("event\.settings\.edit"\)/);
  assert.match(api, /errors\.length/);
  assert.match(api, /INSERT INTO site_config_versions/);
  assert.match(validation, /Google Sheets/);
  assert.match(validation, /Configure a chave e o nome do favorecido/);
});

test("prévia e restauração nunca substituem o site diretamente", () => {
  const preview = read("app/admin/previa/page.tsx");
  const api = read("app/api/admin/editor/route.ts");
  assert.match(preview, /requireAdminPageAccess\("event\.settings\.edit"/);
  assert.match(api, /site\.version_restored_to_draft/);
  assert.match(api, /INSERT INTO site_config_drafts/);
  assert.doesNotMatch(api, /action === "restore"[\s\S]{0,900}saveSiteConfig/);
});

test("editor oferece autosave, desfazer, prévia, ajuda e histórico", () => {
  const editor = read("app/admin/personalizacao/personalization-form.tsx");
  for (const term of ["Salvando rascunho", "Desfazer", "Refazer", "Pré-visualizar", "Publicar alterações", "Histórico e recuperação", "Edite com segurança"]) {
    assert.match(editor, new RegExp(term));
  }
});
