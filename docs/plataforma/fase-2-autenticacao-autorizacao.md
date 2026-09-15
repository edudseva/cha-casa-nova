# Fase 2 — Autenticação e autorização

Esta fase consolida a identidade, os perfis e as decisões de acesso da plataforma sem criar um cadastro de senhas paralelo. A autenticação e a recuperação da conta permanecem sob responsabilidade do login seguro do ChatGPT; a aplicação recebe a identidade autenticada e aplica suas próprias políticas de autorização no servidor.

## Entregas

- [x] Centralizar as permissões do evento em uma política única no servidor.
- [x] Separar os perfis `owner`, `editor` e `viewer`.
- [x] Restringir cada API administrativa pela permissão necessária.
- [x] Remover o aceite automático de convites ao abrir o painel.
- [x] Criar aceite e recusa explícitos de convites vinculados ao e-mail autenticado.
- [x] Criar a área **Minha conta** com identidade, sessão, convites e eventos vinculados.
- [x] Disponibilizar encerramento seguro da sessão pelo fluxo da plataforma de identidade.
- [x] Permitir convite como administrador ou somente leitura.
- [x] Permitir alteração de perfil e revogação de acessos não proprietários.
- [x] Impedir alteração ou revogação do responsável principal pelo fluxo comum.
- [x] Registrar aceite, recusa, troca de perfil e revogação na auditoria.
- [x] Preservar o isolamento por `site_id` e a proteção da produção.

## Matriz de permissões

| Operação | Responsável principal | Administrador | Somente leitura |
| --- | --- | --- | --- |
| Consultar painel e registros | Sim | Sim | Sim |
| Personalizar o evento | Sim | Sim | Não |
| Alterar situação de presentes | Sim | Sim | Não |
| Conferir contribuições Pix | Sim | Sim | Não |
| Exportar dados administrativos | Sim | Sim | Não |

O proprietário da plataforma mantém acesso estrutural ao evento para suporte e administração. Essa exceção é verificada exclusivamente no servidor e continua vinculada à lista segura de proprietários do ambiente.

## Fluxo de convite

1. O proprietário informa o e-mail e escolhe `Administrador` ou `Somente leitura`.
2. O convite nasce pendente e expira em sete dias.
3. A pessoa entra com a conta correspondente ao e-mail convidado.
4. A área **Minha conta** permite aceitar ou recusar conscientemente.
5. Somente o aceite válido cria ou reativa o vínculo com o evento.
6. Alterações posteriores de perfil e revogação produzem registros de auditoria.

Na homologação privada, o controle externo de visitantes do ambiente continua sendo uma barreira adicional. Um convidado de teste precisa estar liberado na audiência da homologação antes de conseguir abrir a tela de login; essa regra não é contornada pela aplicação.

## Sessão e recuperação

A aplicação não armazena senha, token de sessão ou mecanismo próprio de recuperação. Entrada, encerramento de sessão e recuperação da conta são executados pelo provedor de identidade. O site usa os cabeçalhos autenticados apenas no servidor e nunca aceita identidade, papel ou permissão enviados pelo navegador.

## Critério de conclusão

A Fase 2 termina quando usuários sem identidade recebem `401`, usuários sem vínculo recebem `403`, o perfil somente leitura não consegue executar mutações, convites só podem ser aceitos pelo e-mail destinatário e operações de acesso relevantes aparecem na auditoria. A validação deve ocorrer exclusivamente na homologação antes do início da Fase 3.
