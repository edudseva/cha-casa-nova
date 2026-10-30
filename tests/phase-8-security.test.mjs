import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "../lib/csv-export.ts";

test("exportação CSV impede execução de fórmula e mantém células delimitadas", () => {
  assert.equal(csvCell('=HYPERLINK("https://example.com", "Abrir")'), '"\t=HYPERLINK(""https://example.com"", ""Abrir"")"');
  assert.equal(csvCell('  @SUM(1,2)'), '"\t  @SUM(1,2)"');
  assert.equal(csvCell('＝1+2'), '"\t＝1+2"');
  assert.equal(csvCell('Ana";=1+2'), '"Ana"";=1+2"');
  assert.equal(csvCell('linha\r\n=1+2'), '"linha  =1+2"');
  assert.equal(csvCell(12500), '"12500"');
});

test("admin usa somente identidade verificada do Cloudflare Access, sem login ChatGPT", () => {
  const worker = read("worker/index.ts");
  const access = read("lib/event-access.ts");
  const adminPages = [
    read("app/admin/page.tsx"),
    read("app/admin/personalizacao/page.tsx"),
    read("app/admin/previa/page.tsx"),
  ].join("\n");

  assert.match(worker, /cf-access-jwt-assertion/);
  assert.match(worker, /crypto\.subtle\.verify/);
  assert.match(worker, /CF_ACCESS_ISSUER/);
  assert.match(worker, /CF_ACCESS_AUDS/);
  assert.match(worker, /headers\.delete\("x-admin-access-email"\)/);
  assert.match(access, /x-admin-access-email/);
  assert.match(access, /Autenticação do Cloudflare Access não identificada/);
  assert.doesNotMatch(access, /getChatGPTUser|requireChatGPTUser/);
  assert.doesNotMatch(adminPages, /signin-with-chatgpt|href="\/conta"/);
});
