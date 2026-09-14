# Chá de Casa Nova — edição no VS Code

Este pacote contém o código-fonte completo do site em TypeScript. A lista de presentes é atualizada a partir da aba `Itens` da planilha Google Sheets já conectada.

## Personalizar o site

As informações que podem mudar de um casal para outro estão centralizadas em `data/site-config.json`. Nesse arquivo é possível trocar nomes, textos de abertura, imagens, endereço de entrega, valores sugeridos do Pix, cores principais e o endereço CSV da planilha, sem alterar os componentes do site.

A chave Pix, o nome do favorecido e a cidade continuam fora desse arquivo e devem ser configurados pelas variáveis protegidas descritas abaixo. Assim, a chave não fica exposta no código público nem na planilha.

## Requisitos

- Node.js 22.13 ou mais recente
- VS Code
- Git Bash ou WSL no Windows para executar os scripts completos de build

## Abrir o site no computador

1. Extraia o arquivo ZIP.
2. Abra a pasta extraída no VS Code.
3. Abra o terminal integrado.
4. Instale as dependências:

   ```bash
   npm install
   ```

5. Inicie o ambiente local:

   ```bash
   npm run dev
   ```

   No PowerShell do Windows, se o comando acima não reconhecer a variável de ambiente, use:

   ```powershell
   npx vite
   ```

6. Abra o endereço informado no terminal, normalmente `http://localhost:5173`.

## Testar o Pix localmente

1. Duplique `.dev.vars.example` e renomeie a cópia para `.dev.vars`.
2. Preencha `PIX_KEY`, `PIX_RECEIVER` e `PIX_CITY`.
3. Reinicie o servidor local.

O arquivo `.dev.vars` é ignorado pelo Git e não deve ser enviado ou publicado. Em produção, esses valores devem ser configurados como variáveis protegidas da hospedagem. O navegador recebe apenas o nome do favorecido e o código Pix gerado para a contribuição; a chave não fica salva no catálogo nem na planilha.

## Atualizar a lista de presentes

Edite a aba `Itens` da planilha **Lista de Presentes - Chá de Casa Nova**. O site consulta a planilha automaticamente e mantém uma cópia local como contingência. Por segurança, os links de compra precisam usar HTTPS e pertencer a uma loja permitida no arquivo `app/api/gifts/route.ts`.

Alterações podem levar cerca de 2 a 5 minutos para aparecer devido ao cache. Para evitar que terceiros alterem a lista, deixe o compartilhamento da planilha como **Qualquer pessoa com o link: Leitor** e reserve a edição às contas autorizadas.

## Gerar uma versão de produção

Em Git Bash, WSL, Linux ou macOS:

```bash
npm run build
```

O resultado é gravado em `dist/`. Contudo, este projeto não é apenas estático: reservas, confirmações, Pix e banco de dados dependem das rotas de servidor e do Cloudflare D1. Portanto, enviar somente `dist/` para uma hospedagem estática da Hostinger exibiria a interface, mas não manteria todo o funcionamento.

Para usar a Hostinger, é necessário um plano com aplicação Node.js/VPS e adaptar os recursos Cloudflare, ou manter o aplicativo hospedado em Sites e apontar `cha.evametodo.com.br` para ele — que é a configuração atual recomendada.

## Arquivos principais

- `app/gift-catalog-v2.tsx`: interface e fluxo de presentes/Pix
- `app/api/gifts/route.ts`: sincronização com Google Sheets
- `app/api/pix/route.ts`: geração segura do Pix no servidor
- `app/api/reservations/route.ts`: reservas e confirmações
- `data/gifts.json`: catálogo local de contingência
- `app/globals.css`: cores e estilos
- `.openai/hosting.json`: vínculo com a hospedagem e o banco D1
