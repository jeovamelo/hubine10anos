const nodemailer = require('nodemailer');
const db = require('./db');

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter = null;
if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function getAppUrl() {
  return process.env.APP_URL || 'http://localhost:3000';
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || 'Hubine 10 Anos <hubine10anos@bnb.gov.br>';

  if (isSmtpConfigured && transporter) {
    try {
      const info = await transporter.sendMail({ from, to, subject, html, text });
      console.log('E-mail real enviado via SMTP para:', to, 'ID:', info.messageId);
      return { success: true, mode: 'SMTP', messageId: info.messageId };
    } catch (err) {
      console.error('Falha no envio SMTP real, salvando no outbox de demonstração:', err);
    }
  }

  // Demo mode: archive in persistent outbox
  const outboxEntry = await db.addEmailOutbox({
    from,
    to,
    subject,
    html,
    text,
    mode: 'DEMO'
  });
  console.log('[MODO DEMONSTRAÇÃO] E-mail simulado registrado na Caixa de E-mails:', to, subject);
  return { success: true, mode: 'DEMO', outboxId: outboxEntry.id };
}

// Pre-built email templates
async function sendRegistrationConfirmation(reg) {
  const appUrl = getAppUrl();
  const ticketUrl = `${appUrl}/#comprovante/${reg.token}`;
  const manageUrl = `${appUrl}/#gerenciar/${reg.token}`;
  const isWaitlist = reg.status === 'LISTA_ESPERA';

  const subject = isWaitlist
    ? 'Hubine 10 Anos — Confirmação de Cadastro na Lista de Espera'
    : 'Hubine 10 Anos — Confirmação de Inscrição Oficial';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6B1D2F 0%, #4A1220 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #fbcfe8; margin-bottom: 8px;">Banco do Nordeste • Hubine</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 700;">Hubine 10 Anos</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Conectando inovação, pessoas e desenvolvimento regional</p>
      </div>

      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${escapeHtml(reg.name)}</strong>!</p>
        
        ${isWaitlist ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <strong style="color: #92400e; font-size: 15px;">Você está na Lista de Espera</strong>
            <p style="margin: 6px 0 0 0; color: #78350f; font-size: 14px;">A capacidade inicial do auditório foi atingida. Sua posição na lista de espera é <strong>#${reg.waitlistPosition || '1'}</strong>. Caso haja cancelamentos ou liberação de novas vagas, você será notificado automaticamente por este e-mail.</p>
          </div>
        ` : `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <strong style="color: #065f46; font-size: 15px;">Sua participação está confirmada!</strong>
            <p style="margin: 6px 0 0 0; color: #047857; font-size: 14px;">Seu comprovante individual foi gerado com sucesso. Apresente o QR Code no credenciamento ao chegar ao evento.</p>
          </div>
        `}

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #6B1D2F; text-transform: uppercase; letter-spacing: 1px;">Dados da Inscrição</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Número:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${reg.registrationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Nome no Crachá:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapeHtml(reg.badgeName || reg.name)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Instituição:</td>
              <td style="padding: 6px 0; color: #0f172a;">${escapeHtml(reg.institution)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Data do Evento:</td>
              <td style="padding: 6px 0; color: #0f172a;">4 de novembro de 2026</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Credenciamento:</td>
              <td style="padding: 6px 0; color: #0f172a;">A partir das 13h</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Local:</td>
              <td style="padding: 6px 0; color: #0f172a;">Auditório Celso Furtado — Fortaleza, CE</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${ticketUrl}" style="background-color: #6B1D2F; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Visualizar Comprovante & QR Code
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
          Caso precise atualizar informações (como o nome para crachá) ou cancelar sua participação com antecedência, utilize o link seguro:
          <br><a href="${manageUrl}" style="color: #6B1D2F; text-decoration: underline;">Gerenciar ou Cancelar Inscrição</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Este é um e-mail institucional referente ao evento Hubine 10 Anos. Em caso de dúvidas, responda para <a href="mailto:hubine10anos@bnb.gov.br" style="color: #64748b;">hubine10anos@bnb.gov.br</a>.
        </p>
      </div>
    </div>
  `;

  return sendMail({
    to: reg.email,
    subject,
    html,
    text: `Hubine 10 Anos - Inscrição: ${reg.registrationNumber}. Acesse seu comprovante em: ${ticketUrl}`
  });
}

async function sendWaitlistPromotion(reg) {
  const appUrl = getAppUrl();
  const ticketUrl = `${appUrl}/#comprovante/${reg.token}`;

  const subject = 'Hubine 10 Anos — Uma vaga foi liberada para você!';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #d1fae5; margin-bottom: 8px;">Hubine 10 Anos • Boas Notícias</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Vaga Confirmada!</h1>
      </div>

      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${escapeHtml(reg.name)}</strong>!</p>
        <p>Houve uma liberação de vaga e sua inscrição para o evento <strong>Hubine 10 Anos</strong> foi promovida da lista de espera para <strong>CONFIRMADA</strong>!</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${ticketUrl}" style="background-color: #6B1D2F; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Acessar Meu Comprovante & QR Code
          </a>
        </div>
      </div>
    </div>
  `;

  return sendMail({
    to: reg.email,
    subject,
    html,
    text: `Hubine 10 Anos: Sua vaga foi confirmada! Acesse seu comprovante em: ${ticketUrl}`
  });
}

async function sendSpeakerInvite(speaker) {
  const appUrl = getAppUrl();
  const inviteUrl = `${appUrl}/#palestrante/convite/${speaker.inviteToken}`;

  const subject = 'Hubine 10 Anos — Convite Especial para Palestrante / Painelista';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6B1D2F 0%, #4A1220 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #fbcfe8; margin-bottom: 8px;">Banco do Nordeste • Hubine 10 Anos</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Convite de Participação</h1>
      </div>

      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Prezado(a) <strong>${escapeHtml(speaker.name)}</strong>,</p>
        <p>É uma honra para o Hub de Inovação do Banco do Nordeste contar com sua presença como palestrante / participante especial na comemoração dos <strong>10 anos do Hubine</strong>, no dia <strong>4 de novembro de 2026</strong>, no Auditório Celso Furtado em Fortaleza — CE.</p>
        
        <p>Para alinhamento das informações de divulgação e das necessidades técnicas, disponibilizamos seu link individual e seguro:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #6B1D2F; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Completar Dados de Palestrante
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          Nota: O envio de biografia e foto é opcional e requer autorização expressa. Nada será publicado na programação oficial sem a revisão prévia da organização.
        </p>
      </div>
    </div>
  `;

  return sendMail({
    to: speaker.email,
    subject,
    html,
    text: `Hubine 10 Anos - Convite de Palestrante. Complete seus dados em: ${inviteUrl}`
  });
}

function formatGuestWhatsappMessage(reg, appUrl = getAppUrl()) {
  const ticketUrl = `${appUrl}/#comprovante/${reg.token}`;
  const manageUrl = `${appUrl}/#gerenciar/${reg.token}`;

  return `*Hubine 10 Anos — Convite Especial da Organização* 🎉\n\n` +
    `Olá, *${reg.name}*!\n\n` +
    `Você foi convidado(a) especial pela organização para participar do evento comemorativo *Hubine 10 Anos* (Hub de Inovação do Banco do Nordeste).\n\n` +
    `📌 *Dados do Evento:*\n` +
    `• *Evento:* Hubine 10 Anos — Conectando inovação, pessoas e desenvolvimento regional\n` +
    `• *Data:* 4 de novembro de 2026\n` +
    `• *Local:* Auditório Celso Furtado — Campus Banco do Nordeste (Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza — CE)\n` +
    `• *Credenciamento:* A partir das 13h\n` +
    `• *Nº de Inscrição:* *${reg.registrationNumber}*\n\n` +
    `📋 *Orientações de Credenciamento:*\n` +
    `Ao chegar ao auditório, dirija-se à recepção e apresente seu QR Code ou informe o número da sua inscrição (*${reg.registrationNumber}*) para a retirada do seu crachá oficial.\n\n` +
    `🎟️ *Acesse seu Comprovante Oficial com QR Code:*\n${ticketUrl}\n\n` +
    `✏️ *Atualizar dados do crachá ou cancelar sua participação:*\n${manageUrl}\n\n` +
    `Esperamos por você!\n` +
    `_Banco do Nordeste do Brasil — Hubine_`;
}

async function sendOrganizationGuestInvite(reg) {
  const appUrl = getAppUrl();
  const ticketUrl = `${appUrl}/#comprovante/${reg.token}`;
  const manageUrl = `${appUrl}/#gerenciar/${reg.token}`;

  const subject = 'Hubine 10 Anos — Convite Especial da Organização';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6B1D2F 0%, #4A1220 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #fbcfe8; margin-bottom: 8px;">Banco do Nordeste • Hubine 10 Anos</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 700;">Convite de Honra</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Conectando inovação, pessoas e desenvolvimento regional</p>
      </div>

      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${escapeHtml(reg.name)}</strong>!</p>
        
        <div style="background-color: #fdf2f8; border-left: 4px solid #db2777; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <strong style="color: #9d174d; font-size: 15px;">Você é nosso(a) convidado(a) especial!</strong>
          <p style="margin: 6px 0 0 0; color: #831843; font-size: 14px;">A comissão organizadora do Banco do Nordeste reservou a sua participação na celebração oficial dos 10 anos do Hubine.</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #6B1D2F; text-transform: uppercase; letter-spacing: 1px;">Informações do Evento e Credencial</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Número de Inscrição:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${reg.registrationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Nome no Crachá:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapeHtml(reg.badgeName || reg.name)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Instituição:</td>
              <td style="padding: 6px 0; color: #0f172a;">${escapeHtml(reg.institution)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Data do Evento:</td>
              <td style="padding: 6px 0; color: #0f172a;">4 de novembro de 2026</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Credenciamento:</td>
              <td style="padding: 6px 0; color: #0f172a;">A partir das 13h</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Local:</td>
              <td style="padding: 6px 0; color: #0f172a;">Auditório Celso Furtado — Campus Banco do Nordeste (Av. Dr. Silas Munguba, 5700 - Passaré, Fortaleza — CE)</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <strong style="color: #166534; font-size: 14px;">Orientações para o Credenciamento:</strong>
          <p style="margin: 6px 0 0 0; color: #15803d; font-size: 13.5px;">
            Ao chegar ao evento, apresente o seu <strong>QR Code individual</strong> diretamente no celular ou informe seu número de inscrição (<strong>${reg.registrationNumber}</strong>) no balcão de recepção para liberação e retirada do crachá.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${ticketUrl}" style="background-color: #6B1D2F; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Visualizar Comprovante & QR Code
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
          Caso precise atualizar informações (como o nome para crachá) ou cancelar sua participação previamente, utilize o link seguro:
          <br><a href="${manageUrl}" style="color: #6B1D2F; text-decoration: underline;">Atualizar Dados ou Cancelar Participação</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Convite institucional exclusivo do Banco do Nordeste — Hubine 10 Anos. Em caso de dúvidas, contate <a href="mailto:hubine10anos@bnb.gov.br" style="color: #64748b;">hubine10anos@bnb.gov.br</a>.
        </p>
      </div>
    </div>
  `;

  return sendMail({
    to: reg.email,
    subject,
    html,
    text: `Hubine 10 Anos - Convite de Honra para ${reg.name}. Inscrição: ${reg.registrationNumber}. Acesse seu comprovante com QR Code em: ${ticketUrl}`
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  isSmtpConfigured,
  sendMail,
  sendRegistrationConfirmation,
  sendWaitlistPromotion,
  sendSpeakerInvite,
  sendOrganizationGuestInvite,
  formatGuestWhatsappMessage
};
