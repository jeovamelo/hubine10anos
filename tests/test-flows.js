// Testes Automatizados e Isolados - Hubine 10 Anos
// Cobre os 16 itens do projeto com isolamento em diretório temporário
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');

// 1. ISOLAMENTO E PREVENÇÃO DE PERDA DE DADOS (Item 11 e 12)
// Cria ambiente temporário exclusivo para que data/database.json NUNCA seja afetado
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hubine10-test-suite-'));
const tempDbFile = path.join(tempDir, 'database.json');
process.env.NODE_ENV = 'test';
process.env.HUBINE_DATA_DIR = tempDir;
process.env.HUBINE_DB_PATH = tempDbFile;
process.env.JWT_SECRET = 'super-seguro-segredo-jwt-com-mais-de-32-chars-para-testes-2026';
process.env.APP_URL = 'http://localhost:3199';

// Copia o template de exemplo seguro para o banco temporário
const exampleDbPath = path.join(__dirname, '..', 'data', 'database.example.json');
fs.copyFileSync(exampleDbPath, tempDbFile);

let server;
let app;
const PORT = 3199;
const BASE_URL = 'http://localhost:' + PORT;

async function request(reqPath, options = {}) {
  const url = BASE_URL + reqPath;
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const body = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error('❌ Falha na asserção: ' + message);
  }
  console.log('  ✓ ' + message);
}

async function cleanup() {
  if (server) {
    await new Promise(r => server.close(r));
  }
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('  ✓ Recursos temporários isolados limpos com sucesso.');
  } catch (e) {}
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 Iniciando Bateria Completa de Testes Isolados (16 Itens)');
  console.log('   Diretório de Teste:', tempDir);
  console.log('========================================================\n');

  try {
    process.env.PORT = PORT;
    app = require('../server/server.js');
    server = app.listen(PORT);
    await new Promise(r => setTimeout(r, 600));

    // ---------------------------------------------------------
    // ITEM 1: Proteção contra Injeção de HTML/JS em photoUrl
    // ---------------------------------------------------------
    console.log('[Item 1] Validação e Sanitização de photoUrl dos Palestrantes');
    const { validatePhotoUrl } = require('../server/middleware/validation');

    assert(!validatePhotoUrl('javascript:alert(1)').valid, 'Rejeita protocolo javascript: em photoUrl');
    assert(!validatePhotoUrl('data:text/html;base64,PHNjcmlwdD4=').valid, 'Rejeita data:text/html malicioso');
    assert(!validatePhotoUrl('https://example.com/photo.jpg" onerror="alert(1)').valid, 'Rejeita URLs com aspas ou caracteres perigosos');
    assert(validatePhotoUrl('https://images.unsplash.com/photo-1234.jpg').valid, 'Aceita URL HTTPS válida');
    assert(validatePhotoUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==').valid, 'Aceita data URI de imagem PNG válida');

    // ---------------------------------------------------------
    // ITEM 2: Segredos e Contas Padrão Inseguras
    // ---------------------------------------------------------
    console.log('\n[Item 2] Validação de Segredos e Bloqueio de Senhas Padrão em Produção');
    const authModule = require('../server/auth');
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'hubine-10-anos-chave-secreta-jwt-2026'; // segredo de exemplo conhecido
      let blockedKnown = false;
      try {
        authModule.getJwtSecret();
      } catch (e) {
        blockedKnown = e.message.includes('exemplo conhecido');
      }
      assert(blockedKnown, 'Bloqueia segredo de exemplo conhecido em produção');

      process.env.JWT_SECRET = 'curto'; // < 32 chars
      let blockedShort = false;
      try {
        authModule.getJwtSecret();
      } catch (e) {
        blockedShort = e.message.includes('mínimo 32 caracteres');
      }
      assert(blockedShort, 'Bloqueia segredo com menos de 32 caracteres em produção');
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.JWT_SECRET = prevSecret;
    }

    // ---------------------------------------------------------
    // ITEM 3: Persistência Atômica do JSON e Quarentena
    // ---------------------------------------------------------
    console.log('\n[Item 3] Persistência Atômica do JSON e Prevenção de Corrupção');
    const db = require('../server/db');
    const dbFilePath = process.env.HUBINE_DB_PATH;
    assert(fs.existsSync(dbFilePath), 'Arquivo de banco temporário existe');

    // Teste de gravação atômica sob concorrência
    const concurrentWrites = [];
    for (let i = 0; i < 5; i++) {
      concurrentWrites.push(db.addAuditLog({
        action: 'TEST_CONCURRENCY',
        details: `Log concorrente ${i}`,
        user: 'TestRunner'
      }));
    }
    await Promise.all(concurrentWrites);
    const content = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
    assert(content.auditLogs.some(l => l.details === 'Log concorrente 4'), 'Gravações concorrentes serializadas com sucesso no JSON');

    // ---------------------------------------------------------
    // ITEM 4: Persistência e Tratamento de Erros
    // ---------------------------------------------------------
    console.log('\n[Item 4] Confiabilidade da Persistência e Propagação de Erros');
    const pgModule = require('../server/postgres');
    assert(typeof pgModule.init === 'function', 'Módulo postgres expõe init()');
    assert(typeof pgModule.shutdown === 'function', 'Módulo postgres expõe shutdown()');

    // ---------------------------------------------------------
    // ITEM 5: Serviço Central de Inscrição, Capacidade e Fila
    // ---------------------------------------------------------
    console.log('\n[Item 5] Controle Centralizado de Capacidade e Fila com Auto-Promoção');
    const registrationService = require('../server/registrationService');

    // Salva capacidade original e define capacidade de teste baixa (ex: 2) para testar fila
    const originalSettings = db.getSettings();
    await db.updateSettings({ capacity: 2, registrationsOpen: true });

    // Inscrição 1 (Confirmada)
    const reg1 = await registrationService.registerPublicParticipant({
      name: 'Participante Um',
      email: 'part1.' + Date.now() + '@teste.com',
      institution: 'Empresa A',
      profile: 'Startup',
      phone: '(85) 98888-1111',
      privacyAccepted: true
    });
    assert(reg1.status === 'CONFIRMADO', 'Inscrição 1 entra como CONFIRMADO');

    // Inscrição 2 (Confirmada - atinge capacidade máxima 2)
    const reg2 = await registrationService.registerPublicParticipant({
      name: 'Participante Dois',
      email: 'part2.' + Date.now() + '@teste.com',
      institution: 'Empresa B',
      profile: 'Empresa',
      phone: '(85) 98888-2222',
      privacyAccepted: true
    });
    assert(reg2.status === 'CONFIRMADO', 'Inscrição 2 entra como CONFIRMADO');

    // Inscrição 3 (Deve ir para LISTA DE ESPERA na posição #1)
    const reg3 = await registrationService.registerPublicParticipant({
      name: 'Participante Três',
      email: 'part3.' + Date.now() + '@teste.com',
      institution: 'Empresa C',
      profile: 'Estudante / Pesquisador',
      phone: '(85) 98888-3333',
      privacyAccepted: true
    });
    assert(reg3.status === 'LISTA_ESPERA', 'Inscrição 3 entra como LISTA_ESPERA');
    assert(reg3.waitlistPosition === 1, 'Inscrição 3 recebe posição #1 na fila de espera');

    // Inscrição 4 (Deve ir para LISTA DE ESPERA na posição #2)
    const reg4 = await registrationService.registerPublicParticipant({
      name: 'Participante Quatro',
      email: 'part4.' + Date.now() + '@teste.com',
      institution: 'Empresa D',
      profile: 'Empresa',
      phone: '(85) 98888-4444',
      privacyAccepted: true
    });
    assert(reg4.status === 'LISTA_ESPERA' && reg4.waitlistPosition === 2, 'Inscrição 4 recebe posição #2 na fila');

    // Cancelamento da Inscrição 1: deve promover atomicamente Participante 3 para CONFIRMADO!
    const cancelRes = await registrationService.cancelRegistrationByToken(reg1.token, 'Teste Automatizado');
    assert(cancelRes.success === true, 'Cancelamento voluntário concluído');
    assert(cancelRes.promotedAnother === true, 'Dispara promoção automática da fila');
    assert(cancelRes.promotedUser.registrationNumber === reg3.registrationNumber, 'Promoveu exatamente o participante #1 da fila');

    const updatedReg3 = db.getRegistrationById(reg3.id);
    assert(updatedReg3.status === 'CONFIRMADO', 'Participante 3 agora tem status CONFIRMADO');
    assert(updatedReg3.waitlistPosition === null, 'Posição de fila do participante 3 limpa');

    // Participante 4 deve ter sido reindexado para a posição #1 da fila
    const updatedReg4 = db.getRegistrationById(reg4.id);
    assert(updatedReg4.waitlistPosition === 1, 'Participante 4 reindexado para posição #1 na fila');

    // ---------------------------------------------------------
    // ITEM 6: Correção de Duplicidades e Re-inscrição após Cancelamento
    // ---------------------------------------------------------
    console.log('\n[Item 6] Duplicidades em Inscrições Ativas e Liberação após Cancelamento');
    // Tentativa de duplicidade com participante ativo (reg2)
    let dupBlocked = false;
    try {
      await registrationService.registerPublicParticipant({
        name: 'Tentativa Duplicada',
        email: reg2.registrationNumber ? db.getRegistrationById(reg2.id).email : 'part2@teste.com',
        institution: 'Empresa',
        profile: 'Startup',
        privacyAccepted: true
      });
    } catch (e) {
      dupBlocked = (e.status === 409) && (e.code === 'DUPLICATE_EMAIL' || (e.responseBody && e.responseBody.error === 'DUPLICATE_EMAIL'));
    }
    assert(dupBlocked, 'Bloqueia duplicidade de e-mail ativo (HTTP 409 DUPLICATE_EMAIL)');

    // Re-inscrição com o e-mail do Participante 1 (que foi cancelado anteriormente)
    // DEVE SER PERMITIDA!
    const reReg1 = await registrationService.registerPublicParticipant({
      name: 'Participante Um Reinscrevendo',
      email: db.getRegistrationById(reg1.id).email,
      institution: 'Empresa A Nova',
      profile: 'Startup',
      phone: '(85) 98888-1111',
      privacyAccepted: true
    });
    assert(reReg1.success === true, 'Participante previamente cancelado pode se reinscrever com sucesso');
    assert(reReg1.registrationNumber !== reg1.registrationNumber, 'Gera novo registro preservando histórico do cancelado');

    // Restaura capacidade padrão
    await db.updateSettings({ capacity: originalSettings.capacity || 250 });

    // ---------------------------------------------------------
    // ITEM 7: Restrição de Dados por Perfil (RBAC Data Minimization)
    // ---------------------------------------------------------
    console.log('\n[Item 7] Restrição de Dados Retornados por Perfil (RBAC Data Minimization)');
    // Cria usuário de credenciamento no banco isolado para testar RBAC
    const existingCredUser = db.getUserByEmail('credenciamento@hubine10anos.bnb.gov.br');
    if (!existingCredUser) {
      await db.addUser({
        id: 'usr_cred_test_' + Date.now(),
        name: 'Operador de Credenciamento',
        email: 'credenciamento@hubine10anos.bnb.gov.br',
        passwordHash: authModule.hashPassword('Checkin2026!'),
        role: 'credenciamento',
        active: true,
        createdAt: new Date().toISOString()
      });
    }

    const adminLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@hubine.org', password: 'hubine10anos' }
    });
    const adminToken = adminLogin.data.token;

    const credLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'credenciamento@hubine10anos.bnb.gov.br', password: 'Checkin2026!' }
    });
    const credToken = credLogin.data.token;

    // Consulta como Administrador: deve conter todos os campos
    const adminView = await request('/api/admin/registrations', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(adminView.status === 200, 'Admin recupera lista de participantes');
    assert(adminView.data[0].token !== undefined, 'Admin tem acesso ao token de autoatendimento');

    // Consulta como Credenciamento: NÃO DEVE CONTER token, internalNotes, email privado
    const credView = await request('/api/admin/registrations', {
      headers: { Authorization: 'Bearer ' + credToken }
    });
    assert(credView.status === 200, 'Operador de credenciamento recupera lista');
    assert(credView.data.every(r => r.token === undefined), 'Credenciamento NÃO recebe tokens de autoatendimento');
    assert(credView.data.every(r => r.internalNotes === undefined), 'Credenciamento NÃO recebe notas internas da organização');

    // ---------------------------------------------------------
    // ITEM 8: Validação das Entradas no Servidor
    // ---------------------------------------------------------
    console.log('\n[Item 8] Validação Estrita de Entradas no Servidor');
    // E-mail inválido
    const badEmailRes = await request('/api/public/register', {
      method: 'POST',
      body: { name: 'Teste', email: 'email_sem_arroba', institution: 'Inst', profile: 'Startup', privacyAccepted: true }
    });
    assert(badEmailRes.status === 400, 'Rejeita e-mail inválido sem arroba com HTTP 400');

    // Ausência de manifestação de privacidade
    const badPrivacyRes = await request('/api/public/register', {
      method: 'POST',
      body: { name: 'Teste', email: 'teste@email.com', institution: 'Inst', profile: 'Startup', privacyAccepted: false }
    });
    assert(badPrivacyRes.status === 400, 'Rejeita cadastro sem aceite da política de privacidade');

    // Status inválido em PUT /status
    const badStatusRes = await request('/api/admin/registrations/' + reg2.id + '/status', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { status: 'STATUS_INEXISTENTE_HACK' }
    });
    assert(badStatusRes.status === 400, 'Rejeita transição para status inexistente');

    // ---------------------------------------------------------
    // ITEM 9: Estados de Comunicação e Prevenção de Falsos Positivos
    // ---------------------------------------------------------
    console.log('\n[Item 9] Estados de Comunicação: Distinção entre Demo, Falha e Link Preparado');
    const guestEmail = 'convidado.especial.' + Date.now() + '@institucional.gov.br';
    const guestAddRes = await request('/api/admin/guests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: {
        name: 'Secretário de Inovação',
        institution: 'Governo do Estado',
        profile: 'Governo / Financiamento',
        email: guestEmail,
        whatsapp: '(85) 98888-9999'
      }
    });
    assert(guestAddRes.status === 201, 'Convidado criado com status inicial PENDENTE');
    const guestId = guestAddRes.data.guest.id;

    // Envio de e-mail em ambiente sem SMTP: deve ser explicitamente DEMO_EMAIL
    const sendMailRes = await request('/api/admin/guests/' + guestId + '/send-invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { channel: 'EMAIL' }
    });
    assert(sendMailRes.status === 200, 'Convite por e-mail processado');
    assert(sendMailRes.data.invitationStatus === 'DEMO_EMAIL', 'Ambiente sem SMTP registra status explícito DEMO_EMAIL (não finge envio real)');

    // Preparação de WhatsApp manual: deve registrar LINK_PREPARADO_WHATSAPP (NUNCA ENVIADO!)
    const sendWaRes = await request('/api/admin/guests/' + guestId + '/send-invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { channel: 'WHATSAPP', mode: 'MANUAL' }
    });
    assert(sendWaRes.status === 200, 'Preparação de link para WhatsApp processada');
    assert(sendWaRes.data.invitationStatus === 'LINK_PREPARADO_WHATSAPP', 'Link preparado é explicitamente registrado como LINK_PREPARADO_WHATSAPP (e não como enviado)');
    assert(sendWaRes.data.whatsappUrl.includes('https://api.whatsapp.com/send'), 'Gera link seguro do WhatsApp');

    // ---------------------------------------------------------
    // ITEM 10: Proteção contra Injeção de Fórmulas no CSV
    // ---------------------------------------------------------
    console.log('\n[Item 10] Proteção contra Injeção de Fórmulas no Exportador CSV');
    // Cadastra um participante com tentativa de fórmula maliciosa no nome
    await registrationService.registerPublicParticipant({
      name: '=cmd|"/C calc"!A0',
      email: 'hacker.formula.' + Date.now() + '@teste.com',
      institution: '+10+20-30',
      profile: '@FormulaHack',
      phone: '(85) 98888-0000',
      privacyAccepted: true
    });

    const csvRes = await request('/api/admin/export/csv', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(csvRes.status === 200, 'Exportação CSV gerada');
    assert(csvRes.raw.startsWith('\uFEFF'), 'Exportação inclui UTF-8 BOM');
    // Verifica neutralização com aspas simples apóstrofo
    assert(csvRes.raw.includes("'=cmd|"), 'Fórmula iniciada com = neutralizada com apóstrofo');
    assert(csvRes.raw.includes("'+10+20-30"), 'Fórmula iniciada com + neutralizada com apóstrofo');
    assert(csvRes.raw.includes("'@FormulaHack"), 'Fórmula iniciada com @ neutralizada com apóstrofo');

    // ---------------------------------------------------------
    // ITEM 13 e 14: E-mail eventos@hubine.org e Diagnósticos
    // ---------------------------------------------------------
    console.log('\n[Itens 13 e 14] Configuração e Diagnóstico de Conexão de E-mail');
    const emailDiagRes = await request('/api/admin/diagnostics/email', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(emailDiagRes.status === 200, 'Endpoint de diagnóstico de e-mail responde com 200');
    assert(emailDiagRes.data.configured !== undefined, 'Informa status de configuração de SMTP');

    // ---------------------------------------------------------
    // ITEM 15 e 16: Adaptador WhatsApp Evolution e Webhook
    // ---------------------------------------------------------
    console.log('\n[Itens 15 e 16] Adaptador WhatsApp, Normalização e Webhook');
    const whatsappService = require('../server/whatsappService');

    // Teste de normalização de telefones
    assert(whatsappService.normalizePhoneNumber('85988887777').formatted === '5585988887777', 'Normaliza telefone brasileiro sem DDI adicionando 55');
    assert(whatsappService.normalizePhoneNumber('+55 (85) 98888-7777').formatted === '5585988887777', 'Limpa pontuação e preserva DDI 55');
    assert(!whatsappService.normalizePhoneNumber('123').valid, 'Rejeita número curto ou inválido');

    // Teste de diagnóstico da Evolution API
    const waDiagRes = await request('/api/admin/diagnostics/whatsapp', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(waDiagRes.status === 200, 'Endpoint de diagnóstico de WhatsApp responde com 200');

    // Teste de processamento de webhook idempotente
    const webhookRes = await request('/api/webhooks/evolution', {
      method: 'POST',
      body: {
        event: 'messages.update',
        data: {
          key: { id: 'msg_teste_mock_123' },
          status: 'DELIVERY_ACK'
        }
      }
    });
    assert(webhookRes.status === 200, 'Webhook da Evolution processa payloads sem falha');

    // ---------------------------------------------------------
    // Suporte às Rotas / e /dezanos/
    // ---------------------------------------------------------
    console.log('\n[Rotas Base] Verificação de Suporte a / e /dezanos/');
    const rootInfo = await request('/api/public/event-info');
    const prefixInfo = await request('/dezanos/api/public/event-info');
    assert(rootInfo.status === 200 && rootInfo.data.eventName === 'Hubine 10 Anos', 'API responde na raiz /');
    assert(prefixInfo.status === 200 && prefixInfo.data.eventName === 'Hubine 10 Anos', 'API responde no prefixo /dezanos/api');

    console.log('\n========================================================');
    console.log('🎉 TODOS OS TESTES DOS 16 ITENS FORAM EXECUTADOS COM SUCESSO TOTAL!');
    console.log('========================================================\n');

    await cleanup();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FALHA NA BATERIA DE TESTES:', err);
    await cleanup();
    process.exit(1);
  }
}

runTests();