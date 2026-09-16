# Fase 8 — Verificação final de segurança e experiência

## Estado

Revisão **parcial e antecipada em homologação**. Não autoriza a publicação no domínio do chá nem a abertura comercial. A Fase 7 ainda exige backup íntegro do D1 de produção, ensaio com dados reais, reconciliação e retorno testado.

## Correções verificadas em código

| Área | Achado | Medida | Evidência |
| --- | --- | --- | --- |
| Relatórios administrativos | Campos fornecidos por convidados eram exportados para CSV somente com aspas; planilhas podem interpretar um campo iniciado por fórmula. | Escapar aspas, remover controles e manter fórmulas como texto para a abertura do CSV em planilhas. | Teste com fórmulas, variantes Unicode e tentativa de separar células. |
| Imagens de produtos | A busca de imagem e o acesso às páginas das lojas seguiam redirecionamentos sem validar cada destino. | Seguir até três redirecionamentos manualmente, conferindo HTTPS e destino público em cada salto; páginas permanecem limitadas às lojas permitidas. | Testes bloqueiam destino privado e preservam redirecionamento legítimo. |
| Páginas externas e imagens | Páginas de lojas sem `Content-Length` podiam ser lidas integralmente; o proxy aceitava qualquer subtipo `image/*`. | Limitar leitura a 3 MB e aceitar somente JPEG, PNG, WebP e AVIF, com limite de 12 MB por imagem. | Testes de regressão e compilação. |
| Cabeçalhos HTTP | A rota de otimização de imagem saía antes de aplicar os cabeçalhos globais. | Aplicar o mesmo conjunto de cabeçalhos ao resultado da otimização. | Compilação e teste de presença dos cabeçalhos no Worker. |

A orientação da [OWASP sobre CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection) reconhece limitações entre aplicativos e ao salvar/reabrir arquivos; estes CSVs são relatórios para visualização, não um formato canônico de backup. A [OWASP sobre SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) recomenda validar destinos e tratar redirecionamentos com cuidado. A inspeção de URLs não prova que um nome público não possa resolver para um endereço interno; a restrição de rede e a origem efetiva ainda exigem validação na infraestrutura.

## Verificações pendentes antes do domínio real

- Completar backup consistente, importação em D1 descartável, comparação registro a registro, teste de rollback da versão publicada e plano para escritas concorrentes da Fase 7.
- Executar análise de dependências com acesso ao registro e tratar achados. `npm audit --omit=dev` não conseguiu responder na sessão de revisão; ausência de resultado não é ausência de vulnerabilidade.
- Revisar a política de conteúdo com teste no navegador: o Worker usa `script-src 'unsafe-inline'`; reforçar sem interromper a hidratação ou o login exige ensaio funcional.
- Verificar a identidade fornecida pela camada Sites, o acesso de proprietário, o perfil de Ana e isolamento entre contas/sites com sessões reais. Testes unitários de permissão não substituem essa checagem.
- Conferir limites de requisição e abuso em APIs públicas, além do comportamento da planilha e de imagens externas sob falha e redirecionamento.
- Fazer inspeção visual autenticada em desktop e celular, inclusive zoom a 200%, em **todos** os botões, estados, textos, bordas, modais e tabelas. A compilação e testes de código não comprovam o acabamento visual.
- Conferir Pix, favorecido, catálogo, fotografias, links e ações reais na homologação; nunca gerar pagamento nem modificar reservas de produção como teste.
- Registrar resultados, riscos remanescentes, responsáveis, retorno e observação após publicação. Só encerrar o portão quando os critérios do Plano Mestre estiverem comprovados.
