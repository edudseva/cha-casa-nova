import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort();
  for (const filename of migrations) database.exec(read(`drizzle/${filename}`).replaceAll("--> statement-breakpoint", ""));
  database.exec("PRAGMA foreign_keys = ON");
  return database;
}

test("a migração da Fase 5 preserva o banco anterior e restringe vínculos a entidades existentes", () => {
  const db = migratedDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('platform_clients','platform_plans','site_templates','site_commercial_settings','site_domains','platform_support_sessions','platform_data_exports','site_deletion_requests')").all();
  assert.equal(tables.length, 8);
  db.prepare("INSERT INTO platform_users (id,email) VALUES ('owner','owner@example.com')").run();
  db.prepare("INSERT INTO event_sites (id,slug,name,created_by) VALUES ('site-a','site-a','Evento A','owner')").run();
  db.prepare("INSERT INTO platform_clients (id,name,email) VALUES ('client-a','Cliente A','client@example.com')").run();
  db.prepare("INSERT INTO platform_plans (id,code,name) VALUES ('plan-a','essencial','Essencial')").run();
  db.prepare("INSERT INTO site_templates (id,code,name) VALUES ('template-a','botanico','Botânico')").run();
  db.prepare("INSERT INTO site_commercial_settings (site_id,client_id,plan_id,template_id) VALUES ('site-a','client-a','plan-a','template-a')").run();
  assert.throws(() => db.prepare("INSERT INTO site_domains (site_id,hostname) VALUES ('missing','evento.exemplo.com.br')").run(), /FOREIGN KEY/);
  db.prepare("INSERT INTO site_domains (site_id,hostname) VALUES ('site-a','evento.exemplo.com.br')").run();
  assert.throws(() => db.prepare("INSERT INTO site_domains (site_id,hostname) VALUES ('site-a','evento.exemplo.com.br')").run(), /UNIQUE/);
  db.prepare("INSERT INTO site_config (site_id,payload) VALUES ('site-a',?)").run(JSON.stringify({ photoGallery: [{ src: "/a.jpg" }] }));
  db.prepare("INSERT INTO catalog_cache (site_id,payload) VALUES ('site-a',?)").run(JSON.stringify([{ id: "presente-1" }]));
  const source = read("lib/platform-owner.ts");
  const query = source.match(/env\.DB\.prepare\(`(SELECT s\.id[\s\S]*?ORDER BY CASE s\.status[\s\S]*?)`\)/)?.[1];
  assert.ok(query, "Consulta do portfólio não encontrada");
  const rows = db.prepare(query).all();
  assert.equal(rows[0].client_name, "Cliente A");
  assert.equal(rows[0].gift_count, 1);
  assert.equal(rows[0].gallery_count, 1);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  db.close();
});

test("operações sensíveis exigem proprietário e o fluxo de exclusão protege a homologação", () => {
  const operation = read("app/api/plataforma/operacoes/route.ts");
  const exportRoute = read("app/api/plataforma/exportar/route.ts");
  assert.match(operation, /requirePlatformOwnerApi\(\)/);
  assert.match(exportRoute, /requirePlatformOwnerApi\(\)/);
  assert.match(operation, /siteId === CURRENT_SITE_ID/);
  assert.match(operation, /scheduled_for <= CURRENT_TIMESTAMP/);
  assert.match(operation, /created_at >=\s*\(SELECT created_at FROM site_deletion_requests/);
  assert.match(operation, /scope, expires_at\)\s*VALUES \(\?, \?, \?, \?, \?, 'read_only', datetime\('now', '\+30 minutes'\)\)/);
  assert.doesNotMatch(exportRoute, /SELECT\s+pix_key|pix_key\s*,/);
});
