# Fase 5 — Painel do proprietário

## Objetivo

Dar ao proprietário da plataforma uma área própria para acompanhar e administrar clientes, sites, catálogo de planos e modelos, domínios, suporte e dados, sem conceder essas funções ao administrador do evento.

## Estrutura e operação

- `/plataforma` exige login e e-mail autorizado em `PLATFORM_OWNER_EMAILS` ou `PLATFORM_OWNER_EMAIL`; `/api/plataforma/operacoes` e `/api/plataforma/exportar` repetem a autorização no servidor.
- Clientes possuem nome, e-mail e vínculo com sites; o cadastro do evento e seus membros continuam em tabelas separadas.
- Os planos têm preço interno e limites de sites por cliente, membros, presentes em cache e fotos; o painel permite ajustar esses valores. A atribuição recusa uso atual acima do plano escolhido. Convites e aceitação de acesso respeitam o limite de membros; publicação da galeria respeita o limite de fotos.
- O limite de itens serve para análise de atribuição do plano sobre o último catálogo sincronizado. O catálogo vem da planilha externa, portanto a sincronização contínua ainda não bloqueia itens excedentes. O preço interno não ativa cobrança.
- Modelos são registros de direção visual, vinculados administrativamente ao site. O vínculo ainda não aplica um tema ao site. A renderização multi-site será implementada nas próximas fases.
- Um domínio personalizado entra apenas como solicitação pendente. O painel nunca altera DNS nem ativa domínio em Cloudflare; a integração real depende de verificação externa e fluxo de publicação posterior. O domínio de produção atual é reservado.
- A verificação de saúde consulta configuração, proprietário ativo, sincronização do catálogo, convites vencidos e rascunhos. Trata-se de uma checagem interna do banco, sem sondagem de uptime público.
- Uma sessão de suporte registra motivo, site, operador e validade de 30 minutos. A consulta é somente de leitura, limitada ao site e auditada; não assume a identidade do cliente.

## Exportação e exclusão

- O proprietário pode baixar dados de um site ativo em JSON, incluindo configuração, presentes declarados, contribuições, acessos, convites e domínios. A exportação exige autorização, tem limites de volume, é registrada e nunca contém a chave Pix.
- A exclusão é solicitada com confirmação do identificador do site. O site usado pela homologação não pode entrar no fluxo.
- Uma solicitação pode ser cancelada durante os sete dias de espera. Depois do prazo, a conclusão exige uma exportação feita após a solicitação e uma segunda confirmação do identificador.
- Ao concluir, dados operacionais do site são removidos e o registro do evento é arquivado e descaracterizado. O registro da solicitação e a última auditoria da exclusão ficam preservados. Arquivos JSON já baixados pelo operador ficam fora do controle do banco.
- A interface não executa exclusão automaticamente quando o prazo vence.

## Critérios de segurança

- Consultas e ações recebem `site_id` validado no servidor; APIs do casal continuam restritas ao evento atual.
- Mutações do proprietário verificam origem, limitam o tamanho da entrada, validam campos e registram auditoria.
- Operações de exclusão usam lote transacional no D1 e exigem exportação prévia, prazo e duas confirmações. O evento da homologação fica bloqueado explicitamente.
- A Fase 8 contém a revisão integral de segurança, acessibilidade, botões, textos e bordas antes da liberação comercial.
