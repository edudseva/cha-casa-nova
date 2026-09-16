# vinext-starter

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from `oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build and verify the rendered development-preview metadata
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Plataforma — Fase 0

A evolução multiusuário está isolada da produção na branch `plataforma/fase-0-fundacao`. As regras de separação de ambientes, baseline do D1, backup, restauração e critérios de conclusão estão em [`docs/plataforma/fase-0-fundacao.md`](docs/plataforma/fase-0-fundacao.md).

Comandos de segurança:

- `npm run test:foundation`: valida as salvaguardas sem acessar serviços externos.
- `npm run db:backup -- --database NOME --output backups/arquivo.sql`: exporta um D1 remoto sem sobrescrever arquivos.
- `npm run db:restore:homologation -- --environment homologation --database NOME --file backups/arquivo.sql --confirm RESTORE_HOMOLOGATION`: restaura somente em homologação.

## Plataforma — Fase 2

A autenticação usa a identidade segura fornecida pelo ambiente, enquanto as permissões do evento são avaliadas no servidor. A área `/conta` reúne identidade, sessão, convites e vínculos; os perfis `owner`, `editor` e `viewer` seguem a matriz documentada em [`docs/plataforma/fase-2-autenticacao-autorizacao.md`](docs/plataforma/fase-2-autenticacao-autorizacao.md).

## Plataforma — Fase 3

O painel do casal em `/admin` reúne presentes, Pix, convidados, relatórios e atalhos para conteúdo e aparência. O responsável principal gerencia convites e perfis em `/admin/usuarios`; a personalização de identidade, evento, páginas, galeria, planilha, Pix e cores permanece em `/admin/personalizacao`.

Na Fase 4, a personalização ganhou rascunho automático por usuário, validação contínua, prévia protegida em desktop e mobile, publicação explícita, desfazer/refazer e histórico restaurável. Mudanças em edição não chegam aos convidados até o comando de publicação, e a chave Pix não é incluída no autosave nem nas versões.

Detalhes: [`docs/plataforma/fase-4-experiencia-edicao.md`](docs/plataforma/fase-4-experiencia-edicao.md).

O escopo e os critérios de conclusão estão documentados em [`docs/plataforma/fase-3-painel-do-casal.md`](docs/plataforma/fase-3-painel-do-casal.md).

## Plataforma — Fase 5

O painel exclusivo do proprietário em `/plataforma` reúne clientes, sites, planos e limites, modelos, solicitações de domínios, verificação interna de saúde, suporte auditado, exportação sem chave Pix e exclusão programada com prazo e confirmação. Consulte [`docs/plataforma/fase-5-painel-proprietario.md`](docs/plataforma/fase-5-painel-proprietario.md) para o comportamento e as integrações externas pendentes.

## Plataforma — Fase 6

A apresentação `/produto` e a central exclusiva `/plataforma/comercial` permitem preparar planos, interesse em teste/contratação, cupons de simulação, suporte e cancelamento de pedidos pendentes. Não há cobranças ou ativação automática. Os critérios de ativação e os limites estão em [`docs/plataforma/fase-6-produto-comercial.md`](docs/plataforma/fase-6-produto-comercial.md).

## Plataforma — Fase 7

Ferramentas locais conferem a versão publicada de produção, protegem a escolha dos D1 físicos, ensaiam as migrações sobre exportação verificada e comparam os registros migrados sem expor convidados. A execução real do backup, o ensaio remoto e o corte do domínio seguem o roteiro e os portões de [`docs/plataforma/fase-7-migracao-controlada.md`](docs/plataforma/fase-7-migracao-controlada.md). A produção continua inalterada.
