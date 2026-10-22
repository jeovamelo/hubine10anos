const https = require('https');
const http = require('http');
const { URL } = require('url');
const db = require('./db');

function isConfigured() {
  return Boolean(
    process.env.EVOLUTION_API_URL &&
    process.env.EVOLUTION_API_KEY &&
    process.env.EVOLUTION_INSTANCE_NAME
  );
}

function getConfig() {
  let apiUrl = process.env.EVOLUTION_API_URL || '';
  if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
  return {
    apiUrl,
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || '',
    webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET || ''
  };
}

/**
 * Normaliza número de telefone priorizando o padrão brasileiro (DDI 55).
 * Rejeita números truncados ou que não possuam DDD e dígitos suficientes.
 */
function normalizePhoneNumber(raw) {
  if (!raw) return { valid: false, error: 'Número de telefone não informado.' };
  let digits = String(raw).replace(/\D/g, '');

  if (!digits) {
    return { valid: false, error: 'Número de telefone não contém dígitos numéricos.' };
  }

  // Se já inicia com 55 (DDI do Brasil)
  if (digits.startsWith('55')) {
    // 55 + DDD (2) + 8 ou 9 dígitos = 12 ou 13 dígitos
    if (digits.length === 12 || digits.length === 13) {
      const ddd = parseInt(digits.substring(2, 4), 10);
      if (ddd >= 11 && ddd <= 99) {
        return { valid: true, formatted: digits, ddi: '55', ddd: String(ddd) };
      }
    }
  }

  // Número brasileiro sem DDI
  // 10 dígitos: DDD (2) + 8 dígitos (ex: 8533334444)
  // 11 dígitos: DDD (2) + 9 dígitos (ex: 85999998888)
  if (digits.length === 10 || digits.length === 11) {
    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      return { valid: true, formatted: '55' + digits, ddi: '55', ddd: String(ddd) };
    }
  }

  // Validação de número internacional válido (12 a 15 dígitos com outro DDI)
  if (digits.length >= 10 && digits.length <= 15) {
    return { valid: true, formatted: digits, isInternational: true };
  }

  return {
    valid: false,
    error: 'Número inválido. Para números brasileiros, informe DDD e 8 ou 9 dígitos.'
  };
}

/**
 * Realiza requisição HTTP/HTTPS com timeout estrito de 10s.
 */
function makeRequest(urlString, method, headers, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlString);
    } catch (e) {
      return reject(new Error('URL inválida: ' + urlString));
    }

    const client = url.protocol === 'https:' ? https : http;
    const bodyString = payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null;

    const reqHeaders = {
      ...headers
    };
    if (bodyString) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
      timeout: timeoutMs
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = null; }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout na comunicação com Evolution API (${timeoutMs}ms)`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

/**
 * Consulta a saúde da instância no Evolution API.
 */
async function checkInstanceStatus() {
  if (!isConfigured()) {
    return {
      configured: false,
      connected: false,
      message: 'Evolution API não configurada nas variáveis de ambiente. Operando com preparação de link manual e simulação.'
    };
  }

  const { apiUrl, apiKey, instanceName } = getConfig();
  const url = `${apiUrl}/instance/connectionState/${instanceName}`;

  try {
    const res = await makeRequest(url, 'GET', { 'apikey': apiKey });
    if (res.statusCode >= 200 && res.statusCode < 300 && res.json) {
      const state = res.json.instance?.state || res.json.state || 'unknown';
      const isConnected = state === 'open';
      return {
        configured: true,
        connected: isConnected,
        state,
        instanceName,
        message: isConnected
          ? `Instância "${instanceName}" conectada e pronta para envio.`
          : `Instância "${instanceName}" no estado "${state}" (não conectada ao WhatsApp).`
      };
    } else {
      return {
        configured: true,
        connected: false,
        message: `Evolution API respondeu status HTTP ${res.statusCode}`
      };
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      message: `Falha de conexão com Evolution API: ${err.message}`
    };
  }
}

/**
 * Envia mensagem de texto via Evolution API ou simula em modo demonstração.
 */
async function sendTextMessage(recipientPhone, messageText, options = {}) {
  const { registrationId, operatorName = 'Sistema', isManualPreparation = false } = options;

  const phoneCheck = normalizePhoneNumber(recipientPhone);
  if (!phoneCheck.valid) {
    return {
      success: false,
      status: 'FALHOU',
      error: phoneCheck.error
    };
  }

  const toFormatted = phoneCheck.formatted;

  // Se for apenas preparação de link manual para envio pelo WhatsApp Web
  if (isManualPreparation) {
    const manualUrl = `https://api.whatsapp.com/send?phone=${toFormatted}&text=${encodeURIComponent(messageText)}`;
    const outboxItem = await db.addWhatsappOutbox({
      recipient: toFormatted,
      registrationId,
      message: messageText,
      mode: 'MANUAL_LINK',
      status: 'LINK_MANUAL_PREPARADO', // Explicita que é link preparado, NÃO mensagem enviada
      operatorName,
      preparedAt: new Date().toISOString()
    });

    return {
      success: true,
      mode: 'MANUAL_LINK',
      status: 'LINK_MANUAL_PREPARADO',
      whatsappUrl: manualUrl,
      outboxId: outboxItem.id
    };
  }

  // Idempotência: verifica se a mesma mensagem foi enviada nos últimos 60 segundos
  const recent = db.getWhatsappOutbox(20);
  const duplicate = recent.find(m =>
    m.recipient === toFormatted &&
    m.message === messageText &&
    (m.status === 'ENVIADO' || m.status === 'NA_FILA') &&
    (Date.now() - new Date(m.timestamp).getTime()) < 60000
  );
  if (duplicate) {
    return {
      success: true,
      idempotent: true,
      mode: duplicate.mode,
      status: duplicate.status,
      messageId: duplicate.providerMessageId || duplicate.id,
      outboxId: duplicate.id,
      message: 'Mensagem idêntica já enviada recentemente.'
    };
  }

  // Se a Evolution API não estiver configurada: modo demonstração explícito
  if (!isConfigured()) {
    const demoItem = await db.addWhatsappOutbox({
      recipient: toFormatted,
      registrationId,
      message: messageText,
      mode: 'DEMO',
      status: 'SIMULADO_DEMO',
      operatorName,
      recordedAt: new Date().toISOString()
    });

    console.log(`[WHATSAPP DEMO] Mensagem simulada para ${toFormatted} (${options.registrationNumber || ''})`);
    return {
      success: true,
      mode: 'DEMO',
      status: 'SIMULADO_DEMO',
      messageId: demoItem.id,
      outboxId: demoItem.id
    };
  }

  // Envio Real via Evolution API
  const { apiUrl, apiKey, instanceName } = getConfig();
  const sendUrl = `${apiUrl}/message/sendText/${instanceName}`;
  const payload = {
    number: toFormatted,
    text: messageText,
    options: {
      delay: 1200,
      presence: 'composing'
    }
  };

  try {
    const response = await makeRequest(sendUrl, 'POST', { 'apikey': apiKey }, payload, 10000);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const providerId = response.json?.key?.id || response.json?.messageId || ('evo_' + Date.now());
      
      const outboxItem = await db.addWhatsappOutbox({
        recipient: toFormatted,
        registrationId,
        message: messageText,
        mode: 'EVOLUTION_API',
        status: 'ENVIADO',
        providerMessageId: providerId,
        operatorName,
        sentAt: new Date().toISOString()
      });

      return {
        success: true,
        mode: 'EVOLUTION_API',
        status: 'ENVIADO',
        messageId: providerId,
        outboxId: outboxItem.id
      };
    } else {
      const errMsg = response.json?.message || response.data || `Status HTTP ${response.statusCode}`;
      console.error(`Falha no envio Evolution API (${toFormatted}):`, errMsg);

      const outboxItem = await db.addWhatsappOutbox({
        recipient: toFormatted,
        registrationId,
        message: messageText,
        mode: 'EVOLUTION_API',
        status: 'FALHOU',
        error: errMsg,
        operatorName,
        failedAt: new Date().toISOString()
      });

      return {
        success: false,
        mode: 'EVOLUTION_API',
        status: 'FALHOU',
        error: errMsg,
        outboxId: outboxItem.id
      };
    }
  } catch (err) {
    console.error(`Erro ao conectar com Evolution API para ${toFormatted}:`, err.message);

    const outboxItem = await db.addWhatsappOutbox({
      recipient: toFormatted,
      registrationId,
      message: messageText,
      mode: 'EVOLUTION_API',
      status: 'FALHOU',
      error: err.message,
      operatorName,
      failedAt: new Date().toISOString()
    });

    return {
      success: false,
      mode: 'EVOLUTION_API',
      status: 'FALHOU',
      error: err.message,
      outboxId: outboxItem.id
    };
  }
}

/**
 * Processamento idempotente de Webhook da Evolution API.
 */
async function handleWebhook(payload, headers = {}) {
  const { webhookSecret } = getConfig();
  if (webhookSecret) {
    const receivedSecret = headers['x-webhook-secret'] || headers['apikey'] || headers['authorization'];
    if (receivedSecret !== webhookSecret) {
      return { success: false, error: 'Assinatura/Secret do webhook inválido.' };
    }
  }

  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload vazio ou inválido.' };
  }

  const event = payload.event || payload.type || 'unknown';
  const data = payload.data || payload;

  let providerMessageId = null;
  let newStatus = null;

  if (event === 'messages.update' || event === 'message.update' || event === 'MESSAGES_UPDATE') {
    const key = data.key || {};
    providerMessageId = key.id;
    const statusStr = (data.status || data.update?.status || '').toUpperCase();

    if (statusStr.includes('DELIVERY') || statusStr === 'DELIVERED') {
      newStatus = 'ENTREGUE';
    } else if (statusStr.includes('READ') || statusStr === 'PLAYED') {
      newStatus = 'LIDO';
    } else if (statusStr.includes('SERVER') || statusStr === 'PENDING') {
      newStatus = 'ENVIADO';
    } else if (statusStr.includes('ERROR') || statusStr === 'FAILED') {
      newStatus = 'FALHOU';
    }
  } else if (event === 'send.message' || event === 'messages.upsert') {
    const key = data.key || {};
    providerMessageId = key.id;
    newStatus = 'ENVIADO';
  }

  if (providerMessageId && newStatus) {
    const existing = db.getWhatsappOutboxByProviderId(providerMessageId);
    if (existing) {
      await db.updateWhatsappOutbox(existing.id, {
        status: newStatus,
        lastWebhookEvent: event,
        webhookReceivedAt: new Date().toISOString()
      });

      // Atualiza também o participante caso vinculado
      if (existing.registrationId) {
        await db.updateRegistration(existing.registrationId, {
          invitationStatus: `WHATSAPP_${newStatus}`
        });
      }

      return { success: true, updated: true, providerMessageId, status: newStatus };
    }
  }

  return { success: true, updated: false, event };
}

module.exports = {
  isConfigured,
  normalizePhoneNumber,
  checkInstanceStatus,
  sendTextMessage,
  handleWebhook
};
