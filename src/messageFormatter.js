const { convert } = require('html-to-text');

const TEXTOS_AUTOMATICOS = [
    /Form Submission Data from your website\./gi,
    /New form has been submitted on your website, please open to see details\./gi,
    /Hello,/gi,
    /A new form has been submitted on your website\. Details below\./gi,
];

const CAMPOS_FORMULARIO = [
    { regex: /\bNome\s*:/gi, label: '*Nome:*' },
    { regex: /\bEmail\s*:/gi, label: '*Email:*' },
    { regex: /\bTelefone\s*:/gi, label: '*Telefone:*' },
];

function limparCorpo(htmlContent) {
    let texto = convert(htmlContent, {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
        ],
    });

    for (const regex of TEXTOS_AUTOMATICOS) {
        texto = texto.replace(regex, '');
    }

    for (const campo of CAMPOS_FORMULARIO) {
        texto = texto.replace(campo.regex, campo.label);
    }

    return texto.trim();
}

function formatarMensagem(email, corpoLimpo) {
    const remetente = email.from ? email.from.emailAddress.address : 'Nao identificado';
    const indicacaoAnexo = email.hasAttachments ? 'Sim' : 'Nao';

    return [
        'NOVO E-MAIL NA CAIXA - JTI SOLUCOES',
        '',
        `*De:* ${remetente}`,
        `*Assunto:* ${email.subject}`,
        `*Anexos:* ${indicacaoAnexo}`,
        '',
        '*Mensagem:*',
        corpoLimpo,
    ].join('\n');
}

module.exports = { limparCorpo, formatarMensagem };
