const db = require('./db');
const { hashPassword } = require('./auth');
const crypto = require('crypto');

async function seed() {
  await db.initPostgres();
  console.log('--- Iniciando Seed do Hubine 10 Anos ---');

  // 1. Initial Users Bootstrap
  const existingUsers = db.getUsers();
  if (existingUsers.length === 0) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      console.log('Ambiente de PRODUÇÃO detectado: inicialização segura de credenciais...');
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@hubine10anos.bnb.gov.br';
      let adminPass = process.env.INITIAL_ADMIN_PASSWORD;

      if (!adminPass) {
        adminPass = crypto.randomBytes(16).toString('hex') + 'A1!';
        console.warn('⚠️ [SEGURANÇA] INITIAL_ADMIN_PASSWORD não foi informada via .env.');
        console.warn(`🔑 [SEGURANÇA] Senha provisória gerada para ${adminEmail}: ${adminPass}`);
        console.warn('   Altere esta senha imediatamente após o primeiro acesso via painel administrativo.');
      }

      await db.addUser({
        id: 'usr_admin_prod',
        name: 'Administrador Hubine',
        email: adminEmail,
        passwordHash: hashPassword(adminPass),
        role: 'administrador',
        active: true,
        createdAt: new Date().toISOString()
      });
      console.log(`✅ [Produção] Usuário administrador inicial configurado para: ${adminEmail}`);
    } else {
      console.log('Criando usuários institucionais de demonstração/desenvolvimento...');

      await db.addUser({
        id: 'usr_admin_01',
        name: 'Administrador Hubine',
        email: 'admin@hubine10anos.bnb.gov.br',
        passwordHash: hashPassword('HubineAdmin2026!'),
        role: 'administrador',
        active: true,
        createdAt: new Date().toISOString()
      });

      await db.addUser({
        id: 'usr_org_01',
        name: 'Comissão Organizadora',
        email: 'organizacao@hubine10anos.bnb.gov.br',
        passwordHash: hashPassword('HubineOrg2026!'),
        role: 'organizacao',
        active: true,
        createdAt: new Date().toISOString()
      });

      await db.addUser({
        id: 'usr_cred_01',
        name: 'Equipe de Credenciamento',
        email: 'credenciamento@hubine10anos.bnb.gov.br',
        passwordHash: hashPassword('Checkin2026!'),
        role: 'credenciamento',
        active: true,
        createdAt: new Date().toISOString()
      });

      console.log('✅ Usuários de demonstração criados com sucesso:');
      console.log('   - Administrador: admin@hubine10anos.bnb.gov.br (Senha: HubineAdmin2026!)');
      console.log('   - Organização: organizacao@hubine10anos.bnb.gov.br (Senha: HubineOrg2026!)');
      console.log('   - Credenciamento: credenciamento@hubine10anos.bnb.gov.br (Senha: Checkin2026!)');
    }
  }

  // 2. Schedule Seed (Official agenda from prompt)
  const existingSchedule = db.getSchedule();
  if (existingSchedule.length === 0) {
    console.log('Criando grade de programação oficial prevista...');
    const defaultSchedule = [
      {
        id: 'sch_1',
        time: '13:00',
        title: 'Credenciamento e entrega do mural artístico Cultura & Inovação',
        speaker: 'Recepção e Acolhimento',
        institution: 'Hubine / Banco do Nordeste',
        type: 'credenciamento',
        description: 'Início do credenciamento dos convidados, recepção no foyer do Auditório Celso Furtado e entrega da intervenção artística comemorativa.'
      },
      {
        id: 'sch_2',
        time: '14:00',
        title: 'Momento Institucional de Abertura',
        speaker: 'Ana Teresa Barbosa de Carvalho e Alexandre Silva Cavalcante',
        institution: 'Banco do Nordeste',
        type: 'institucional',
        description: 'Abertura oficial comemorativa dos 10 anos do Hubine, boas-vindas aos participantes e pronunciamento dos dirigentes.'
      },
      {
        id: 'sch_3',
        time: '14:20',
        title: 'Painel: Conectando ideias e soluções — o papel do Hubine no ecossistema de inovação',
        speaker: 'Lideranças do Ecossistema e Gestão Hubine',
        institution: 'Hubine e Parceiros Regionais',
        type: 'painel',
        description: 'Debate estratégico sobre o impacto regional das ações do Hubine na aceleração de startups, incubação e desenvolvimento socioeconômico.'
      },
      {
        id: 'sch_4',
        time: '15:00',
        title: 'Palestra: Do conflito à criação — o poder das diferentes gerações na inovação organizacional',
        speaker: 'Roberta Fernandes Damasceno',
        institution: 'CESAR',
        type: 'palestra',
        description: 'Reflexões sobre colaboração intergeracional, sinergia cultural e aceleração de novos modelos mentais nas organizações.'
      },
      {
        id: 'sch_5',
        time: '16:00',
        title: 'Palestra: O futuro é agora!',
        speaker: 'Márcia Tereza Almeida',
        institution: 'Banco do Brasil',
        type: 'palestra',
        description: 'Transformação digital, governança de inovação aberta e as fronteiras do setor financeiro no Brasil.'
      },
      {
        id: 'sch_6',
        time: '17:00',
        title: 'Reconhecimento e homenagens a funcionários, parceiros e iniciativas',
        speaker: 'Comissão Especial Hubine 10 Anos',
        institution: 'Banco do Nordeste',
        type: 'homenagem',
        description: 'Cerimônia de premiação e tributo às trajetórias que construíram a primeira década do Hub de Inovação.'
      },
      {
        id: 'sch_7',
        time: '17:20',
        title: 'Encerramento, agradecimentos e coquetel de confraternização',
        speaker: 'Equipe Hubine',
        institution: 'Hubine / BNB',
        type: 'encerramento',
        description: 'Momento de networking, confraternização e celebração entre os convidados e representantes do ecossistema.'
      }
    ];

    await db.updateSchedule(defaultSchedule);
    console.log('✅ Grade de programação oficial configurada com 7 momentos.');
  }

  // 3. Initial Speakers matching program
  const existingSpeakers = db.getSpeakers();
  if (existingSpeakers.length === 0) {
    console.log('Criando palestrantes previstos para a programação...');
    const defaultSpeakers = [
      {
        id: 'spk_1',
        name: 'Roberta Fernandes Damasceno',
        role: 'Especialista em Inovação e Cultura Organizacional',
        institution: 'CESAR',
        talkTitle: 'Do conflito à criação — o poder das diferentes gerações na inovação organizacional',
        talkSummary: 'Exploração prática de como conectar gerações distintas para impulsionar a criatividade e a inovação nas empresas contemporâneas.',
        bio: 'Atua com design estratégico, cultura de inovação e desenvolvimento de lideranças no CESAR.',
        photoUrl: '', // Editable / will show stylized monogram badge until uploaded
        inviteToken: 'spk_token_roberta_cesar_2026',
        status: 'APROVADO',
        avNeeds: 'Microfone auricular, apresentador de slides e conexão HDMI.',
        email: 'roberta.damasceno@cesar.org.br',
        authorizedPublishing: true,
        isApproved: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'spk_2',
        name: 'Márcia Tereza Almeida',
        role: 'Executiva de Transformação e Inovação',
        institution: 'Banco do Brasil',
        talkTitle: 'O futuro é agora!',
        talkSummary: 'Visão de vanguarda sobre tecnologias emergentes, IA aplicada e o futuro do ecossistema financeiro.',
        bio: 'Lidera projetos de inovação aberta e aceleração corporativa.',
        photoUrl: '',
        inviteToken: 'spk_token_marcia_bb_2026',
        status: 'APROVADO',
        avNeeds: 'Microfone de mão e áudio do notebook.',
        email: 'marcia.almeida@bb.com.br',
        authorizedPublishing: true,
        isApproved: true,
        createdAt: new Date().toISOString()
      }
    ];

    for (const spk of defaultSpeakers) {
      await db.addSpeaker(spk);
    }
    console.log('✅ Palestrantes iniciais aprovados cadastrados.');
  }

  // 4. Initial Audit Log
  await db.addAuditLog({
    action: 'SISTEMA_INICIALIZADO',
    details: 'Base de dados do evento Hubine 10 Anos inicializada com sucesso.',
    user: 'Sistema'
  });

  console.log('--- Seed Concluído com Sucesso ---');
}

seed().catch(console.error);
