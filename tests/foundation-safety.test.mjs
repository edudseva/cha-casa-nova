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
    "drizzle/0003_chubby_strong_guy.sql",
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

test("administração exige conta autorizada também nas APIs", () => {
  const auth = read("lib/event-access.ts");
  const adminPage = read("app/admin/page.tsx");
  const configPage = read("app/admin/personalizacao/page.tsx");
  const adminApi = read("app/api/admin/route.ts");
  const configApi = read("app/api/admin/config/route.ts");

  assert.match(auth, /ADMIN_EMAIL/);
  assert.match(auth, /configuredAdminEmails\(\)\.has/);
  assert.match(auth, /m\.status = 'active'/);
  assert.match(auth, /roleHasPermission/);
  assert.match(adminPage, /requireAdminPage/);
  assert.match(configPage, /requireAdminPage/);
  assert.match(adminApi, /requireAdminApi/);
  assert.match(configApi, /requireAdminApi/);
});

test("chave Pix não retorna para o formulário administrativo", () => {
  const runtimeConfig = read("lib/runtime-config.ts");
  const form = read("app/admin/personalizacao/personalization-form.tsx");
  const publicPixApi = read("app/api/pix/route.ts");

  assert.match(runtimeConfig, /const \{ enabled, receiver, city, hasKey \} = await loadPixConfig\(\)/);
  assert.match(runtimeConfig, /return \{ enabled, receiver, city, hasKey \};/);
  assert.match(form, /type="password"/);
  assert.match(form, /Deixe vazio para mantê-la/);
  assert.doesNotMatch(publicPixApi, /pixKey|pix_key/);
});

test("proprietário da plataforma e administrador do evento têm autorizações separadas", () => {
  const platformAccess = read("lib/platform-access.ts");
  const adminAccess = read("lib/event-access.ts");
  const platformPage = read("app/plataforma/page.tsx");

  assert.match(platformAccess, /PLATFORM_OWNER_EMAILS/);
  assert.match(adminAccess, /ADMIN_EMAILS/);
  assert.match(platformPage, /requirePlatformOwnerPage/);
  assert.doesNotMatch(platformAccess, /ADMIN_EMAILS/);
});

test("primeira fundação multi-site é aditiva", () => {
  const schema = read("db/schema.ts");
  for (const table of ["platform_users", "event_sites", "site_memberships", "site_invitations"]) {
    assert.match(schema, new RegExp(`sqliteTable\\("${table}"`));
  }
  assert.match(schema, /idx_site_memberships_site_user/);
  assert.match(schema, /idx_site_invitations_site_email/);
});

test("convites são protegidos e ativam acesso somente para o e-mail autenticado", () => {
  const route = read("app/api/plataforma/membros/route.ts");
  const acceptance = read("app/api/conta/convites/route.ts");
  assert.match(route, /requirePlatformOwnerApi/);
  assert.match(route, /sameOrigin/);
  assert.match(route, /status = 'pending'/);
  assert.match(acceptance, /getChatGPTUser/);
  assert.match(acceptance, /lower\(email\) = \?/);
  assert.match(acceptance, /expires_at >= CURRENT_TIMESTAMP/);
  assert.match(acceptance, /invitation\.accepted/);
});

test("plano mestre termina com uma fase formal de segurança", () => {
  const plan = read("docs/plataforma/plano-mestre.md");
  assert.match(plan, /Fase 8 — Segurança, conformidade e prontidão final/);
  for (const term of ["OWASP", "isolamento entre sites", "LGPD", "restauração", "incidentes"]) {
    assert.match(plan, new RegExp(term, "i"));
  }
});

test("cadastro de sites é restrito, validado e nasce somente em homologação", () => {
  const route = read("app/api/plataforma/sites/route.ts");
  const form = read("app/plataforma/platform-sites.tsx");
  assert.match(route, /requirePlatformOwnerApi/);
  assert.match(route, /sameOrigin/);
  assert.match(route, /'homologation'/);
  assert.match(route, /'draft'/);
  assert.match(route, /crypto\.randomUUID/);
  assert.match(form, /Criar estrutura em homologação/);
  assert.doesNotMatch(form, /cha\.evametodo\.com\.br/);
});

test("dados do evento têm chave de isolamento e auditoria administrativa", () => {
  const schema = read("db/schema.ts");
  for (const table of ["reservations", "contributions", "catalogCache", "siteConfig", "pixConfig"]) {
    assert.match(schema, new RegExp(`export const ${table}[\\s\\S]*?siteId: text\\("site_id"\\)`));
  }
  assert.match(schema, /idx_reservations_site_gift/);
  assert.match(schema, /sqliteTable\("audit_logs"/);
});
