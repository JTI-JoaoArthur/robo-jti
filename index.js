const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { PublicClientApplication } = require('@azure/msal-node');
const axios = require('axios');

console.log('⏳ Iniciando o robô da JTI Soluções... (Aguarde)');

// 1. CONFIGURAÇÃO DA MICROSOFT COM O SEU ID DO AZURE
const pca = new PublicClientApplication({
    auth: {
        clientId: 'ff97b38b-8393-4816-82f9-02b648d336b8',
        authority: 'https://login.microsoftonline.com/common'
    }
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('📱 Escaneie o QR Code abaixo com o seu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso!');
    iniciarLeituraEmail(); // Chama os "olhos novos" da Microsoft
});

// TRUQUE PARA DESCOBRIR O ID DO GRUPO
client.on('message', async msg => {
    if (msg.body === '!id') {
        console.log('🤖 O ID DESTE GRUPO É:', msg.from);
    }
});

client.initialize();

// 3. OS NOVOS OLHOS DO ROBÔ (Azure Graph API)
async function iniciarLeituraEmail() {
    const tokenRequest = {
        scopes: ['Mail.Read', 'Mail.ReadWrite'],
        deviceCodeCallback: (response) => {
            // AQUI O ROBÔ VAI PEDIR A SUA AUTORIZAÇÃO NO TERMINAL
            console.log('\n======================================================');
            console.log('🚨 AUTORIZAÇÃO DA MICROSOFT NECESSÁRIA 🚨');
            console.log(response.message); 
            console.log('======================================================\n');
        }
    };

    try {
        const authResponse = await pca.acquireTokenByDeviceCode(tokenRequest);
        console.log('📧 Acesso liberado! O robô agora está vigiando novos formulários no Outlook...');
        
        // Checa a caixa de entrada a cada 15 segundos
        setInterval(() => checarEmails(authResponse.accessToken), 15000);
    } catch (error) {
        console.log('❌ Erro na autenticação da Microsoft:', error);
    }
}

async function checarEmails(accessToken) {
    try {
        const resposta = await axios.get('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=isRead eq false', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const emails = resposta.data.value;

        for (const email of emails) {
            // 🛑 O FILTRO: Descobre quem é o remetente
            const remetenteEmail = email.sender.emailAddress.address.toLowerCase();
            const remetenteNome = email.sender.emailAddress.name.toLowerCase();

            // Se for da Microsoft, marca como lido no Outlook e pula a notificação
            if (remetenteEmail.includes('microsoft') || remetenteNome.includes('microsoft')) {
                await axios.patch(`https://graph.microsoft.com/v1.0/me/messages/${email.id}`, { isRead: true }, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                console.log(`🔕 E-mail de sistema ignorado (Sem zap): "${email.subject}"`);
                continue; // O comando 'continue' faz o robô pular para o próximo e-mail imediatamente
            }

            // Para os e-mails normais: Marca como lido no Outlook
            await axios.patch(`https://graph.microsoft.com/v1.0/me/messages/${email.id}`, { isRead: true }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            // 🎯 O ALVO: O ID DO GRUPO DA EMPRESA
            const idDoGrupo = '120363424977903100@g.us';
            
            const resumo = email.bodyPreview || 'Sem texto na pré-visualização';
            const indicacaoAnexo = email.hasAttachments ? '📎 Sim' : 'Não';
            
            // Pega o corpo INTEIRO do e-mail em vez da prévia de 255 caracteres
            let corpoLimpo = email.body.content;

            // Filtro rápido para limpar os códigos HTML de e-mails completos
            corpoLimpo = corpoLimpo.replace(/<br\s*[\/]?>/gi, '\n'); // Transforma a tag <br> em quebra de linha do WhatsApp
            corpoLimpo = corpoLimpo.replace(/<\/p>/gi, '\n\n');     // Transforma o fim do parágrafo em duas quebras
            corpoLimpo = corpoLimpo.replace(/<[^>]*>?/gm, '');      // Deleta todo o resto de código HTML que sobrar
            corpoLimpo = corpoLimpo.replace(/&nbsp;/g, ' ');        // Limpa códigos de espaço

            // 1. Apaga os textos automáticos em inglês
            corpoLimpo = corpoLimpo.replace(/Form Submission Data from your website\./gi, '');
            corpoLimpo = corpoLimpo.replace(/New form has been submitted on your website, please open to see details\./gi, '');
            corpoLimpo = corpoLimpo.replace(/Hello,/gi, '');
            corpoLimpo = corpoLimpo.replace(/A new form has been submitted on your website\. Details below\./gi, '');

            // 2. Coloca os campos em negrito (adicionando asteriscos)
            corpoLimpo = corpoLimpo.replace(/Nome/gi, '*Nome:*');
            corpoLimpo = corpoLimpo.replace(/Email/gi, '*Email:*');
            corpoLimpo = corpoLimpo.replace(/Telefone/gi, '*Telefone:*');

            // Remove espaços em branco ou quebras de linha extras que sobrarem no começo/fim
            corpoLimpo = corpoLimpo.trim();

            const mensagemWhatsApp = `📧 NOVO E-MAIL NA CAIXA - JTI SOLUÇÕES 📧\n\n*Assunto:* ${email.subject}\n*Anexos:* ${indicacaoAnexo}\n\n*Mensagem:*\n${corpoLimpo}`;

            // Disparando a mensagem para o grupo!
            client.sendMessage(idDoGrupo, mensagemWhatsApp).then(() => {
                console.log(`📱 Alerta do e-mail "${email.subject}" enviado direto pro GRUPO!`);
            }).catch(console.error);
        }
    } catch (error) {
        // Ignora erros de conexão rápida
    }
}