# Fase 3 — Painel do casal

## Objetivo

Entregar uma central única para que os responsáveis pelo evento acompanhem e administrem o site sem suporte técnico. O painel preserva o isolamento por `site_id`, aplica as permissões da Fase 2 no servidor e organiza tarefas operacionais por contexto.

## Entregas

- Visão geral com indicadores de presentes, Pix, convidados e pendências.
- Gestão operacional de presentes confirmados e contribuições por Pix.
- Relação consolidada de convidados a partir das interações registradas.
- Relatórios operacionais e exportações em CSV.
- Configuração de identidade, dados do evento, páginas, fotos, planilha, Pix e aparência.
- Gestão de usuários do evento pelo responsável principal, com convites, perfis e revogação.
- Navegação clara entre painel, personalização, usuários, conta e plataforma do proprietário.

## Regras de acesso

| Área | Responsável | Administrador | Somente leitura |
| --- | --- | --- | --- |
| Visão geral, convidados e relatórios | leitura | leitura | leitura |
| Presentes e Pix | leitura e alteração | leitura e alteração | leitura |
| Conteúdo, evento, fotos e aparência | alteração | alteração | sem acesso |
| Usuários e convites do evento | alteração | sem acesso | sem acesso |
| Exportações | permitido | permitido | bloqueado |

## Critério de conclusão

A fase termina quando todas as áreas do painel podem ser acessadas pela navegação administrativa, as ações são autorizadas no servidor, convidados e relatórios refletem somente o evento atual, o responsável consegue gerenciar usuários sem entrar no painel proprietário e a suíte automatizada permanece integralmente verde.
