import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("consultas operacionais sempre delimitam o site atual", () => {
  const files = [
    "app/api/reservations/route.ts",
    "app/api/contributions/route.ts",
    "app/api/admin/route.ts",
    "app/api/admin/export/route.ts",
    "lib/catalog.ts",
    "lib/runtime-config.ts",
    "lib/platform-workspace.ts",
  ];
  const combined = files.map(read).join("\n");

  for (const table of ["reservations", "contributions", "catalog_cache", "site_config", "pix_config"]) {
    const operations = combined.match(new RegExp(`(?:FROM|INTO|UPDATE) ${table}[^\"\n]*`, "g")) ?? [];
    assert.ok(operations.length > 0, `${table} sem operações verificadas`);
    for (const operation of operations) assert.match(operation, /site_id/, `${operation} não delimita site_id`);
  }
});

test("migrações preservam dados atuais e permitem o mesmo presente em sites diferentes", () => {
  const database = new DatabaseSync(":memory:");
  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrations = readdirSync(migrationDirectory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  for (const migration of migrations) {
    const sql = readFileSync(new URL(migration, migrationDirectory), "utf8")
      .replaceAll("--> statement-breakpoint", "");
    database.exec(sql);
  }

  database.prepare("INSERT INTO reservations (site_id, gift_id, guest_name) VALUES (?, ?, ?)")
    .run("site-a", "cafeteira", "Ana");
  database.prepare("INSERT INTO reservations (site_id, gift_id, guest_name) VALUES (?, ?, ?)")
    .run("site-b", "cafeteira", "Bia");
  database.prepare("INSERT INTO contributions (site_id, guest_name, amount_cents) VALUES (?, ?, ?)")
    .run("site-a", "Carlos", 5000);
  database.prepare("INSERT INTO contributions (site_id, guest_name, amount_cents) VALUES (?, ?, ?)")
    .run("site-b", "Daniel", 7500);
  database.prepare("INSERT INTO site_config (site_id, payload) VALUES (?, ?)").run("site-a", '{"title":"A"}');
  database.prepare("INSERT INTO site_config (site_id, payload) VALUES (?, ?)").run("site-b", '{"title":"B"}');
  database.prepare(`INSERT INTO audit_logs
    (site_id, actor_user_id, actor_email, action, entity_type) VALUES (?, ?, ?, ?, ?)`)
    .run("site-a", "owner-a", "owner@example.com", "site.configuration_updated", "site");

  assert.equal(database.prepare("SELECT guest_name FROM reservations WHERE site_id = ?").get("site-a").guest_name, "Ana");
  assert.equal(database.prepare("SELECT guest_name FROM contributions WHERE site_id = ?").get("site-b").guest_name, "Daniel");
  assert.equal(database.prepare("SELECT payload FROM site_config WHERE site_id = ?").get("site-b").payload, '{"title":"B"}');
  assert.equal(database.prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE site_id = ?").get("site-b").total, 0);
  assert.throws(() => database.prepare("INSERT INTO reservations (site_id, gift_id, guest_name) VALUES (?, ?, ?)").run("site-a", "cafeteira", "Eva"), /UNIQUE/);
});

test("mudanças administrativas relevantes produzem auditoria", () => {
  const routes = [
    "app/api/admin/route.ts",
    "app/api/admin/config/route.ts",
    "app/api/plataforma/membros/route.ts",
    "app/api/plataforma/sites/route.ts",
  ].map(read).join("\n");
  assert.match(read("db/schema.ts"), /sqliteTable\("audit_logs"/);
  for (const action of ["reservation.status_updated", "contribution.status_updated", "site.configuration_updated", "invitation.created", "site.created"]) {
    assert.match(routes, new RegExp(action.replace(".", "\\.")));
  }
});
