require('dotenv').config();

const logger = require('./src/logger');
const auth = require('./src/auth');
const whatsapp = require('./src/whatsapp');
const { iniciarPolling } = require('./src/emailPoller');

const {
    AZURE_CLIENT_ID,
    WHATSAPP_GROUP_ID,
    EMAIL_CHECK_INTERVAL_MS,
} = process.env;

if (!AZURE_CLIENT_ID || !WHATSAPP_GROUP_ID) {
    logger.fatal('Variaveis AZURE_CLIENT_ID e WHATSAPP_GROUP_ID sao obrigatorias no .env');
    process.exit(1);
}

const intervalMs = parseInt(EMAIL_CHECK_INTERVAL_MS, 10) || 30000;

logger.info('Iniciando o robo da JTI Solucoes');

auth.init(AZURE_CLIENT_ID);

whatsapp.onReady(async () => {
    try {
        await auth.authenticate();
        logger.info('Acesso ao Outlook liberado, iniciando vigilia de emails');
        iniciarPolling(WHATSAPP_GROUP_ID, intervalMs);
    } catch (error) {
        logger.fatal({ err: error.message }, 'Falha na autenticacao Microsoft');
        process.exit(1);
    }
});

whatsapp.inicializar().catch((error) => {
    logger.fatal({ err: error.message }, 'Falha ao inicializar WhatsApp');
    process.exit(1);
});
