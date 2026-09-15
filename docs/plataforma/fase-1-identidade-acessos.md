# Fase 1 — Identidade e acessos

Esta fase inicia a transformação do site isolado em uma plataforma administrável, preservando a separação entre o proprietário do produto e os responsáveis por cada evento.

## Primeiro incremento

- [x] Criar branch derivada da fundação.
- [x] Separar autorização do proprietário da plataforma e do administrador do evento.
- [x] Usar a identidade autenticada fornecida pelo Sites no servidor.
- [x] Criar modelos persistentes para usuários, sites e vínculos de acesso.
- [x] Criar a primeira versão da Central da Plataforma.
- [x] Manter o painel atual do casal sem perda de funcionalidades.
- [ ] Criar convite e gestão de novos administradores.
- [ ] Criar cadastro assistido de um novo site de evento.
- [ ] Isolar configurações, presentes e contribuições por `site_id`.
- [ ] Adicionar trilha de auditoria das mudanças administrativas.

## Papéis

| Papel | Responsabilidade |
| --- | --- |
| Proprietário da plataforma | Sites, clientes, permissões, infraestrutura e recursos estruturais |
| Administrador do evento | Conteúdo, identidade visual, presentes, Pix e acompanhamento do próprio evento |
| Convidado | Consulta pública, escolha de presentes e declaração de contribuição |

O primeiro incremento cria as tabelas `platform_users`, `event_sites` e `site_memberships` somente na homologação. As tabelas atuais do evento permanecem inalteradas até que a estratégia de isolamento por site esteja validada.
