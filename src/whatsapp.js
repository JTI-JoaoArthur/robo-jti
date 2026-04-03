const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./logger');

let client = null;

function criarCliente() {
    const puppeteerOpts = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const clientOpts = {
        authStrategy: new LocalAuth(),
        puppeteer: puppeteerOpts,
    };

    const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER;
    if (phoneNumber) {
        clientOpts.pairWithPhoneNumber = {
            phoneNumber,
            showNotification: true,
        };
    }

    client = new Client(clientOpts);

    if (phoneNumber) {
        client.on('code', (code) => {
            logger.info({ code }, 'Codigo de pareamento gerado');
            console.log(`\n>>> CODIGO DE PAREAMENTO: ${code} <<<\n`);
            console.log('No celular: WhatsApp > Dispositivos conectados > Conectar dispositivo > Conectar com numero de telefone\n');
        });
    } else {
        client.on('qr', (qr) => {
            logger.info('QR Code gerado, escaneie com o WhatsApp');
            qrcode.generate(qr, { small: true });
        });
    }

    client.on('message', async (msg) => {
        if (msg.body === '!id') {
            logger.info({ chatId: msg.from }, 'ID do chat solicitado');
        }
    });

    return client;
}

async function inicializar() {
    if (!client) criarCliente();
    await client.initialize();
}

function onReady(callback) {
    if (!client) criarCliente();
    client.on('ready', () => {
        logger.info('WhatsApp conectado');
        callback();
    });
}

async function enviarMensagem(groupId, mensagem) {
    await client.sendMessage(groupId, mensagem);
}

module.exports = { criarCliente, inicializar, onReady, enviarMensagem };
