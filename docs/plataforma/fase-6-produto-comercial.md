# Fase 6 — Produto comercial em homologação

## Entrega

- `/produto` apresenta proposta e planos cadastrados no painel do proprietário. Preço zero é exibido como **preço a definir**, sem promessa de gratuidade.
- `/plataforma/comercial` é exclusivo do proprietário. Permite configurar textos de apresentação, prazo proposto de teste, e-mail, minutas internas e cupons de simulação; exibe indicadores e histórico de até 100 solicitações.
- Usuários autenticados registram interesse em teste, interesse em contratar e dúvidas. Consultam somente as próprias solicitações e podem cancelar as pendentes. O proprietário pode encerrar chamados de suporte; não assume a identidade do usuário.
- Cupom ativo e não vencido modifica apenas o valor estimado armazenado na solicitação. O valor calculado é uma fotografia do preço e desconto no instante do pedido; alterações futuras do plano não recalculam pedidos anteriores.
- Tabelas, índice de unicidade de solicitação pendente por pessoa e tipo, limites de entrada, autorização no servidor, verificação de origem, proteção contra duplicidade e auditoria tornam os fluxos inspecionáveis. Os indicadores são contagens do banco, sem simular uptime ou liquidação financeira.

## Limites de operação

O ambiente Sites de homologação continua privado para o proprietário. Nenhum convite externo é disparado. O pedido de teste não provisiona site nem inicia prazo automaticamente. O pedido de contratação não oferece checkout, débito, assinatura ou quitação. A coluna `billing_status` permanece `unconfigured`; nenhum endpoint aceita confirmação de pagamento enviada pelo navegador. Cupons não são resgatados financeiramente.

As minutas de termos e privacidade são editáveis somente pelo proprietário e não são publicadas como contratos aprovados. A apresentação informa claramente que pedidos não constituem aceite final. Antes da abertura comercial são necessários: identificação do responsável e dados de contato, revisão jurídica das versões datadas de termos e privacidade, regras reais de cancelamento/reembolso/retenção, configuração de preços e periodicidade, definição de provedor de pagamentos, credenciais seguras, webhook autenticado, conciliação e ensaios de falha/duplicidade, provisionamento de sites e disparos transacionais. A etapa de teste real só começa depois de existir provisionamento e política de expiração verificável no servidor.

## Operação e saída segura

- O usuário pode cancelar solicitações pendentes sem interferir no site de chá atualmente em produção.
- O responsável pode desativar cupons sem apagar histórico. Pedidos e chamados permanecem para acompanhamento e exigirão política de retenção antes da operação pública.
- O domínio `cha.evametodo.com.br` continua na implantação atual. A Fase 7 exige migração, comparação, sincronização, aprovação de corte e rollback; a Fase 8 é o portão de segurança e inspeção visual integral.
