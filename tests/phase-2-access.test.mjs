import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("permissões do evento são centralizadas e distinguem leitura de mutação", () => {
  const access = read("lib/event-access.ts");
  assert.match(access, /export type EventRole = "owner" \| "editor" \| "viewer"/);
  assert.match(access, /viewer: new Set\(\["event\.view"\]\)/);
  assert.match(access, /requireEventApi/);
  assert.match(access, /m\.status = 'active'/);
  assert.match(access, /Seu perfil não permite esta operação/);
});

test("convites exigem aceite explícito do e-mail autenticado", () => {
  const legacy = read("lib/admin-auth.ts");
  const invitations = read("app/api/conta/convites/route.ts");
  assert.doesNotMatch(legacy, /UPDATE site_invitations[\s\S]*status = 'accepted'/);
  assert.match(invitations, /lower\(email\) = \?/);
  assert.match(invitations, /expires_at >= CURRENT_TIMESTAMP/);
  assert.match(invitations, /action === "decline"/);
  assert.match(invitations, /invitation\.accepted/);
  assert.match(invitations, /invitation\.declined/);
});

test("cada API administrativa solicita a permissão adequada", () => {
  assert.match(read("app/api/admin/config/route.ts"), /requireAdminApi\("event\.settings\.edit"\)/);
  assert.match(read("app/api/admin/export/route.ts"), /requireAdminApi\("reports\.export"\)/);
  const admin = read("app/api/admin/route.ts");
  assert.match(admin, /roleHasPermission\(auth\.access\.role, "gifts\.manage"\)/);
  assert.match(admin, /roleHasPermission\(auth\.access\.role, "pix\.manage"\)/);
});

test("gestão de membros protege o responsável principal e registra auditoria", () => {
  const members = read("app/api/plataforma/membros/route.ts");
  assert.match(members, /new Set\(\["editor", "viewer"\]\)/);
  assert.match(members, /membership\.role === "owner"/);
  assert.match(members, /membership\.role_updated/);
  assert.match(members, /membership\.revoked/);
});

test("área da conta expõe sessão e acessos sem armazenar senha", () => {
  const page = read("app/conta/page.tsx");
  const panel = read("app/conta/account-access-panel.tsx");
  assert.match(page, /requireChatGPTUser\("\/conta"\)/);
  assert.match(page, /chatGPTSignOutPath/);
  assert.match(panel, /\/api\/conta\/convites/);
  assert.doesNotMatch(`${page}\n${panel}`, /password|senha/i);
});
