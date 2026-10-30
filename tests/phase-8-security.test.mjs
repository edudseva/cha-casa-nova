import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
import { csvCell } from "../lib/csv-export.ts";

test("exportação CSV impede execução de fórmula e mantém células delimitadas", () => {
  assert.equal(csvCell('=HYPERLINK("https://example.com", "Abrir")'), '"\t=HYPERLINK(""https://example.com"", ""Abrir"")"');
  assert.equal(csvCell('  @SUM(1,2)'), '"\t  @SUM(1,2)"');
  assert.equal(csvCell('＝1+2'), '"\t＝1+2"');
  assert.equal(csvCell('Ana";=1+2'), '"Ana"";=1+2"');
  assert.equal(csvCell('linha\r\n=1+2'), '"linha  =1+2"');
  assert.equal(csvCell(12500), '"12500"');
});

test("admin usa senha armazenada como Secret e sessão assinada no Worker", () => {
  const worker = read("worker/index.ts");
  const access = read("lib/event-access.ts");
  const adminPages = [
    read("app/admin/page.tsx"),
    read("app/admin/personalizacao/page.tsx"),
    read("app/admin/previa/page.tsx"),
  ].join("\n");

  assert.match(worker, /ADMIN_PANEL_PASSWORD/);
  assert.match(worker, /crypto\.subtle\.sign/);
  assert.match(worker, /constantTimeEqual/);
  assert.match(worker, /__Host-cha-casa-admin/);
  assert.match(worker, /HttpOnly; SameSite=Strict/);
  assert.match(worker, /forwardVerifiedAdminIdentity/);
  assert.match(worker, /headers\.delete\("x-admin-access-email"\)/);
  assert.match(worker, /origin/);
  assert.match(worker, /LOGIN_MAX_ATTEMPTS/);
  assert.match(access, /admin-password-session/);
  assert.match(access, /admin@cha-casa-nova\.local/);
  assert.doesNotMatch(access, /getChatGPTUser|requireChatGPTUser/);
  // The legacy JWT header is stripped; no Cloudflare Access token is read or verified.
  assert.doesNotMatch(worker, /request\.headers\.get\(["']cf-access-jwt-assertion["']\)/);
  assert.doesNotMatch(worker, /CF_ACCESS_ISSUER|CF_ACCESS_AUDS/);
  assert.doesNotMatch(adminPages, /signin-with-chatgpt|href="\/conta"/);
});

test("deploy mantém o Worker e o banco D1 de produção, sem expor senha no código", () => {
  const deployConfig = read("scripts/prepare-production-deploy.mjs");
  assert.ok(deployConfig.includes('config.name = "cha-casa-nova-producao"'));
  assert.ok(deployConfig.includes('config.topLevelName = "cha-casa-nova-producao"'));
  assert.ok(deployConfig.includes('const databaseName = "cha-casa-nova-producao"'));
  assert.ok(!deployConfig.includes("ADMIN_PANEL_PASSWORD"));
  assert.ok(!deployConfig.includes("CF_ACCESS_ISSUER"));
  assert.ok(!deployConfig.includes("CF_ACCESS_AUDS"));
});
