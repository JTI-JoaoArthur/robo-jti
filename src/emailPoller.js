const axios = require('axios');
const logger = require('./logger');
const auth = require('./auth');
const { limparCorpo, formatarMensagem } = require('./messageFormatter');
const whatsapp = require('./whatsapp');

const GRAPH_INBOX_URL = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=isRead eq false';
const GRAPH_MESSAGE_URL = 'https://graph.microsoft.com/v1.0/me/messages';

const emailsProcessados = new Set();
const MAX_CACHE_SIZE = 500;

function isEmailDeSistema(email) {
    const endereco = email.sender.emailAddress.address.toLowerCase();
    const nome = email.sender.emailAddress.name.toLowerCase();
    return endereco.includes('microsoft') || nome.includes('microsoft');
}

async function marcarComoLido(emailId, accessToken) {
    await axios.patch(
        `${GRAPH_MESSAGE_URL}/${emailId}`,
        { isRead: true },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
}

async function checarEmails(groupId) {
    let accessToken;

    try {
        accessToken = await auth.getValidToken();
    } catch (error) {
        logger.error({ err: error.message }, 'Falha ao obter token de acesso');
        return;
    }

    let emails;
    try {
        const resposta = await axios.get(GRAPH_INBOX_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        emails = resposta.data.value;
    } catch (error) {
        const status = error.response?.status;
        if (status === 401) {
            logger.warn('Token expirado durante request, sera renovado no proximo ciclo');
        } else if (status === 429) {
            logger.warn('Rate limit do Graph API atingido, aguardando proximo ciclo');
        } else {
            logger.error({ err: error.message, status }, 'Erro ao buscar emails');
        }
        return;
    }

    for (const email of emails) {
        if (emailsProcessados.has(email.id)) {
            continue;
        }

        try {
            // Marca como lido ANTES de enviar pro WhatsApp (evita duplicatas)
            await marcarComoLido(email.id, accessToken);

            if (isEmailDeSistema(email)) {
                logger.info({ assunto: email.subject }, 'Email de sistema ignorado');
                emailsProcessados.add(email.id);
                continue;
            }

            const corpoLimpo = limparCorpo(email.body.content);
            const mensagem = formatarMensagem(email, corpoLimpo);

            await whatsapp.enviarMensagem(groupId, mensagem);
            logger.info({ assunto: email.subject }, 'Alerta enviado ao grupo');

            emailsProcessados.add(email.id);
        } catch (error) {
            logger.error(
                { err: error.message, emailId: email.id, assunto: email.subject },
                'Erro ao processar email'
            );
        }
    }

    // Limpa cache para nao crescer infinitamente
    if (emailsProcessados.size > MAX_CACHE_SIZE) {
        const entries = [...emailsProcessados];
        entries.splice(0, entries.length - MAX_CACHE_SIZE);
        emailsProcessados.clear();
        entries.forEach((id) => emailsProcessados.add(id));
    }
}

function iniciarPolling(groupId, intervalMs) {
    logger.info({ intervalMs }, 'Polling de emails iniciado');
    checarEmails(groupId);
    setInterval(() => checarEmails(groupId), intervalMs);
}

module.exports = { iniciarPolling };
