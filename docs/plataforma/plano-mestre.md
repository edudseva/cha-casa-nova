# Plano Mestre — Plataforma de sites para eventos

Este documento é a referência de sequência, escopo e critérios de avanço da plataforma. A produção atual permanece protegida até a migração controlada da Fase 7.

| Fase | Objetivo | Situação |
| --- | --- | --- |
| 0 — Fundação e proteção da produção | Isolar homologação, banco, variáveis e publicação; preparar backup, restauração e retorno seguro. | Concluída com bloqueios externos documentados |
| 1 — Base multiusuário | Estruturar usuários, sites, vínculos, papéis, convites, `site_id` e auditoria. | Concluída em homologação |
| 2 — Autenticação e autorização | Consolidar login, sessões, recuperação, perfis, convites e políticas de acesso. | Concluída em homologação |
| 3 — Painel do casal | Permitir administrar conteúdo, evento, aparência, presentes, Pix, fotos, convidados, relatórios e usuários sem suporte técnico. | Concluída em homologação |
| 4 — Experiência de edição | Implementar salvamento automático, rascunho, publicação, prévia, versões, desfazer, validação e ajuda contextual. | Concluída em homologação |
| 5 — Painel do proprietário | Gerenciar clientes, sites, modelos, planos, limites, domínios, suporte auditado, saúde, exportação e exclusão. | Concluída em homologação; integrações externas documentadas |
| 6 — Produto comercial | Preparar página comercial, teste, cobrança, cupons, termos, privacidade, cancelamento, monitoramento e suporte. | Implementada em homologação privada; ativação comercial depende de integração e revisão jurídica |
| 7 — Migração do site atual | Copiar e conferir dados, testar, sincronizar, trocar de forma controlada, monitorar e manter rollback. | Preparação e ensaio offline implementados; backup real e corte pendentes |
| 8 — Segurança, conformidade e prontidão final | Auditar toda a solução, corrigir riscos e comprovar que a plataforma está pronta para operação comercial. | Planejada |

## Fase 8 — Segurança, conformidade e prontidão final

Esta fase será executada depois da migração controlada e antes da liberação comercial definitiva. Ela não substitui as práticas de segurança aplicadas durante o desenvolvimento; funciona como uma verificação integral e um portão formal de lançamento.

### Escopo obrigatório

- Modelagem de ameaças e inventário de dados, integrações, superfícies públicas e operações privilegiadas.
- Revisão de autenticação, autorização no servidor, menor privilégio, expiração de convites e isolamento entre sites.
- Testes de separação entre clientes para impedir leitura ou alteração cruzada de configurações, presentes, Pix, convidados e relatórios.
- Verificação baseada no OWASP Top 10 e no OWASP ASVS, cobrindo injeção, XSS, CSRF, SSRF, controle de acesso, validação de entradas, limites de requisição e abuso.
- Proteção de chaves Pix, segredos, variáveis, logs e dados pessoais; nenhum segredo poderá aparecer no cliente, em exportações ou no histórico do repositório.
- Análise de dependências, vulnerabilidades conhecidas, configuração do Worker, cabeçalhos de segurança e política de conteúdo.
- Revisão de privacidade e LGPD: finalidade, minimização, retenção, exportação, correção, exclusão e registro de consentimentos quando aplicável.
- Teste completo de backup, integridade, restauração em ambiente isolado e rollback de aplicação e banco.
- Monitoramento, alertas, trilha de auditoria, plano de resposta a incidentes e definição de responsáveis.
- Verificação final de acessibilidade, desempenho, responsividade, estados de erro e boas práticas operacionais.
- Inspeção visual completa, em desktop e mobile, de todos os botões e demais controles: tamanho, alinhamento, espaçamento, contraste, estados de foco, carregamento, desabilitado e retorno da ação.
- Conferência de enquadramento, quebra, truncamento e ampliação de todos os textos, títulos, rótulos, tabelas, cartões, modais e mensagens, sem sobreposição ou corte em 200% de zoom.
- Revisão sistemática de bordas, raios, divisórias, sombras, recortes de imagens e alinhamento entre componentes, eliminando inconsistências e vazamentos horizontais.

### Critério de conclusão

A liberação comercial somente poderá ocorrer quando não houver vulnerabilidades críticas ou altas abertas; riscos médios estiverem corrigidos ou formalmente aceitos; o isolamento entre sites estiver comprovado; backup, restauração e rollback tiverem sido testados; e o plano de resposta a incidentes estiver documentado.

Qualquer falha nesse portão — inclusive botão sem funcionamento, texto cortado, borda desalinhada ou componente fora do enquadramento — mantém a plataforma em homologação até a correção e a repetição dos testes afetados.
