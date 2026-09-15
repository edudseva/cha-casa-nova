# Baseline do banco de produção

Registro estrutural sem dados, credenciais, IDs de banco ou segredos. A referência corresponde ao commit-base `0f351ec8c30aace234dfbb53ecdce3f817a7ca20`.

## Tecnologia e vínculo

- Banco: SQLite no Cloudflare D1.
- ORM: Drizzle ORM.
- Binding lógico da aplicação: `DB`.
- Definição canônica: `db/schema.ts`.
- Histórico versionado: `drizzle/0000_old_ser_duncan.sql` a `drizzle/0002_ambitious_paper_doll.sql`.

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

## Regra para próximas migrações

Novas migrações devem preservar essas tabelas e dados. Alterações destrutivas, renomeações, recriações de tabela ou remoção de colunas exigem backup validado, ensaio no D1 exclusivo de homologação, verificação de contagens e plano de retorno antes de qualquer avaliação para produção.
