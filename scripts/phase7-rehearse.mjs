#!/usr/bin/env node
// Offline only: reads a verified D1 export and runs migration SQL in memory.
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, openSync, writeSync, closeSync, existsSync, unlinkSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const backups = resolve(root, "backups");
const siteId = "cha-casa-nova-homologacao";
const tables = {
  reservations: ["id", "gift_id", "guest_name", "guest_contact", "delivery_choice", "order_reference", "message", "status", "created_at"],
  contributions: ["id", "guest_name", "guest_contact", "amount_cents", "transaction_reference", "message", "payment_status", "created_at"],
  catalog_cache: ["id", "payload", "synced_at"],
};

function fail(message) { throw new Error(message); }
function args() {
  const result = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const flag = process.argv[i];
    if (!["--source", "--output", "--compare"].includes(flag) || !process.argv[i + 1] || result[flag]) fail("Uso: node scripts/phase7-rehearse.mjs --source backups/producao.sql [--output backups/importacao.sql] [--compare backups/homologacao.sql]");
    result[flag] = process.argv[i + 1];
  }
  if (!result["--source"] || (result["--output"] && result["--compare"])) fail("Informe a exportação e escolha apenas uma ação: gerar cópia ou comparar.");
  return result;
}

function verifiedExport(filename) {
  const path = resolve(filename);
  if (!path.startsWith(`${backups}${sep}`) || !path.endsWith(".sql")) fail("A exportação deve ser um .sql em backups/.");
  const contents = readFileSync(path);
  const checksum = readFileSync(`${path}.sha256`, "utf8").trim().match(/^[0-9a-f]{64}/i)?.[0]?.toLowerCase();
  if (!checksum || createHash("sha256").update(contents).digest("hex") !== checksum) fail("Integridade SHA-256 do backup não conferiu.");
  if (!contents.length || contents.length > 300_000_000) fail("Arquivo vazio ou acima do limite de 300 MB.");
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(contents.toString("utf8"));
    if (db.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok") fail("Integridade SQLite não conferiu.");
    return { db, checksum };
  } catch (error) { db.close(); throw error; }
}

function rows(db, table, columns, requireLegacy) {
  const available = db.prepare(`PRAGMA table_info(${table})`).all().map((entry) => entry.name);
  if (!columns.every((column) => available.includes(column))) fail(`Tabela ${table} não corresponde ao esquema esperado.`);
  if (requireLegacy && available.includes("site_id")) fail(`A fonte ${table} já tem site_id: selecione a exportação da produção antiga.`);
  return db.prepare(`SELECT ${columns.join(", ")} FROM ${table} ORDER BY id`).all();
}

function snapshot(db, legacy) {
  const result = Object.fromEntries(Object.entries(tables).map(([table, columns]) => [table, rows(db, table, columns, legacy)]));
  for (const row of result.catalog_cache) {
    if (!Array.isArray(JSON.parse(row.payload))) fail("Catálogo armazenado não é uma lista JSON.");
  }
  if (result.catalog_cache.length > 1) fail("Há múltiplos catálogos; revise antes de importar.");
  if (!Object.values(result).some((records) => records.length)) fail("Exportação sem registros; confira a origem.");
  return result;
}

function sqlValue(value) {
  if (value === null) return "NULL";
  if (Number.isSafeInteger(value)) return String(value);
  if (typeof value !== "string" || value.includes("\0")) fail("Campo incompatível com SQL de importação.");
  return `'${value.replaceAll("'", "''")}'`;
}

function statements(data) {
  const result = ["-- Fase 7: aplicar SOMENTE em D1 novo, exclusivo e vazio de ensaio; nunca na produção."];
  for (const [table, columns] of Object.entries(tables)) {
    for (const row of data[table]) {
      result.push(`INSERT INTO ${table} (${columns.join(", ")}, site_id) VALUES (${columns.map((column) => sqlValue(row[column])).join(", ")}, ${sqlValue(siteId)});`);
    }
  }
  return `${result.join("\n")}\n`;
}

function compare(source, target) {
  const differences = {};
  for (const table of Object.keys(tables)) {
    const originals = source[table];
    const migrated = target[table];
    let changed = Math.abs(originals.length - migrated.length);
    const byId = new Map(migrated.map((row) => [row.id, row]));
    for (const record of originals) {
      const counterpart = byId.get(record.id);
      if (!counterpart || Object.keys(record).some((key) => record[key] !== counterpart[key])) changed += 1;
    }
    differences[table] = changed;
  }
  return differences;
}

// Replays the published version's D1 statements against the upgraded schema.
// The savepoint guarantees that probes cannot enter the generated import.
function verifyLegacyApplication(db) {
  const giftId = `phase7-rollback-${randomUUID()}`;
  db.exec("SAVEPOINT legacy_compatibility");
  try {
    db.prepare("SELECT payload FROM catalog_cache WHERE id = ?").get(1);
    db.prepare("SELECT gift_id, status FROM reservations WHERE status = ? ORDER BY created_at DESC").all("purchased");
    db.prepare("INSERT INTO reservations (gift_id, guest_name, guest_contact, delivery_choice, order_reference, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(giftId, "Teste de retorno", "", "casal", "", "", "purchased");
    const reservation = db.prepare("SELECT site_id, status FROM reservations WHERE gift_id = ?").get(giftId);
    if (reservation?.site_id !== siteId || reservation.status !== "purchased") fail("A versão anterior não consegue registrar reservas no site legado.");
    db.prepare("INSERT INTO contributions (guest_name, guest_contact, amount_cents, transaction_reference, message, payment_status) VALUES (?, ?, ?, ?, ?, ?)")
      .run("Teste de retorno", "", 123, "", "", "declared");
    const contribution = db.prepare("SELECT site_id, amount_cents FROM contributions WHERE id = last_insert_rowid()").get();
    if (contribution?.site_id !== siteId || contribution.amount_cents !== 123) fail("A versão anterior não consegue registrar contribuições no site legado.");
    const cache = db.prepare("SELECT id, payload FROM catalog_cache WHERE id = ?").get(1);
    if (cache) db.prepare("INSERT INTO catalog_cache (id, payload, synced_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, synced_at = CURRENT_TIMESTAMP")
      .run(1, cache.payload);
    return true;
  } finally {
    db.exec("ROLLBACK TO legacy_compatibility; RELEASE legacy_compatibility");
  }
}

function summary(data, checks, sourceSha) {
  return {
    sourceSha256: sourceSha,
    records: Object.fromEntries(Object.entries(data).map(([table, value]) => [table, value.length])),
    contributionCents: data.contributions.reduce((total, row) => total + row.amount_cents, 0),
    comparisons: checks,
    passed: Object.values(checks).every((value) => value === 0),
  };
}

function saveOutput(pathname, content) {
  const path = resolve(pathname);
  if (!path.startsWith(`${backups}${sep}`) || !path.endsWith(".sql")) fail("A saída deve ser um .sql em backups/.");
  if (existsSync(`${path}.sha256`)) fail("Arquivo de integridade já existe; saída não será sobrescrita.");
  const descriptor = openSync(path, "wx", 0o600);
  try { writeSync(descriptor, content); } finally { closeSync(descriptor); }
  try {
    const hash = createHash("sha256").update(content).digest("hex");
    const checksumFile = openSync(`${path}.sha256`, "wx", 0o600);
    try { writeSync(checksumFile, `${hash}  ${path}\n`); } finally { closeSync(checksumFile); }
  } catch (error) { unlinkSync(path); throw error; }
  return basename(path);
}

function main() {
  const options = args();
  const source = verifiedExport(options["--source"]);
  let other;
  try {
    const original = snapshot(source.db, true);
    const migrations = readdirSync(resolve(root, "drizzle")).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort();
    const legacyTables = source.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('site_config', 'pix_config')").all().length;
    if (legacyTables === 1) fail("Há apenas uma das tabelas legadas de configuração; examine o esquema manualmente.");
    // Rehearse the actual additive upgrade over a copy of the legacy database.
    for (const name of migrations.slice(legacyTables === 2 ? 4 : 3)) {
      source.db.exec(readFileSync(resolve(root, "drizzle", name), "utf8").replaceAll("--> statement-breakpoint", ""));
    }
    const upgrade = compare(original, snapshot(source.db, false));
    if (source.db.prepare("PRAGMA foreign_key_check").all().length || Object.values(upgrade).some(Boolean)) fail("A atualização no banco legado alterou registros.");
    const legacyCompatibility = verifyLegacyApplication(source.db);
    if (options["--compare"]) {
      other = verifiedExport(options["--compare"]);
      const target = snapshot(other.db, false);
      for (const table of Object.keys(tables)) {
        const badSite = other.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE site_id IS NULL OR site_id != ?`).get(siteId).count;
        if (badSite) fail(`A tabela ${table} contém registros de outro site.`);
      }
      const result = { ...summary(original, compare(original, target), source.checksum), upgradeComparisons: upgrade, legacyCompatibility };
      console.log(JSON.stringify(result));
      if (!result.passed) process.exitCode = 1;
      return;
    }

    const rehearsal = new DatabaseSync(":memory:");
    try {
      for (const name of migrations) rehearsal.exec(readFileSync(resolve(root, "drizzle", name), "utf8").replaceAll("--> statement-breakpoint", ""));
      rehearsal.exec("PRAGMA foreign_keys = ON");
      const sql = statements(original);
      rehearsal.exec(sql);
      const result = { ...summary(original, compare(original, snapshot(rehearsal, false)), source.checksum), upgradeComparisons: upgrade, legacyCompatibility };
      if (rehearsal.prepare("PRAGMA foreign_key_check").all().length || !result.passed) fail("A cópia não preservou todos os registros.");
      if (options["--output"]) result.outputFile = saveOutput(options["--output"], sql);
      console.log(JSON.stringify(result));
    } finally { rehearsal.close(); }
  } finally { source.db.close(); other?.db.close(); }
}

try { main(); } catch (error) { console.error(`Ensaio recusado: ${error.message}`); process.exitCode = 1; }
