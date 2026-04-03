# Deploy na Oracle Cloud Free Tier

## 1. Criar a VM na Oracle

1. Crie uma conta em [cloud.oracle.com](https://cloud.oracle.com) (pede cartao, nao cobra)
2. No painel, va em **Compute > Instances > Create Instance**
3. Configure:
   - **Image:** Ubuntu 22.04 (ou mais recente)
   - **Shape:** VM.Standard.A1.Flex — 1 OCPU, 1GB RAM (gratis)
   - **SSH Key:** adicione sua chave publica (ou gere uma nova)
4. Crie a instancia e anote o IP publico

## 2. Liberar porta SSH

No painel da Oracle:
1. Va em **Networking > Virtual Cloud Networks**
2. Clique na VCN da instancia > **Security Lists > Default**
3. Confirme que a porta 22 (SSH) esta aberta para entrada

## 3. Conectar na VM

```bash
ssh ubuntu@SEU_IP_PUBLICO
```

## 4. Rodar o setup

Copie o arquivo `setup-oracle.sh` para a VM e execute:

```bash
# Do seu computador local:
scp setup-oracle.sh ubuntu@SEU_IP_PUBLICO:~/

# Na VM:
bash ~/setup-oracle.sh
```

## 5. Enviar o projeto

Do seu computador local:

```bash
# Envia tudo exceto node_modules e sessao do WhatsApp
rsync -avz --exclude='node_modules' --exclude='.wwebjs_auth' --exclude='.wwebjs_cache' --exclude='.git' --exclude='.env' ./ ubuntu@SEU_IP_PUBLICO:~/robo-jti/
```

## 6. Configurar na VM

```bash
cd ~/robo-jti
npm install

# Criar o .env com suas credenciais
nano .env
```

Conteudo do `.env`:

```
AZURE_CLIENT_ID=seu-client-id
WHATSAPP_GROUP_ID=id-do-grupo@g.us
EMAIL_CHECK_INTERVAL_MS=30000
```

## 7. Dizer ao Puppeteer para usar o Chromium do sistema

O `whatsapp-web.js` tenta baixar seu proprio Chromium, mas na VM ARM usamos o do apt.

```bash
export PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser)
```

Adicione ao `.env`:

```
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## 8. Primeiro start (interativo)

Na primeira vez, voce precisa:
- Escanear o QR Code do WhatsApp
- Autorizar a Microsoft via Device Code

Entao rode interativamente primeiro:

```bash
cd ~/robo-jti
node index.js
```

1. Escaneie o QR Code com seu WhatsApp
2. Acesse o link da Microsoft e insira o codigo exibido no terminal
3. Aguarde a mensagem de confirmacao
4. Pare com Ctrl+C

## 9. Rodar com PM2 (modo producao)

```bash
cd ~/robo-jti
pm2 start ecosystem.config.js
pm2 save
```

Comandos uteis:

```bash
pm2 logs robo-jti      # Ver logs em tempo real
pm2 status             # Status do processo
pm2 restart robo-jti   # Reiniciar
pm2 stop robo-jti      # Parar
```

O PM2 vai:
- Reiniciar o bot automaticamente se crashar
- Subir o bot quando a VM reiniciar
- Manter logs rotativos

## 10. Manter a VM ativa

A Oracle pode reciclar VMs idle (raro). Adicione um cron simples:

```bash
crontab -e
```

Adicione a linha:

```
*/5 * * * * curl -s http://localhost:3000/health > /dev/null 2>&1 || true
```

> Nota: esse health check nao faz nada funcional agora (o bot nao tem server HTTP).
> Serve apenas para gerar atividade minima na VM. Se quiser algo mais robusto,
> podemos adicionar um endpoint /health no futuro.

## Troubleshooting

### QR Code nao aparece
- Verifique se o Chromium esta instalado: `chromium-browser --version`
- Verifique se `PUPPETEER_EXECUTABLE_PATH` esta no `.env`

### Token da Microsoft expira e nao renova
- Na primeira vez, o Device Code Flow exige interacao manual
- Depois, o token renova automaticamente via `acquireTokenSilent`
- Se parar de renovar, rode `node index.js` interativamente de novo

### Bot para de enviar mensagens
```bash
pm2 logs robo-jti --lines 50
```
Procure por erros de token (401) ou rate limit (429).

### VM ficou sem memoria
```bash
free -h
pm2 monit
```
Se Chromium estiver consumindo demais, considere subir pra 2GB RAM (ainda free tier).
