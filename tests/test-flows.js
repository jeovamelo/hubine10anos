// Testes Automatizados dos Fluxos do Hubine 10 Anos
const http = require('http');

let server;
let app;
const PORT = 3099;
const BASE_URL = 'http://localhost:' + PORT;

async function request(path, options = {}) {
  const url = BASE_URL + path;
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

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 Iniciando Bateria de Testes Funcionais - Hubine 10 Anos');
  console.log('========================================================\n');

  // Load app and start test server
  process.env.PORT = PORT;
  app = require('../server/server.js');
  server = app.listen(PORT);
  
  // Give server time to listen
  await new Promise(r => setTimeout(r, 600));

  try {
    // 1. Informações Públicas do Evento
    console.log('[Fluxo 1] Validação dos Dados Públicos do Evento');
    const infoRes = await request('/api/public/event-info');
    assert(infoRes.status === 200, 'Endpoint /api/public/event-info responde com status 200');
    assert(infoRes.data.eventName === 'Hubine 10 Anos', 'Nome do evento configurado como "Hubine 10 Anos"');
    assert(infoRes.data.eventDate === '2026-11-04', 'Data do evento é 4 de novembro de 2026');
    assert(infoRes.data.locationName.includes('Auditório Celso Furtado'), 'Local é o Auditório Celso Furtado');
    assert(infoRes.data.capacity > 0, 'Capacidade configurada e maior que zero');

    // 2. Programação e Palestrantes Aprovados
    console.log('\n[Fluxo 2] Grade de Programação e Palestrantes');
    const schedRes = await request('/api/public/schedule');
    assert(schedRes.status === 200, 'Grade de programação retorna status 200');
    assert(Array.isArray(schedRes.data) && schedRes.data.length >= 7, 'Programação contém os 7 momentos comemorativos');

    const spkRes = await request('/api/public/speakers');
    assert(spkRes.status === 200, 'Lista pública de palestrantes retorna status 200');
    assert(Array.isArray(spkRes.data), 'Retorna lista de palestrantes autorizados');

    // 3. Inscrição de Convidado (Sucesso e QR Code Seguro)
    console.log('\n[Fluxo 3] Inscrição de Convidado e Geração de Credencial');
    const guestEmail = 'participante.teste.' + Date.now() + '@empresa.com.br';
    const regRes = await request('/api/public/register', {
      method: 'POST',
      body: {
        name: 'Maria Clara Vasconcelos',
        email: guestEmail,
        institution: 'Startup InovaNordeste',
        profile: 'Startup',
        badgeName: 'Clara Vasconcelos',
        role: 'CEO & Fundadora',
        phone: '(85) 98888-7777',
        cityUf: 'Fortaleza / CE',
        accessibility: 'Rampa de acesso ao palco para painelista',
        futureEventsOptIn: true,
        privacyAccepted: true
      }
    });

    assert(regRes.status === 201, 'Inscrição criada com código HTTP 201 Created');
    assert(regRes.data.registrationNumber.startsWith('HUB10-'), 'Gera número de inscrição no padrão HUB10-XXXX');
    assert(regRes.data.token && regRes.data.token.length > 20, 'Gera token secreto seguro para autoatendimento');
    assert(regRes.data.status === 'CONFIRMADO', 'Participante confirmado com sucesso');

    const regToken = regRes.data.token;
    const regNumber = regRes.data.registrationNumber;

    // 4. Verificação de Duplicidade Discreta
    console.log('\n[Fluxo 4] Prevenção de Duplicidade de E-mail');
    const dupRes = await request('/api/public/register', {
      method: 'POST',
      body: {
        name: 'Outra Pessoa',
        email: guestEmail, // mesmo e-mail
        institution: 'Outra Empresa',
        profile: 'Empresa',
        privacyAccepted: true
      }
    });
    assert(dupRes.status === 409, 'Rejeita duplicidade com código HTTP 409 Conflict');
    assert(dupRes.data.error === 'DUPLICATE_EMAIL', 'Retorna erro padronizado DUPLICATE_EMAIL');

    // 5. Consulta e Autoatendimento do Participante
    console.log('\n[Fluxo 5] Autoatendimento e Comprovante Individual');
    const ticketRes = await request('/api/public/registration/' + regToken);
    assert(ticketRes.status === 200, 'Recupera comprovante com token seguro');
    assert(ticketRes.data.registrationNumber === regNumber, 'Número da inscrição coincide');
    assert(ticketRes.data.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'Gera imagem QR Code válida');
    assert(ticketRes.data.badgeName === 'Clara Vasconcelos', 'Nome para crachá recuperado corretamente');

    // Atualização de dados pelo participante
    const updateRes = await request('/api/public/registration/' + regToken, {
      method: 'PUT',
      body: {
        badgeName: 'Clara V. (InovaNordeste)',
        phone: '(85) 99999-0000'
      }
    });
    assert(updateRes.status === 200, 'Atualização de autoatendimento realizada com sucesso');
    assert(updateRes.data.registration.badgeName === 'Clara V. (InovaNordeste)', 'Nome no crachá atualizado');

    // 6. Autenticação Administrativa e Controle de Acesso (RBAC)
    console.log('\n[Fluxo 6] Autenticação e Perfis de Acesso (Administrador / Operador)');
    const adminLoginRes = await request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@hubine10anos.bnb.gov.br',
        password: 'HubineAdmin2026!'
      }
    });
    assert(adminLoginRes.status === 200, 'Login de Administrador bem-sucedido');
    assert(adminLoginRes.data.token, 'Token JWT retornado');
    const adminToken = adminLoginRes.data.token;

    const credLoginRes = await request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'credenciamento@hubine10anos.bnb.gov.br',
        password: 'Checkin2026!'
      }
    });
    assert(credLoginRes.status === 200, 'Login de Operador de Credenciamento bem-sucedido');
    const credToken = credLoginRes.data.token;

    // Tentativa de credenciamento acessar configurações (proibido)
    const forbiddenRes = await request('/api/admin/settings', {
      headers: { Authorization: 'Bearer ' + credToken }
    });
    assert(forbiddenRes.status === 403, 'Bloqueia acesso a configurações para operador de credenciamento (HTTP 403)');

    // 7. Credenciamento: Leitura de QR Code e Registro de Presença
    console.log('\n[Fluxo 7] Credenciamento (Check-in), Registro de Presença e Alerta de Duplicidade');
    const checkinRes = await request('/api/checkin/scan', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + credToken },
      body: { code: regNumber }
    });
    assert(checkinRes.status === 200, 'Check-in realizado com sucesso');
    assert(checkinRes.data.status === 'SUCCESS', 'Status de check-in retornado é SUCCESS');
    assert(checkinRes.data.attendee.registrationNumber === regNumber, 'Identifica participante correto');

    // Tentativa de segundo check-in com o mesmo participante (alerta)
    const duplicateCheckinRes = await request('/api/checkin/scan', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + credToken },
      body: { code: regNumber }
    });
    assert(duplicateCheckinRes.status === 409, 'Detecta e bloqueia check-in duplicado (HTTP 409)');
    assert(duplicateCheckinRes.data.status === 'ALREADY_CHECKED_IN', 'Status retornado é ALREADY_CHECKED_IN');
    assert(duplicateCheckinRes.data.operator, 'Informa o operador que fez o credenciamento prévio');

    // 8. Fluxo de Palestrante: Convite, Preenchimento e Aprovação
    console.log('\n[Fluxo 8] Fluxo de Palestrante (Convite Seguro e Revisão da Organização)');
    const inviteRes = await request('/api/admin/speakers/invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: {
        name: 'Carlos Eduardo Nogueira',
        email: 'carlos.nogueira.' + Date.now() + '@tech.com',
        talkTitle: 'Ecossistemas de Inovação e Inteligência Artificial',
        institution: 'Instituto de Inovação'
      }
    });
    assert(inviteRes.status === 201, 'Convite de palestrante gerado com sucesso');
    assert(inviteRes.data.speaker.inviteToken, 'Gera inviteToken individual seguro');
    const speakerInviteToken = inviteRes.data.speaker.inviteToken;
    const speakerId = inviteRes.data.speaker.id;

    // Palestrante acessa seu link e submete dados com autorização
    const submitSpeakerRes = await request('/api/speakers/invite/' + speakerInviteToken + '/submit', {
      method: 'POST',
      body: {
        professionalName: 'Dr. Carlos Eduardo Nogueira',
        role: 'Pesquisador Chefe de IA',
        institution: 'Instituto de Inovação Nordestina',
        talkTitle: 'Ecossistemas de Inovação e Inteligência Artificial no Nordeste',
        talkSummary: 'Apresentação prática sobre casos de uso de IA na produtividade regional.',
        bio: 'Doutor em Ciência da Computação com 15 anos de atuação.',
        avNeeds: 'Microfone sem fio e conexão HDMI',
        contact: '(85) 97777-6666',
        authorizedPublishing: true
      }
    });
    assert(submitSpeakerRes.status === 200, 'Palestrante envia dados com sucesso');
    assert(submitSpeakerRes.data.status === 'AGUARDANDO_REVISAO', 'Status do palestrante fica AGUARDANDO_REVISAO');

    // Organização revisa e aprova
    const approveRes = await request('/api/admin/speakers/' + speakerId + '/review', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { action: 'APPROVE' }
    });
    assert(approveRes.status === 200, 'Organização aprova e publica o palestrante');

    // 9. Exportação de Participantes para CSV / Excel
    console.log('\n[Fluxo 9] Exportação de Dados para Excel (CSV com UTF-8 BOM)');
    const csvRes = await request('/api/admin/export/csv', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(csvRes.status === 200, 'Endpoint de exportação responde com status 200');
    assert(csvRes.headers['content-type'].includes('text/csv'), 'Header Content-Type é text/csv');
    assert(csvRes.raw.startsWith('\uFEFF'), 'Inicia com Byte Order Mark (BOM) para compatibilidade perfeita com Excel');
    assert(csvRes.raw.includes('Maria Clara Vasconcelos'), 'Exportação contém o participante cadastrado');

    // 10. Desistência e Auto-promoção de Lista de Espera
    console.log('\n[Fluxo 10] Cancelamento de Inscrição e Liberação de Vaga');
    const cancelRes = await request('/api/public/registration/' + regToken + '/cancel', {
      method: 'POST'
    });
    assert(cancelRes.status === 200, 'Cancelamento voluntário processado com sucesso');

    // Consulta do comprovante após cancelamento
    const afterCancel = await request('/api/public/registration/' + regToken);
    assert(afterCancel.data.status === 'CANCELADO', 'Status refletido como CANCELADO');

    // 11. Login no Painel Restrito (Modo Demonstração e Modo Normal)
    console.log('\n[Fluxo 11] Login com Modo Demonstração e Credenciais Institucionais');
    // Checagem de disponibilidade de modo demonstração na API pública
    const demoCheckRes = await request('/api/public/event-info');
    assert(demoCheckRes.data.allowDemoLogin === true, 'Ambiente de desenvolvimento/teste expõe allowDemoLogin=true');

    // Testar login dos três usuários institucionais
    const orgLoginRes = await request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'organizacao@hubine10anos.bnb.gov.br',
        password: 'HubineOrg2026!'
      }
    });
    assert(orgLoginRes.status === 200, 'Login do perfil Organização bem-sucedido');
    assert(orgLoginRes.data.user.role === 'organizacao', 'Perfil retornado é organizacao');

    // Login com senha incorreta
    const invalidLoginRes = await request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@hubine10anos.bnb.gov.br',
        password: 'SenhaErrada123!'
      }
    });
    assert(invalidLoginRes.status === 401, 'Rejeita login com credenciais inválidas (HTTP 401)');

    // 12. Filtro de Participantes (Padrão CONFIRMADO, CANCELADO, TODOS) e Busca por WhatsApp
    console.log('\n[Fluxo 12] Filtros da Lista de Participantes e Busca por WhatsApp');
    // Filtro padrão sem status deve retornar apenas CONFIRMADO
    const defaultListRes = await request('/api/admin/registrations', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(defaultListRes.status === 200, 'Lista de participantes carrega com status 200');
    assert(defaultListRes.data.every(r => r.status === 'CONFIRMADO'), 'Filtro padrão exibe exclusivamente participantes CONFIRMADOS');

    // Filtro explícito de CANCELADO
    const cancelledListRes = await request('/api/admin/registrations?status=CANCELADO', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(cancelledListRes.status === 200, 'Filtro por CANCELADO responde com status 200');
    assert(cancelledListRes.data.some(r => r.token === regToken && r.status === 'CANCELADO'), 'Localiza o participante cancelado no filtro de CANCELADO');

    // Filtro TODOS (ALL)
    const allListRes = await request('/api/admin/registrations?status=ALL', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(allListRes.data.length >= defaultListRes.data.length, 'Filtro ALL traz todos os registros');

    // Busca por WhatsApp / telefone
    const searchWhatsappRes = await request('/api/admin/registrations?status=ALL&search=999990000', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(searchWhatsappRes.data.some(r => (r.whatsapp && r.whatsapp.includes('99999-0000')) || (r.phone && r.phone.includes('99999-0000'))), 'Busca por número de WhatsApp localiza participante');

    // 13. Cadastro de Participante Convidado pela Organização
    console.log('\n[Fluxo 13] Cadastro de Convidado da Organização, Bloqueio de Duplicidade e RBAC');
    const uniqueNum = Date.now().toString().slice(-4);
    const orgGuestEmail = 'roberto.finep.' + Date.now() + '@gov.br';
    const guestWhatsapp = '(85) 97777-' + uniqueNum;
    const guestPayload = {
      name: 'Dr. Roberto Magalhães',
      institution: 'FINEP - Financiadora de Estudos e Projetos',
      profile: 'Governo / Financiamento',
      email: orgGuestEmail,
      whatsapp: guestWhatsapp,
      badgeName: 'Roberto Magalhães',
      role: 'Diretor de Inovação',
      cityUf: 'Brasília / DF',
      accessibility: 'Acessibilidade motora para primeira fileira',
      internalNotes: 'Convidado de honra da Presidência do BNB'
    };

    // Operador de credenciamento tenta cadastrar convidado (deve ser bloqueado)
    const credGuestRes = await request('/api/admin/guests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + credToken },
      body: guestPayload
    });
    assert(credGuestRes.status === 403, 'Operador de credenciamento NÃO tem permissão para cadastrar convidados (HTTP 403)');

    // Administrador cadastra convidado
    const addGuestRes = await request('/api/admin/guests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: guestPayload
    });
    assert(addGuestRes.status === 201, 'Administrador cadastra convidado com sucesso (HTTP 201)');
    assert(addGuestRes.data.registration.registrationNumber.startsWith('HUB10-'), 'Gera número de inscrição padrão HUB10-XXXX para convidado');
    assert(addGuestRes.data.registration.origin === 'ORGANIZATION_INVITE', 'Origem registrada como ORGANIZATION_INVITE');
    assert(addGuestRes.data.registration.status === 'CONFIRMADO', 'Status inicial do convidado é CONFIRMADO');
    assert(addGuestRes.data.registration.invitedBy === 'Administrador Hubine', 'Registra autor do convite');
    assert(addGuestRes.data.registration.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'Gera QR Code seguro para credenciamento');

    const guestId = addGuestRes.data.registration.id;
    const guestNumber = addGuestRes.data.registration.registrationNumber;

    // Tentativa de duplicidade por e-mail
    const dupEmailRes = await request('/api/admin/guests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { ...guestPayload, whatsapp: '(85) 96666-5555' }
    });
    assert(dupEmailRes.status === 409 && dupEmailRes.data.error === 'DUPLICATE_EMAIL', 'Bloqueia cadastro de convidado com e-mail duplicado');

    // Tentativa de duplicidade por WhatsApp
    const dupWpRes = await request('/api/admin/guests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { ...guestPayload, email: 'outro.email.' + Date.now() + '@finep.gov.br' }
    });
    assert(dupWpRes.status === 409 && dupWpRes.data.error === 'DUPLICATE_WHATSAPP', 'Bloqueia cadastro de convidado com WhatsApp duplicado');

    // 14. Envio de Comunicação (E-mail e WhatsApp) e Reenvio
    console.log('\n[Fluxo 14] Comunicação com Convidado: E-mail, WhatsApp e Reenvio');
    const sendEmailRes = await request('/api/admin/guests/' + guestId + '/send-invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { channel: 'EMAIL' }
    });
    assert(sendEmailRes.status === 200, 'Envio de convite por e-mail processado com sucesso');
    assert(sendEmailRes.data.invitationStatus.startsWith('ENVIADO'), 'Status da comunicação atualizado para ENVIADO');
    assert(sendEmailRes.data.invitationChannel === 'EMAIL', 'Canal registrado como EMAIL');

    // Envio / Preparação para WhatsApp
    const sendWpRes = await request('/api/admin/guests/' + guestId + '/send-invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken },
      body: { channel: 'WHATSAPP' }
    });
    assert(sendWpRes.status === 200, 'Preparação de mensagem para WhatsApp retorna sucesso');
    assert(sendWpRes.data.whatsappMessage.includes('Hubine 10 Anos'), 'Mensagem de WhatsApp contém nome do evento');
    assert(sendWpRes.data.whatsappMessage.includes(guestNumber), 'Mensagem de WhatsApp contém número da inscrição');
    assert(sendWpRes.data.invitationChannel === 'WHATSAPP', 'Canal registrado como WHATSAPP');

    // Reenvio de convite via endpoint de resend
    const resendRes = await request('/api/admin/registrations/' + guestId + '/resend', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(resendRes.status === 200, 'Reenvio de convite processado com sucesso');

    // 15. Check-in de Participante Convidado no Credenciamento
    console.log('\n[Fluxo 15] Check-in do Participante Convidado no Credenciamento');
    const guestCheckinRes = await request('/api/checkin/scan', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + credToken },
      body: { code: guestNumber }
    });
    assert(guestCheckinRes.status === 200, 'Check-in do convidado realizado com sucesso');
    assert(guestCheckinRes.data.status === 'SUCCESS', 'Status de resposta do check-in é SUCCESS');
    assert(guestCheckinRes.data.attendee.registrationNumber === guestNumber, 'Confirma dados do convidado no check-in');
    assert(guestCheckinRes.data.attendee.status === 'PRESENTE', 'Status do convidado atualizado para PRESENTE');

    // 16. Logs de Auditoria e Segurança de JWT em Produção
    console.log('\n[Fluxo 16] Logs de Auditoria e Segurança de JWT em Produção');
    const auditRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    assert(auditRes.status === 200, 'Consulta aos logs de auditoria retorna status 200');
    assert(auditRes.data.some(l => l.action === 'CONVITE_ORGANIZACAO_CRIADO'), 'Audit log contém registro de CONVITE_ORGANIZACAO_CRIADO');
    assert(auditRes.data.some(l => l.action === 'CONVITE_ORGANIZACAO_ENVIADO_EMAIL'), 'Audit log contém registro de CONVITE_ORGANIZACAO_ENVIADO_EMAIL');

    // Validação de segurança: JWT_SECRET padrão deve falhar em produção
    const authModule = require('../server/auth');
    const prevNodeEnv = process.env.NODE_ENV;
    const prevJwtSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      let caughtError = false;
      try {
        authModule.getJwtSecret();
      } catch (e) {
        caughtError = true;
        assert(e.message.includes('ERRO CRÍTICO DE SEGURANÇA'), 'Bloqueia JWT_SECRET padrão em ambiente de produção');
      }
      assert(caughtError === true, 'getJwtSecret() lança exceção se JWT_SECRET não configurado em produção');
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevJwtSecret) process.env.JWT_SECRET = prevJwtSecret;
    }

    console.log('\n========================================================');
    console.log('✅ TODOS OS 16 FLUXOS FORAM EXECUTADOS COM SUCESSO TOTAL!');
    console.log('========================================================\n');
    if (server) server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERRO DURANTE A EXECUÇÃO DOS TESTES:', err);
    process.exit(1);
  }
}

runTests();

