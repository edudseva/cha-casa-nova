# Fase 4 — Experiência de edição

## Objetivo

Permitir que o casal personalize o site com segurança e autonomia, separando claramente o trabalho em andamento do conteúdo visível aos convidados.

## Entregas concluídas

- Salvamento automático em rascunho privado por usuário e por evento.
- Publicação explícita: mudanças no rascunho não alteram o site público.
- Chave Pix fora do rascunho automático e enviada somente na publicação.
- Prévia protegida do rascunho com modos desktop e mobile.
- Validação contínua de campos obrigatórios, planilha, imagens, cores, Pix e galeria.
- Avisos opcionais separados de erros que bloqueiam a publicação.
- Desfazer e refazer durante a sessão de edição.
- Histórico das últimas publicações, com restauração sempre para rascunho antes de republicar.
- Ajuda contextual sobre rascunho, prévia, publicação e recuperação.
- Trilha de auditoria para publicação e restauração de versões.

## Regras de segurança e integridade

1. Rascunhos e versões são delimitados por `site_id`.
2. Cada usuário possui seu próprio rascunho no evento.
3. A prévia exige autenticação e permissão de edição.
4. Uma versão restaurada não substitui imediatamente o conteúdo publicado.
5. Erros de validação impedem a publicação, mas não a preservação do rascunho.
6. O editor armazena somente o indicador de existência da chave Pix; o valor da chave não retorna ao navegador nem entra no histórico.

## Critério de conclusão

A fase é considerada concluída quando o usuário consegue editar, sair e retornar ao rascunho; conferir a prévia; identificar pendências; desfazer alterações; publicar deliberadamente; e recuperar uma versão anterior sem afetar outro site ou expor a chave Pix.
