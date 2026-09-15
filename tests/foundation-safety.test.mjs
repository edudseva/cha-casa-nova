import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("D1 usa apenas o binding lógico, sem identificar banco físico", () => {
  const hosting = JSON.parse(read(".openai/hosting.json"));
  assert.equal(hosting.d1, "DB");
  assert.equal("database_id" in hosting, false);
  assert.equal("database_name" in hosting, false);
});

test("segredos locais e backups permanecem fora do Git", () => {
  const ignore = read(".gitignore");
  const example = read(".dev.vars.example");
  assert.match(ignore, /^\.env\*/m);
  assert.match(ignore, /^\/backups\/$/m);
  assert.match(example, /PIX_KEY="sua-chave-pix"/);
  assert.doesNotMatch(example, /(?:database_id|account_id|api_token)\s*=/i);
});

test("baseline do esquema atual permanece documentada e versionada", () => {
  const schema = read("db/schema.ts");
  const baseline = read("docs/plataforma/schema-producao-baseline.md");
  for (const table of ["reservations", "contributions", "catalog_cache", "site_config", "pix_config"]) {
    assert.match(schema, new RegExp(`sqliteTable\\("${table}"`));
    assert.match(baseline, new RegExp("Tabela `" + table + "`"));
  }
  for (const migration of [
    "drizzle/0000_old_ser_duncan.sql",
    "drizzle/0001_lean_tony_stark.sql",
    "drizzle/0002_ambitious_paper_doll.sql",
    "drizzle/0003_foundation_runtime_config.sql",
  ]) {
    assert.equal(existsSync(new URL(migration, root)), true, `${migration} ausente`);
  }
});

test("backup remoto recusa sobrescrita e produz verificação de integridade", () => {
  const script = read("scripts/d1-backup.sh");
  assert.match(script, /wrangler d1 export/);
  assert.match(script, /--remote/);
  assert.match(script, /Recusado:.*já existe/);
  assert.match(script, /sha256sum/);
});

test("restauração é bloqueada fora da homologação", () => {
  const script = read("scripts/d1-restore-homologation.sh");
  assert.match(script, /environment.*homologation/);
  assert.match(script, /RESTORE_HOMOLOGATION/);
  assert.match(script, /sha256sum --check/);
  assert.match(script, /wrangler d1 execute/);
  assert.doesNotMatch(script, /ALLOW_PRODUCTION|RESTORE_PRODUCTION/);
});

test("documentação exige isolamento integral de homologação", () => {
  const guide = read("docs/plataforma/fase-0-fundacao.md");
  for (const term of ["URL", "banco D1 físico", "planilha", "variáveis", "segredos"]) {
    assert.match(guide, new RegExp(term, "i"));
  }
  assert.match(guide, /não podem compartilhar/i);
});
