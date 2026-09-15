# Fase 1 — Identidade e acessos

Esta fase inicia a transformação do site isolado em uma plataforma administrável, preservando a separação entre o proprietário do produto e os responsáveis por cada evento.

## Primeiro incremento

- [x] Criar branch derivada da fundação.
- [x] Separar autorização do proprietário da plataforma e do administrador do evento.
- [x] Usar a identidade autenticada fornecida pelo Sites no servidor.
- [x] Criar modelos persistentes para usuários, sites e vínculos de acesso.
- [x] Criar a primeira versão da Central da Plataforma.
- [x] Manter o painel atual do casal sem perda de funcionalidades.
- [x] Criar convite e gestão de novos administradores.
- [x] Criar cadastro assistido de um novo site de evento.
- [x] Isolar configurações, presentes e contribuições por `site_id`.
- [x] Adicionar trilha de auditoria das mudanças administrativas.

## Papéis

| Papel | Responsabilidade |
| --- | --- |
| Proprietário da plataforma | Sites, clientes, permissões, infraestrutura e recursos estruturais |
| Administrador do evento | Conteúdo, identidade visual, presentes, Pix e acompanhamento do próprio evento |
| Convidado | Consulta pública, escolha de presentes e declaração de contribuição |

O primeiro incremento criou as tabelas `platform_users`, `event_sites`, `site_memberships`, `site_invitations` e `audit_logs` somente na homologação. As configurações, o cache do catálogo, os presentes reservados e as contribuições Pix agora são delimitados por `site_id`; o mesmo item pode existir em eventos diferentes sem colisão.

## Conclusão

A Fase 1 foi concluída em homologação em 15 de setembro de 2026. A validação aplica todas as migrações sobre um banco vazio, comprova a separação de registros entre dois sites e verifica que mudanças administrativas relevantes geram eventos de auditoria. A produção e o domínio `cha.evametodo.com.br` permanecem sem alterações.
