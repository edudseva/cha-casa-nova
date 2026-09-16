import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);
const script = new URL("../scripts/phase7-rehearse.mjs", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("ensaio offline preserva IDs, estado de presentes, valores e texto com apóstrofo; recusa backup adulterado", () => {
  // The tool only accepts an ignored backups/ directory of its own checkout.
  const backups = new URL("../backups/", import.meta.url);
  mkdirSync(backups, { recursive: true });
  const prefix = `phase7-synthetic-${process.pid}-${Date.now()}`;
  const source = new URL(`${prefix}.sql`, backups);
  const output = new URL(`${prefix}-import.sql`, backups);
  const after = new URL(`${prefix}-after.sql`, backups);
  try {
    const fixture = [0, 1, 2].map((n) => {
      const names = ["0000_old_ser_duncan", "0001_lean_tony_stark", "0002_ambitious_paper_doll"];
      return read(`drizzle/${names[n]}.sql`).replaceAll("--> statement-breakpoint", "");
    }).join("\n") + `
      INSERT INTO reservations (id, gift_id, guest_name, guest_contact, delivery_choice, order_reference, message, status, created_at)
      VALUES (23, 'presente-1', 'D''Ávila', '', 'levar', '', 'Tudo certo', 'purchased', '2026-09-01 10:00:00');
      INSERT INTO contributions (id, guest_name, guest_contact, amount_cents, transaction_reference, message, payment_status, created_at)
      VALUES (91, 'Convidado', '', 12500, '', '', 'declared', '2026-09-02 10:00:00');
      INSERT INTO catalog_cache (id, payload, synced_at) VALUES (1, '[{"id":"presente-1"}]', '2026-09-02 10:00:00');`;
    writeFileSync(source, fixture, { mode: 0o600 });
    writeFileSync(`${source.pathname}.sha256`, `${createHash("sha256").update(fixture).digest("hex")}  ${source.pathname}\n`, { mode: 0o600 });
    const result = spawnSync(process.execPath, [script.pathname, "--source", source.pathname, "--output", output.pathname], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.records, { reservations: 1, contributions: 1, catalog_cache: 1 });
    assert.equal(report.contributionCents, 12500);
    assert.equal(report.passed, true);
    assert.equal(report.legacyCompatibility, true);
    assert.deepEqual(report.upgradeComparisons, { reservations: 0, contributions: 0, catalog_cache: 0 });
    const sql = readFileSync(output, "utf8");
    assert.equal(readFileSync(`${output.pathname}.sha256`, "utf8").slice(0, 64), createHash("sha256").update(sql).digest("hex"));
    assert.match(sql, /D''Ávila/);
    assert.match(sql, /cha-casa-nova-homologacao/);
    assert.doesNotMatch(sql, /DELETE|DROP TABLE/);

    const migrations = readdirSync(new URL("../drizzle/", import.meta.url))
      .filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort()
      .map((name) => read(`drizzle/${name}`)).join("\n").replaceAll("--> statement-breakpoint", "");
    const compare = (dump) => {
      writeFileSync(after, dump, { mode: 0o600 });
      writeFileSync(`${after.pathname}.sha256`, `${createHash("sha256").update(dump).digest("hex")}  ${after.pathname}\n`, { mode: 0o600 });
      return spawnSync(process.execPath, [script.pathname, "--source", source.pathname, "--compare", after.pathname], { cwd: root, encoding: "utf8" });
    };
    const copied = compare(`${migrations}\n${sql}`);
    assert.equal(copied.status, 0, copied.stderr);
    assert.deepEqual(JSON.parse(copied.stdout).comparisons, { reservations: 0, contributions: 0, catalog_cache: 0 });
    const changedAmount = compare(`${migrations}\n${sql}\nUPDATE contributions SET amount_cents = 12501 WHERE id = 91;`);
    assert.notEqual(changedAmount.status, 0);
    assert.equal(JSON.parse(changedAmount.stdout).comparisons.contributions, 1);
    const wrongSite = compare(`${migrations}\n${sql}\nUPDATE reservations SET site_id = 'outro-site' WHERE id = 23;`);
    assert.notEqual(wrongSite.status, 0);
    assert.match(wrongSite.stderr, /outro site/);

    writeFileSync(source, `${fixture}\n-- adulterado`);
    const corrupted = spawnSync(process.execPath, [script.pathname, "--source", source.pathname], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
    assert.notEqual(corrupted.status, 0);
    assert.match(corrupted.stderr, /Integridade SHA-256/);
  } finally {
    for (const file of [source.pathname, `${source.pathname}.sha256`, output.pathname, `${output.pathname}.sha256`, after.pathname, `${after.pathname}.sha256`]) rmSync(file, { force: true });
  }
});

test("restauração remota exige correspondência do ID físico de homologação", () => {
  const backups = new URL("../backups/", import.meta.url);
  const bin = new URL(`phase7-bin-${process.pid}/`, backups);
  mkdirSync(bin, { recursive: true });
  const name = `phase7-restore-${process.pid}.sql`;
  const file = new URL(name, backups);
  const hash = new URL(`${name}.sha256`, backups);
  const npx = new URL("npx", bin);
  const productionId = "11111111-1111-1111-1111-111111111111";
  const stagingId = "22222222-2222-2222-2222-222222222222";
  const sql = "SELECT 1;\n";
  try {
    writeFileSync(npx, `#!/bin/sh\nif [ "$1 $2 $3" = "wrangler d1 list" ]; then printf '%s' '[{"name":"prod-db","uuid":"${productionId}"},{"name":"stage-db","uuid":"${stagingId}"}]'; exit 0; fi\nexit 93\n`);
    chmodSync(npx, 0o700);
    writeFileSync(file, sql);
    writeFileSync(hash, `${createHash("sha256").update(sql).digest("hex")}  ${file.pathname}\n`);
    const env = { ...process.env, PATH: `${bin.pathname}:${process.env.PATH}`, PRODUCTION_D1_ID: productionId, HOMOLOGATION_D1_ID: stagingId };
    const command = ["scripts/d1-restore-homologation.sh", "--environment", "homologation", "--database", "prod-db", "--file", file.pathname, "--confirm", "RESTORE_HOMOLOGATION"];
    const result = spawnSync("bash", command, { cwd: new URL("../", import.meta.url), env, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /D1 físico autorizado/);
    assert.doesNotMatch(result.stdout, /Restaurando/);
  } finally {
    for (const path of [file.pathname, hash.pathname]) rmSync(path, { force: true });
    rmSync(bin.pathname, { recursive: true, force: true });
  }
});
