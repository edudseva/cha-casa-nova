# Fase 0 — Fundação e proteção

Esta fase cria as salvaguardas para evoluir o site atual para uma plataforma multiusuário sem interromper ou contaminar a produção.

## Regra central

- `main` representa a linha estável do site em uso.
- Todo desenvolvimento da plataforma começa em `plataforma/fase-0-fundacao` ou em branches derivadas dela.
- Produção e homologação não podem compartilhar URL, banco D1 físico, planilha, variáveis ou segredos.
- Mudanças de banco devem ser aditivas e testadas primeiro em homologação.
- Exclusões ou transformações irreversíveis exigem backup validado e procedimento de retorno.

## Linha de base protegida

- Repositório: `edudseva/cha-casa-nova`
- Branch estável: `main`
- Commit de origem da Fase 0: `0f351ec8c30aace234dfbb53ecdce3f817a7ca20`
- Branch de trabalho: `plataforma/fase-0-fundacao`
- Estado inicial do banco: consulte `docs/plataforma/schema-producao-baseline.md`.

## Matriz obrigatória de ambientes

| Recurso | Produção | Homologação | Regra |
| --- | --- | --- | --- |
| Branch | `main` | `plataforma/fase-0-fundacao` | Nunca publicar automaticamente a branch de trabalho sobre produção |
| URL | URL pública atual | URL exclusiva de preview/homologação | A URL pública atual permanece ativa |
| Binding lógico | `DB` | `DB` | O nome pode ser igual; o banco físico deve ser diferente |
| Banco D1 | banco atual | novo banco exclusivo | Nunca reutilizar o ID/nome do banco de produção |
| Planilha | planilha atual | cópia de testes ou nenhuma | Dados de testes não entram na planilha real |
| Segredos | conjunto de produção | conjunto exclusivo de homologação | Segredos nunca entram no Git |
| Pix | segredo real apenas no servidor | valor fictício | A chave integral nunca deve ser entregue ao navegador |

## Checklist da Fase 0

- [x] Criar branch isolada a partir da `main`.
- [x] Registrar o commit-base estável.
- [x] Documentar o esquema atual sem dados pessoais ou segredos.
- [x] Adicionar procedimento seguro de exportação do D1.
- [x] Adicionar restauração limitada à homologação.
- [x] Adicionar testes automáticos não destrutivos.
- [x] Adicionar validação de CI sem permissões de escrita e sem deploy.
- [x] Criar o ambiente de homologação com URL própria.
- [x] Criar e vincular um D1 físico exclusivo à homologação.
- [x] Configurar ambiente exclusivo com `APP_ENV=homologation`; nenhum segredo ou Pix real foi copiado.
- [ ] Executar exportação real da produção e validar integridade do arquivo.
- [ ] Restaurar a cópia exclusivamente no D1 de homologação.
- [ ] Executar testes funcionais contra homologação.
- [x] Registrar o plano de retorno antes de qualquer migração futura.

## Homologação provisionada

- URL privada: `https://cha-casa-nova-homologacao.eduardo280014.chatgpt.site`
- Aplicação server-backed com Worker e APIs.
- Binding `DB` associado a D1 exclusivo.
- Tabelas confirmadas: `catalog_cache`, `contributions`, `pix_config`, `reservations` e `site_config`.
- Variável de identificação: `APP_ENV=homologation`.
- Conta proprietária incluída na lista administrativa da homologação; o endereço não é versionado no Git.
- Segredos e chave Pix de produção: ausentes.

## Produção identificada sem alteração

- Projeto Sites: `Chá de Casa Nova`.
- URL pública preservada: `https://cha.evametodo.com.br`.
- Projeto e banco físicos distintos da homologação.
- Binding de produção confirmado em modo somente leitura: `DB`.
- Tabelas de produção confirmadas em modo somente leitura: `catalog_cache`, `contributions` e `reservations`.
- Nenhuma variável, versão, domínio, tabela ou registro de produção foi modificado durante a Fase 0.

## Backup

Pré-requisitos: autenticação válida do Wrangler no ambiente autorizado e nome explícito do banco.

```bash
npm run db:backup -- --database NOME_DO_BANCO --output backups/producao-AAAA-MM-DD.sql
```

O comando apenas exporta dados, recusa sobrescrever um arquivo existente e gera um arquivo `.sha256` para conferência de integridade. A pasta `backups/` é ignorada pelo Git.

### Estado da execução real

A exportação real continua pendente porque o ambiente de execução atual não possui uma sessão autenticada do Wrangler. O conector Sites permite confirmar o projeto, o binding e as tabelas em modo somente leitura, mas não fornece exportação SQL nem restauração D1. Para preservar a integridade e a privacidade dos dados, não será montado um pseudo-backup a partir de páginas de registros.

Assim que o Wrangler estiver autenticado no ambiente autorizado, execute o comando acima informando explicitamente o banco de produção. Não inclua o arquivo SQL ou seu conteúdo em commits, logs públicos ou mensagens.

## Restauração de homologação

Antes de restaurar, confirme que o banco informado é o D1 exclusivo de homologação. O script recusa qualquer outro ambiente.

```bash
npm run db:restore:homologation -- \
  --environment homologation \
  --database NOME_DO_D1_DE_HOMOLOGACAO \
  --file backups/producao-AAAA-MM-DD.sql \
  --confirm RESTORE_HOMOLOGATION
```

Se existir o arquivo `.sha256` correspondente, sua integridade será verificada antes da execução.

## Procedimento de retorno

1. Interromper novas publicações da plataforma.
2. Preservar os logs e identificar o último commit homologado.
3. Reapontar a homologação para o commit anterior estável.
4. Se o problema envolver dados, não executar comandos corretivos no banco de produção.
5. Restaurar somente o D1 de homologação a partir do último backup validado.
6. Reexecutar os testes automatizados e funcionais.
7. Documentar causa, impacto e correção antes de uma nova tentativa.

## Critério de conclusão

A Fase 0 termina quando a homologação estiver acessível em URL própria, usando banco, planilha, variáveis e segredos exclusivos; o backup tiver sido exportado e validado; a restauração tiver sido comprovada apenas em homologação; e todos os testes estiverem verdes. Até lá, nenhuma migração da plataforma deve alcançar a `main`.
