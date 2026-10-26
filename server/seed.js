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
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@hubine.org';
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
        email: 'admin@hubine.org',
        passwordHash: hashPassword('hubine10anos'),
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
      console.log('   - Administrador: admin@hubine.org (Senha: hubine10anos)');
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
        role: 'Diretora de Cultura e ESG',
        institution: 'CESAR',
        talkTitle: 'Do conflito à criação — o poder das diferentes gerações na inovação organizacional',
        talkSummary: 'Reflexões sobre cultura organizacional, inclusão, diversidade e sustentabilidade.',
        bio: 'Sou Beta — às vezes também Roberta. Mãe de Laís e Lucas, comunicadora por formação e apaixonada por gente como escolha de vida. Gosto de dizer que sou plantadora de jabuticabas: semeando hoje, no campo do ESG, para que as próximas gerações colham uma sociedade mais justa, igualitária e humana. Sou formada em Jornalismo pela Universidade Católica de Pernambuco, com pós-graduação em Comunicação e Marketing pela UFPE, executiva formada no Advanced ESG Program da Saint Paul, Master in Strategic Transformation pela CESAR School e Conselheira de Alta Performance (PDeC Raízes) pelo IBGC. Com mais de 33 anos de trajetória em jornalismo, publicidade, comunicação empresarial e marketing, construí grande parte da minha jornada no CESAR, onde trabalho há mais de 28 anos e hoje atuo como Diretora de Cultura e ESG.',
        photoUrl: '/dezanos/assets/speakers/roberta-damasceno.jpeg',
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
        name: 'Márcia Tereza Almeida Campos',
        role: 'Gestora de Soluções em Tecnologia',
        institution: 'Banco do Brasil',
        talkTitle: 'O futuro é agora!',
        talkSummary: 'Inovação, inteligência artificial e futuro do trabalho.',
        bio: 'Márcia Tereza Almeida Campos é economista, com pós-graduação em Finanças pela Fundação Dom Cabral, e atua como gestora de Soluções na Diretoria de Tecnologia do Banco do Brasil. Sua trajetória combina inovação, transformação digital, desenvolvimento de pessoas e construção de competências para o futuro do trabalho. Ao longo de oito anos na Diretoria de Gestão de Pessoas do Banco do Brasil, atuou como gerente de Inovação e conduziu o Movimento Evolution na Universidade Corporativa do Banco do Brasil. Atualmente, conecta estratégia, pessoas e inovação para impulsionar a evolução do Banco.',
        photoUrl: '/dezanos/assets/speakers/marcia-almeida-campos.jpeg',
        inviteToken: 'spk_token_marcia_bb_2026',
        status: 'APROVADO',
        avNeeds: 'Microfone de mão e áudio do notebook.',
        email: 'marcia.almeida@bb.com.br',
        authorizedPublishing: true,
        isApproved: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'spk_3', name: 'Prof. Dr. Abraão Freires Saraiva Júnior', role: 'Professor e Diretor-Presidente do Parque Tecnológico', institution: 'Universidade Federal do Ceará / Partec UFC', talkTitle: 'Empreendedorismo, inovação e desenvolvimento regional', talkSummary: 'Modelagem econômico-financeira de empreendimentos e empreendedorismo tecnológico.', bio: 'Graduado pelo Centro de Tecnologia da UFC, mestre e doutor em Engenharia de Produção pela POLI USP. Docente do Centro de Tecnologia da UFC, fundador e coordenador do Centro de Empreendedorismo (CEMP UFC), diretor-presidente do Parque Tecnológico (Partec UFC) e coordenador de projeto do programa Cientista Chefe de Inovação em Processos da Funcap-CE.', photoUrl: '/dezanos/assets/speakers/abraao-freires.jpeg', status: 'APROVADO', authorizedPublishing: true, isApproved: true, createdAt: new Date().toISOString()
      },
      {
        id: 'spk_4', name: 'Mauro Oliveira', role: 'Professor, pesquisador e escritor', institution: 'Instituto Federal do Ceará', talkTitle: 'Soberania digital, inovação e letramento', talkSummary: 'Tecnologia, soberania digital e transformação do conhecimento.', bio: 'Eletrotécnico pela ETFCE, engenheiro eletricista pela UFC, mestre em Sistemas de Computação pela PUC Rio e doutor em Informática pela Sorbonne Université. Realizou estágios pós-doutorais em Telecomunicações no King’s College of London e na University of Ottawa. Foi Secretário de Telecomunicações do Ministério das Comunicações, Secretário Adjunto de Ciência e Tecnologia do Ceará e Diretor Geral do CEFET Ceará. É autor de oito livros com ISBN, incluindo Soberania Digital — Colonização e Letramento (2025).', photoUrl: '/dezanos/assets/speakers/mauro-oliveira.png', status: 'APROVADO', authorizedPublishing: true, isApproved: true, createdAt: new Date().toISOString()
      },
      {
        id: 'spk_5', name: 'Luiz Sucupira Júnior', role: 'Superintendente de Tecnologia da Informação (CIO)', institution: 'Banco do Nordeste', talkTitle: 'Segurança cibernética, proteção de dados e inteligência artificial', talkSummary: 'Segurança da informação, continuidade de negócios, proteção de dados e IA.', bio: 'Superintendente de Tecnologia da Informação (CIO), especialista em Segurança da Informação, Cibernética e Proteção de Dados. Com 15 anos de experiência e certificações como CISSP, DPO EXIN e ISO 27001 LA, liderou projetos nas áreas de segurança cibernética, continuidade de negócios e inteligência artificial. Também atuou por 10 anos como professor universitário.', photoUrl: '/dezanos/assets/speakers/luiz-sucupira.jpeg', status: 'APROVADO', authorizedPublishing: true, isApproved: true, createdAt: new Date().toISOString()
      },
      {
        id: 'spk_6', name: 'Diego Souza', role: 'Principal Technical Manager', institution: 'CESAR', talkTitle: 'Arquiteturas digitais, dados e inteligência artificial', talkSummary: 'Arquitetura de sistemas distribuídos, nuvem, dados e IA para transformação digital.', bio: 'Principal Technical Manager no CESAR, com mais de 20 anos de experiência em engenharia e arquitetura de software. Lidera equipes multidisciplinares em projetos de inovação e transformação digital para grandes instituições financeiras, conectando decisões técnicas a resultados de negócio. É especialista em arquitetura de sistemas distribuídos e nuvem, com atuação em plataformas de pagamento, modernização de sistemas legados, novas arquiteturas digitais, dados e IA.', photoUrl: '/dezanos/assets/speakers/diego-souza.jpeg', status: 'APROVADO', authorizedPublishing: true, isApproved: true, createdAt: new Date().toISOString()
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
