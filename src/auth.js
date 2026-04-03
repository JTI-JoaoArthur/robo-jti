const { PublicClientApplication } = require('@azure/msal-node');
const logger = require('./logger');

const SCOPES = ['Mail.Read', 'Mail.ReadWrite'];

let msalClient = null;
let cachedAccount = null;

function init(clientId) {
    msalClient = new PublicClientApplication({
        auth: {
            clientId,
            authority: 'https://login.microsoftonline.com/common',
        },
    });
}

async function authenticate() {
    const tokenRequest = {
        scopes: SCOPES,
        deviceCodeCallback: (response) => {
            logger.info('Autorizacao da Microsoft necessaria');
            console.log('\n======================================================');
            console.log(response.message);
            console.log('======================================================\n');
        },
    };

    const authResponse = await msalClient.acquireTokenByDeviceCode(tokenRequest);
    cachedAccount = authResponse.account;
    logger.info('Autenticacao Microsoft concluida');
    return authResponse.accessToken;
}

async function getValidToken() {
    if (!cachedAccount) {
        return authenticate();
    }

    try {
        const silentResult = await msalClient.acquireTokenSilent({
            scopes: SCOPES,
            account: cachedAccount,
        });
        return silentResult.accessToken;
    } catch (error) {
        logger.warn({ err: error.message }, 'Token silencioso falhou, re-autenticando');
        return authenticate();
    }
}

module.exports = { init, authenticate, getValidToken };
