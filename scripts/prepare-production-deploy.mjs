#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const databaseId = process.argv[2];

if (!databaseId) {
  console.error("Uso: node scripts/prepare-production-deploy.mjs <database_id>");
  process.exit(1);
}

const wranglerPath = resolve("dist/server/wrangler.json");

if (!existsSync(wranglerPath)) {
  console.error(`Arquivo nao encontrado: ${wranglerPath}`);
  console.error("Rode primeiro: npx vinext build");
  process.exit(1);
}

const config = JSON.parse(readFileSync(wranglerPath, "utf8"));

config.name = "cha-casa-nova-producao";
config.topLevelName = "cha-casa-nova-producao";

// Cloudflare Access identity verification for administrative routes.
// These identifiers are configuration values, not authentication secrets.
config.vars = {
  ...(config.vars ?? {}),
  CF_ACCESS_ISSUER: "https://late-dawn-b8a0.cloudflareaccess.com",
  CF_ACCESS_AUDS: "8bc6c2ba27ed8c55f11c077083dbf8b8e743875190b636b01ca0669323466e1b",
};

const migrationsDir = "../.openai/drizzle";
const databaseName = "cha-casa-nova-producao";

if (!config.d1_databases || config.d1_databases.length === 0) {
  config.d1_databases = [{ binding: "DB", database_name: databaseName, database_id: databaseId, migrations_dir: migrationsDir }];
} else {
  config.d1_databases[0].database_name = databaseName;
  config.d1_databases[0].database_id = databaseId;
  config.d1_databases[0].migrations_dir = migrationsDir;
}

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));

console.log("Pronto. dist/server/wrangler.json atualizado:");
console.log(`  name: ${config.name}`);
console.log(`  database_name: ${databaseName}`);
console.log(`  database_id: ${databaseId}`);
