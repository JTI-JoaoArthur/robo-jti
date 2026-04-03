# Robo JTI

Bot que monitora a caixa de entrada do Outlook (Microsoft 365) e encaminha automaticamente os e-mails recebidos para um grupo no WhatsApp. Criado para a **JTI Soluções**, onde o tempo de resposta a um lead pode ser a diferença entre fechar ou perder um contrato.

## Por que esse projeto existe

A equipe comercial da JTI precisava ser notificada instantaneamente sobre novos contatos recebidos por e-mail, mas nem todos acompanhavam a caixa de entrada em tempo real. A solução foi levar a informação até onde todo mundo já estava: o grupo do WhatsApp.

## O que ele faz

1. **Conecta no WhatsApp** via `whatsapp-web.js` (QR Code ou pareamento por telefone)
2. **Autentica no Outlook** via Microsoft Graph API usando Device Code Flow
3. **Monitora a caixa de entrada** em intervalos configuráveis
4. **Formata e encaminha** cada e-mail novo para o grupo do WhatsApp, com remetente, assunto, corpo limpo e indicação de anexos
5. **Marca como lido** o e-mail processado para evitar duplicatas

## Arquitetura

```
index.js                  → Orquestrador principal
src/
├── auth.js               → Autenticacao Microsoft (MSAL + Device Code Flow)
├── emailPoller.js        → Polling da inbox via Microsoft Graph API
├── messageFormatter.js   → Conversao HTML → texto e formatacao da mensagem
├── whatsapp.js           → Cliente WhatsApp (QR Code / pareamento por telefone)
└── logger.js             → Logger estruturado (Pino)
```

## Stack

- **Node.js** — runtime
- **whatsapp-web.js** — automacao do WhatsApp Web via Puppeteer
- **@azure/msal-node** — autenticacao OAuth2 com Microsoft 365
- **axios** — chamadas HTTP para a Microsoft Graph API
- **html-to-text** — conversao de e-mails HTML para texto legivel
- **pino** — logging estruturado em JSON
- **PM2** — gerenciamento de processo em producao

## Como rodar

### Pre-requisitos

- Node.js 18+
- Chromium instalado (para ambientes headless)
- Uma conta Microsoft 365 com acesso ao Outlook
- Um Azure App Registration com permissao `Mail.Read` e `Mail.ReadWrite`

### Instalacao

```bash
git clone https://github.com/JTI-JoaoArthur/robo-jti.git
cd robo-jti
npm install
cp .env.example .env
```

### Configuracao

Edite o `.env`:

```env
AZURE_CLIENT_ID=seu-client-id-do-azure
WHATSAPP_GROUP_ID=id-do-grupo@g.us
EMAIL_CHECK_INTERVAL_MS=30000
```

Para usar pareamento por telefone em vez de QR Code (util em servidores headless):

```env
WHATSAPP_PHONE_NUMBER=5511999999999
```

Para ambientes onde o Chromium do sistema deve ser usado:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Primeiro start

```bash
node index.js
```

Na primeira execucao:
1. Escaneie o QR Code com o WhatsApp (ou digite o codigo de pareamento)
2. Acesse o link da Microsoft e insira o codigo exibido no terminal

Depois que ambas as autenticacoes forem feitas, o bot comeca a vigiar a caixa de entrada.

### Producao (PM2)

```bash
pm2 start ecosystem.config.js
pm2 save
```

## Deploy

O projeto inclui um guia completo para deploy em **Oracle Cloud Free Tier** (VM gratuita permanente). Consulte o [DEPLOY.md](DEPLOY.md).

## Decisoes tecnicas

- **Device Code Flow** em vez de Client Credentials: permite autenticar como usuario real sem precisar de permissoes de administrador no Azure AD.
- **Polling em vez de webhooks**: mais simples de operar em uma VM gratuita sem dominio ou certificado SSL.
- **Cache de IDs processados com limite**: evita reprocessamento sem consumir memoria indefinidamente.
- **Marca como lido antes de enviar**: prioriza evitar duplicatas no grupo, mesmo que o envio ao WhatsApp falhe.

## Licenca

ISC
