#!/usr/bin/env node
// Read-only source comparison; reports field names and asset paths, never values.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const candidate = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [flag, sourcePath, shaFlag, expectedSha] = process.argv.slice(2);
if (flag !== "--production-source" || shaFlag !== "--expected-commit" || !/^[0-9a-f]{40}$/i.test(expectedSha || "")) {
  console.error("Uso: node scripts/phase7-compare-source.mjs --production-source DIRETORIO --expected-commit SHA_DA_VERSAO_PUBLICADA");
  process.exit(64);
}

function digest(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const pathname = join(root, entry.name);
    return entry.isDirectory() ? files(pathname) : entry.isFile() ? [pathname] : [];
  });
}

try {
  const source = resolve(sourcePath);
  const head = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (head !== expectedSha.toLowerCase()) throw new Error("A origem não corresponde à versão de produção informada.");
  const original = JSON.parse(readFileSync(join(source, "data/site-config.json"), "utf8"));
  const proposed = JSON.parse(readFileSync(join(candidate, "data/site-config.json"), "utf8"));
  const changedFields = Object.keys(original).filter((key) => JSON.stringify(original[key]) !== JSON.stringify(proposed[key]));
  const productionPublic = join(source, "public");
  const missingAssets = [];
  const changedAssets = [];
  for (const asset of files(productionPublic)) {
    const name = relative(productionPublic, asset);
    const target = join(candidate, "public", name);
    if (!existsSync(target) || !statSync(target).isFile()) missingAssets.push(name);
    else if (digest(asset) !== digest(target)) changedAssets.push(name);
  }
  const catalogEqual = digest(join(source, "data/gifts.json")) === digest(join(candidate, "data/gifts.json"));
  const report = { publishedCommit: head, sharedFieldsChecked: Object.keys(original).length,
    changedFields, productionAssetsChecked: files(productionPublic).length, missingAssets, changedAssets,
    bundledCatalogEqual: catalogEqual, passed: !changedFields.length && !missingAssets.length && !changedAssets.length && catalogEqual };
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
} catch (error) { console.error(`Conferência recusada: ${error.message}`); process.exitCode = 1; }
