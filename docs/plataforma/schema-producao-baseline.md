# Baseline do banco de produção

Registro estrutural sem dados, credenciais, IDs de banco ou segredos. A referência corresponde ao commit-base `0f351ec8c30aace234dfbb53ecdce3f817a7ca20`.

## Tecnologia e vínculo

- Banco: SQLite no Cloudflare D1.
- ORM: Drizzle ORM.
- Binding lógico da aplicação: `DB`.
- Definição canônica: `db/schema.ts`.
- Histórico versionado: `drizzle/0000_old_ser_duncan.sql` a `drizzle/0003_chubby_strong_guy.sql`.

## Tabela `reservations`

| Coluna | Tipo | Restrições/padrão |
| --- | --- | --- |
| `id` | integer | chave primária, autoincremento |
| `gift_id` | text | obrigatório, único |
| `guest_name` | text | obrigatório |
| `guest_contact` | text | obrigatório, padrão vazio |
| `delivery_choice` | text | obrigatório, padrão vazio |
| `order_reference` | text | obrigatório, padrão vazio |
| `message` | text | obrigatório, padrão vazio |
| `status` | text | obrigatório, padrão `purchased` |
| `created_at` | text | obrigatório, padrão `CURRENT_TIMESTAMP` |

Índice: `reservations_gift_id_unique` sobre `gift_id`.

## Tabela `contributions`

| Coluna | Tipo | Restrições/padrão |
| --- | --- | --- |
| `id` | integer | chave primária, autoincremento |
| `guest_name` | text | obrigatório |
| `guest_contact` | text | obrigatório, padrão vazio |
| `amount_cents` | integer | obrigatório |
| `transaction_reference` | text | obrigatório, padrão vazio |
| `message` | text | obrigatório, padrão vazio |
| `payment_status` | text | obrigatório, padrão `declared` |
| `created_at` | text | obrigatório, padrão `CURRENT_TIMESTAMP` |

## Tabela `catalog_cache`

| Coluna | Tipo | Restrições/padrão |
| --- | --- | --- |
| `id` | integer | chave primária |
| `payload` | text | obrigatório |
| `synced_at` | text | obrigatório, padrão `CURRENT_TIMESTAMP` |

## Tabela `site_config`

| Coluna | Tipo | Restrições/padrão |
| --- | --- | --- |
| `id` | integer | chave primária |
| `payload` | text | obrigatório |
| `updated_at` | text | obrigatório, padrão `CURRENT_TIMESTAMP` |

## Tabela `pix_config`

| Coluna | Tipo | Restrições/padrão |
| --- | --- | --- |
| `id` | integer | chave primária |
| `pix_key` | text | obrigatório; dado sensível, somente no servidor |
| `receiver` | text | obrigatório |
| `city` | text | obrigatório |
| `enabled` | integer | obrigatório, padrão `1` |
| `updated_at` | text | obrigatório, padrão `CURRENT_TIMESTAMP` |

Essas duas tabelas já eram criadas sob demanda por `lib/runtime-config.ts`. A migração `0003` apenas registra a estrutura de forma idempotente com `CREATE TABLE IF NOT EXISTS`; ela não foi executada em produção nesta fase.

## Regra para próximas migrações

Novas migrações devem preservar essas tabelas e dados. Alterações destrutivas, renomeações, recriações de tabela ou remoção de colunas exigem backup validado, ensaio no D1 exclusivo de homologação, verificação de contagens e plano de retorno antes de qualquer avaliação para produção.
