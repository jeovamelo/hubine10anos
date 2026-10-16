// ==========================================================================
// HUBINE 10 ANOS — CONTROLADOR DO PORTAL INSTITUCIONAL & APRESENTAÇÃO
// Baseado na Apresentação Oficial (Abril/2026) e Livro da Marca BNB
// ==========================================================================

const HUBINE_DATA = {
  summary: {
    totalPortfolio: 30,
    availableSlots: 0,
    inCpsi: 3,
    onHold: 4,
    inProgress: 10,
    finalized: 12,
    inImplementation: 1,
    creditTotal: "R$ 9.600.608.087,01",
    creditContracts: 2523,
    credit2025: "R$ 3.148.877.738,91",
    startupsAccelerated: 320,
    statesServed: 10,
    vcActivePortfolio: "R$ 103,0 milhões",
    leiDoBem2024: "R$ 25.244.651,80",
    leiDoBemGrowth: "+93%",
    pdiInvestment2024: "R$ 70.124.032,76",
    eventsTotal: 90,
    peopleImpacted: 163000
  },

  // 30 Desafios Oficiais de Inovação Aberta (Slides 11 e 12)
  challenges: [
    {
      area: "Crediamigo",
      challenge: "Assinatura Biométrica",
      update: "Projeto em espera. O Banco Digital pode incluir a solução de Assinatura Biométrica em seu escopo.",
      stage: "Vinculado a Outro Projeto",
      status: "espera",
      statusLabel: "Em Espera"
    },
    {
      area: "Gestão Orçamentária e Capital",
      challenge: "Automação de Relatórios ICAAP",
      update: "Ficou definido que o edital de CPSI permanecerá em espera até a entrega do relatório ICAAP.",
      stage: "Em CPSI - Desenvolvimento",
      status: "cpsi",
      statusLabel: "Em CPSI"
    },
    {
      area: "Crediamigo",
      challenge: "Banco Digital",
      update: "A área de negócios comunicou a descontinuidade do projeto após avaliação estratégica.",
      stage: "Cancelado / Concluído",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Marketing e Comunicação",
      challenge: "Curadoria de Chatbot de Atendimento",
      update: "Projeto em CPSI. Confeccionando a minuta do contrato junto aos fornecedores selecionados.",
      stage: "Edital de CPSI Publicado",
      status: "cpsi",
      statusLabel: "Em CPSI"
    },
    {
      area: "Governança de Dados",
      challenge: "Domínio de Dados ETENE",
      update: "Reunião de alinhamento interno realizada com Diego e Alexandre sobre possíveis caminhos do projeto.",
      stage: "Curadoria",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Tecnologia da Informação",
      challenge: "Endomarketing",
      update: "Foi criada uma requisição para que o time de segurança analise os documentos técnicos enviados pela Tibox.",
      stage: "PoC Design",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Crediamigo",
      challenge: "Feira Crediamigo",
      update: "Reunião agendada para avaliação do material de PoC Design com a equipe.",
      stage: "PoC Design",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Central Saúde Ocupacional",
      challenge: "IA para Interpretação de Dados do Dashboard de Saúde",
      update: "Projeto em CPSI. Retomado após envio da documentação; aguarda parecer de Gestão de Pessoas sobre privacidade.",
      stage: "Edital de CPSI Publicado",
      status: "cpsi",
      statusLabel: "Em CPSI"
    },
    {
      area: "Crediamigo",
      challenge: "Leads",
      update: "Reunião de curadoria realizada; aguardando decisão do time para agendar conversas técnicas com G4Flex e Nuvia.",
      stage: "Startup Selection",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Arquitetura e Inovação de TI",
      challenge: "Modernização de Sistemas Legados",
      update: "Apresentação técnica da Exímia agendada; aguardando retorno para agendar a Onni.",
      stage: "Startup Selection",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Crediamigo",
      challenge: "Orientação Empresarial",
      update: "A solução prevista para o desafio de Plataforma de Gerenciamento MPE também poderá resolver esta demanda.",
      stage: "Vinculado a Outro Projeto",
      status: "espera",
      statusLabel: "Em Espera"
    },
    {
      area: "Concessão de Crédito",
      challenge: "Otimização de Roteiro para Visita Técnica",
      update: "O projeto encontra-se em espera com previsão de retomada oficial no primeiro semestre de 2026.",
      stage: "Em CPSI - Aguardando Retomada",
      status: "espera",
      statusLabel: "Em Espera"
    },
    {
      area: "Ambiente MPE e PF",
      challenge: "Plataforma de Gerenciamento MPE",
      update: "O edital de CPSI está em desenvolvimento técnico, aguardando publicação oficial para ampla divulgação.",
      stage: "Em CPSI - Em Desenvolvimento",
      status: "cpsi",
      statusLabel: "Em CPSI"
    },
    {
      area: "Ativos de Terceiros",
      challenge: "Soluções de Integrações via APIs",
      update: "As apresentações da Baasic e Fluid foram concluídas; o time do Banco avaliará internamente as soluções e escopo.",
      stage: "PoC Design",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Agroamigo",
      challenge: "Sistema de Gamificação do Programa de Ação",
      update: "O time Hubine está realizando a confecção dos documentos de CPSI para encaminhar ao setor Logístico.",
      stage: "Em CPSI - Em Desenvolvimento",
      status: "cpsi",
      statusLabel: "Em CPSI"
    },
    {
      area: "Agroamigo",
      challenge: "Uso de IA para Insights de Clientes",
      update: "O time Distrito consolidará a documentação do teste com a IBM e preparará a primeira versão da PoC.",
      stage: "PoC Design",
      status: "progresso",
      statusLabel: "Progresso"
    },
    {
      area: "Superintendência Jurídica",
      challenge: "Visual Law",
      update: "Startup Vitta selecionada no edital de CPSI, com contrato assinado e em plena execução operacional.",
      stage: "Em Implementação",
      status: "implementacao",
      statusLabel: "Implementação"
    },
    {
      area: "Agroamigo",
      challenge: "Visitas Normativas",
      update: "Apresentação técnica da InspectoAgri realizada; aguardando retorno para agendar com Field Control.",
      stage: "Startup Selection",
      status: "progresso",
      statusLabel: "Progresso"
    },
    // Histórico de Desafios Concluídos/Tratados (Slide 12)
    {
      area: "Transação / Serviços Bancários",
      challenge: "Conta Escrow",
      update: "O desafio foi analisado na fase de curadoria e finalizado após reavaliação regulatória.",
      stage: "Cancelado na Curadoria",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Gestão Orçamentária e Capital",
      challenge: "Correspondente Bancário",
      update: "Dado como concluído no Hubine, pois suas atividades foram integralmente absorvidas por outro projeto estruturante do BNB.",
      stage: "Absorvido pelo BNB",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Adm. e Concessão de Crédito",
      challenge: "Gravame",
      update: "Desafio finalizado internamente após definição de novos fluxos de garantias pelo Banco.",
      stage: "Concluído",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Ambiente MPE e PF",
      challenge: "Gamificação de Eventos de Encontro",
      update: "O BNB já possui a solução sugerida internamente, que será implementada para o projeto.",
      stage: "Solução Interna Adotada",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Transação e Serviços Bancários",
      challenge: "Novo Sistema Sisbajud",
      update: "Desafio finalizado após opção da área de negócios por outra modalidade de contratação tecnológica.",
      stage: "Concluído",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Superintendência Jurídica",
      challenge: "Padronização de Artefatos Jurídicos",
      update: "Desafio removido do edital de CPSI e conduzido por tratativas diretas da área.",
      stage: "Concluído",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Empréstimos e Serviços Bancários",
      challenge: "Pix sem Maquineta",
      update: "Desafio finalizado no Hubine pois seguirá com tratativas e desenvolvimento interno pelo BNB.",
      stage: "Internalizado",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Crediamigo",
      challenge: "Quero Ser Cliente Evoluído",
      update: "Desafio cancelado por reorientação de prioridades da área de negócios.",
      stage: "Cancelado",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Distribuição e Suporte a Fundos",
      challenge: "Simulador de Fundos de Investimentos",
      update: "Desafio concluído com sucesso. A área de negócio seguirá com a Quantum através de aditivo ao contrato existente.",
      stage: "Concluído com Sucesso",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Ambiente MPE e PF",
      challenge: "Solução de Integração Varejo",
      update: "Desafio suspenso pela área sem previsão de retomada a curto prazo.",
      stage: "Suspenso",
      status: "espera",
      statusLabel: "Em Espera"
    },
    {
      area: "Ambiente MPE e PF",
      challenge: "Sistema de Avaliação de Carteira Gamificada",
      update: "Cancelado devido à indisponibilidade de bases online que viabilizassem o escopo.",
      stage: "Cancelado",
      status: "finalizado",
      statusLabel: "Finalizado"
    },
    {
      area: "Concessão de Crédito",
      challenge: "Gestão de Banco de Dados para Avaliação de Imóveis",
      update: "Área de negócios decidiu pela contratação da startup Mavin via dispensa por valor. Projeto finalizado com êxito.",
      stage: "Concluído com Sucesso",
      status: "finalizado",
      statusLabel: "Finalizado"
    }
  ],

  // Inovação Fechada (Slides 14 e 15)
  closedProjects: [
    { area: "Logística", challenge: "Sistematização do Processo de Contratações", icon: "📦" },
    { area: "Logística", challenge: "Gestão e Fiscalização de Contratos", icon: "📑" },
    { area: "Logística", challenge: "Estruturação de Dados e Inteligência de Suprimentos", icon: "📊" },
    { area: "Logística", challenge: "Controle e Monitoramento de Demandas da Engenharia", icon: "🏗️" },
    { area: "Auditoria", challenge: "Identificação de Cenários de Fraudes com Inteligência Artificial", icon: "🛡️" },
    { area: "Arquitetura de TI", challenge: "Arquitetura de Referência para Transformação Digital", icon: "💻" },
    { area: "Ambiente de Produtos e Cartões", challenge: "Automação da Consulta e Análise de NF-e", icon: "💳" },
    { area: "Jurídico", challenge: "Dashboard Estratégico de Desempenho Jurídico — KPIs", icon: "⚖️" },
    { area: "Recursos Humanos", challenge: "RH 4.0 — Automação de Apuração de Documentos Trabalhistas", icon: "👥" },
    { area: "Jurídico", challenge: "Automação da Gestão de Garantias Judiciais", icon: "📜" },
    { area: "Concessão de Crédito", challenge: "Solução Automatizada para Elaboração de Minutas Contratuais", icon: "✍️" }
  ],

  // Slides da Apresentação Oficial (Modo Apresentação Interativa)
  slides: [
    {
      id: 1,
      title: "Hub de Inovação BNB — Hubine",
      subtitle: "Apresentação Institucional • Abril/2026",
      category: "Abertura",
      content: `
        <div style="text-align: center; padding: 2rem 0;">
          <div style="display: inline-block; padding: 0.5rem 1.5rem; background: var(--bnb-red-soft); border-radius: var(--radius-full); color: var(--bnb-red); font-weight: 700; margin-bottom: 1.5rem;">
            10 Anos de Pioneirismo Público (2016 - 2026)
          </div>
          <h1 style="font-size: 2.5rem; color: var(--bnb-red); margin-bottom: 1rem; font-weight: 800;">HUB DE INOVAÇÃO BNB — HUBINE</h1>
          <p style="font-size: 1.25rem; color: var(--bnb-gray-dark); max-width: 650px; margin: 0 auto 2rem;">
            Conectando inovação, soluções estratégicas e desenvolvimento sustentável para toda a Região Nordeste.
          </p>
          <div style="display: flex; justify-content: center; gap: 2rem; align-items: center; margin-top: 2rem;">
            <div style="border-right: 1px solid var(--border-subtle); padding-right: 2rem;">
              <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Instituição</span>
              <strong style="color: var(--bnb-red); font-size: 1.1rem;">Banco do Nordeste</strong>
            </div>
            <div>
              <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Chancela</span>
              <strong style="color: var(--bnb-gray-dark); font-size: 1.1rem;">Governo Federal</strong>
            </div>
          </div>
        </div>
      `
    },
    {
      id: 2,
      title: "O Banco do Nordeste (BNB)",
      subtitle: "Força, Solidez e Desenvolvimento Regional",
      category: "Contexto Institucional",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center;">
          <div>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 1rem;">
              <li style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <span style="background: var(--bnb-red); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">🏛️</span>
                <span><strong>72 anos de atuação</strong> como instituição financeira múltipla de desenvolvimento regional.</span>
              </li>
              <li style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <span style="background: var(--bnb-orange); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">🌎</span>
                <span><strong>Maior banco de desenvolvimento regional</strong> da América Latina.</span>
              </li>
              <li style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <span style="background: var(--bnb-red); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">🤝</span>
                <span><strong>Crediamigo e Agroamigo:</strong> os maiores programas nacionais de microcrédito produtivo orientado.</span>
              </li>
              <li style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <span style="background: var(--bnb-orange); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">💰</span>
                <span>Administrador do <strong>Fundo Constitucional de Financiamento do Nordeste (FNE)</strong>.</span>
              </li>
              <li style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <span style="background: var(--bnb-red); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">💡</span>
                <span><strong>Primeiro Banco Público</strong> a estruturar um Hub de Inovação oficial no Brasil.</span>
              </li>
            </ul>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-lg); border-left: 4px solid var(--bnb-red);">
            <h4 style="color: var(--bnb-red); margin-bottom: 0.75rem;">Presença no Nordeste</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
              <div style="background: #fff; padding: 1rem; border-radius: var(--radius-md);">
                <span style="font-size: 1.75rem; font-weight: 800; color: var(--bnb-red);">2.074</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Municípios atendidos</span>
              </div>
              <div style="background: #fff; padding: 1rem; border-radius: var(--radius-md);">
                <span style="font-size: 1.75rem; font-weight: 800; color: var(--bnb-orange);">293</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Agências bancárias</span>
              </div>
              <div style="background: #fff; padding: 1rem; border-radius: var(--radius-md);">
                <span style="font-size: 1.75rem; font-weight: 800; color: var(--bnb-red);">5,7M</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Clientes ativos</span>
              </div>
              <div style="background: #fff; padding: 1rem; border-radius: var(--radius-md);">
                <span style="font-size: 1.75rem; font-weight: 800; color: var(--bnb-orange);">55,6%</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Crédito longo prazo</span>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      id: 3,
      title: "O Hubine — Hub de Inovação do Nordeste",
      subtitle: "Criado em 2016 na Sede do Banco do Nordeste",
      category: "Origem",
      content: `
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; align-items: center;">
          <div>
            <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.25rem;">
              O <strong>Hubine</strong> foi criado em <strong>2016</strong> com o objetivo de atrair soluções inovadoras para os desafios internos do Banco do Nordeste e fomentar ativamente o ecossistema de inovação no Nordeste, apoiando <em>startups</em>, empreendedores e clientes do Banco.
            </p>
            <p style="font-size: 1.05rem; line-height: 1.6; color: var(--bnb-gray-dark);">
              O relacionamento sociopolítico institucional é o caminho estruturante para parcerias estratégicas com as lideranças, aceleradoras, universidades e atores de todos os 9 estados nordestinos e norte de MG e ES.
            </p>
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bnb-red-soft); border-radius: var(--radius-md); border-left: 4px solid var(--bnb-orange);">
              <strong>Localização Sede:</strong> Prédio principal do Hubine no Campus Passaré do Banco do Nordeste, em Fortaleza / CE.
            </div>
          </div>
          <div style="background: linear-gradient(135deg, var(--bnb-red) 0%, var(--bnb-red-dark) 100%); color: #fff; padding: 2rem; border-radius: var(--radius-lg); text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🏢</div>
            <h3 style="color: #fff; font-size: 1.4rem; margin-bottom: 0.5rem;">Sede Hubine Passaré</h3>
            <p style="font-size: 0.9rem; color: #F1E5E8; margin-bottom: 1rem;">Espaço físico moderno de ideação, coworking e relacionamento com o ecossistema.</p>
            <span style="display: inline-block; background: var(--bnb-orange); color: #fff; padding: 0.4rem 1rem; border-radius: var(--radius-full); font-weight: 700; font-size: 0.8rem;">
              Primeiro Hub de Inovação Público
            </span>
          </div>
        </div>
      `
    },
    {
      id: 4,
      title: "Estrutura Organizacional & Células Regionais",
      subtitle: "Atuação Interna e Presença Descentralizada em 3 Cidades",
      category: "Estrutura",
      content: `
        <div style="text-align: center;">
          <div style="display: inline-block; background: var(--bnb-gray-dark); color: #fff; padding: 0.6rem 1.5rem; border-radius: var(--radius-md); font-weight: 700; margin-bottom: 1rem;">
            Diretoria de Administração do BNB
          </div>
          <div style="font-size: 1.25rem; color: var(--bnb-red); margin-bottom: 1rem;">⬇️</div>
          <div style="display: inline-block; background: var(--bnb-red); color: #fff; padding: 0.8rem 2rem; border-radius: var(--radius-md); font-weight: 800; font-size: 1.2rem; border: 2px solid var(--bnb-orange); margin-bottom: 2rem;">
            HUB DE INOVAÇÃO (HUBINE)
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; text-align: left;">
            <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-red);">
              <h4 style="color: var(--bnb-red); margin-bottom: 0.75rem;">🏢 Atuação Interna</h4>
              <div style="background: #fff; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; font-weight: 600;">
                • Célula de Gestão da Inovação
              </div>
              <div style="background: #fff; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-weight: 600;">
                • Célula de Benefícios Fiscais (Lei do Bem)
              </div>
            </div>

            <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-orange);">
              <h4 style="color: var(--bnb-orange); margin-bottom: 0.75rem;">🌐 Atuação Externa</h4>
              <div style="background: #fff; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; font-weight: 600;">
                • Célula de Inovação Fortaleza (CE)
              </div>
              <div style="background: #fff; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; font-weight: 600;">
                • Célula de Inovação Recife (PE)
              </div>
              <div style="background: #fff; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-weight: 600;">
                • Célula de Inovação Salvador (BA)
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      id: 5,
      title: "Inovação Aberta & Marco Legal (LC 182/2021)",
      subtitle: "O Instrumento Jurídico do CPSI para o Setor Público",
      category: "Inovação Aberta",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div>
            <h4 style="color: var(--bnb-red); margin-bottom: 0.75rem;">O que é o CPSI?</h4>
            <p style="line-height: 1.5; margin-bottom: 1rem;">
              O <strong>CPSI (Contrato Público para Solução Inovadora)</strong> permite ao poder público testar e adquirir soluções inovadoras de empresas e <em>startups</em>, onde o insucesso no teste é reconhecido juridicamente como aprendizado.
            </p>
            <div style="background: var(--bnb-red-soft); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid var(--bnb-red); font-size: 0.9rem;">
              <strong>Por que é revolucionário?</strong> Rompe a lógica tradicional e morosa das licitações antigas, estimulando experimentação, cocriação e minimização de riscos.
            </div>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-orange);">
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.75rem;">Principais Prazos Legais do CPSI</h4>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
              <li><strong>📢 Edital Público:</strong> Mínimo de 30 dias corridos de antecedência para propostas.</li>
              <li><strong>🧪 Contrato de Teste (CPSI):</strong> Duração de 12 meses, prorrogável por igual período.</li>
              <li><strong>🚀 Contrato de Fornecimento:</strong> Até 24 meses pós-testes bem sucedidos, prorrogável por igual período.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      id: 6,
      title: "Jornada de Inovação Aberta em 8 Etapas",
      subtitle: "Metodologia Estruturada em Parceria com Distrito, AI Factory e FCamara",
      category: "Metodologia",
      content: `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
          <div style="background: #2D3748; color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">0</div>
            <strong>Setup</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Definição de escopo e alinhamento interno</div>
          </div>
          <div style="background: var(--bnb-red); color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">1</div>
            <strong>Hunting</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Mapeamento no ecossistema (Distrito)</div>
          </div>
          <div style="background: #D946EF; color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">2</div>
            <strong>Curadoria</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Avaliação e filtragem pelo Hubine e áreas</div>
          </div>
          <div style="background: #E11D48; color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">3</div>
            <strong>PoC Design</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Desenho técnico da prova de conceito</div>
          </div>
          <div style="background: #4F46E5; color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">4</div>
            <strong>Edital CPSI</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Publicação livre concorrência (2 a 3 meses)</div>
          </div>
          <div style="background: #7C3AED; color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">5</div>
            <strong>Startup Selection</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Banca avaliadora e contratação</div>
          </div>
          <div style="background: #EC4899; color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">6</div>
            <strong>PoC Execution</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Execução dos testes controlados</div>
          </div>
          <div style="background: var(--bnb-orange); color: #fff; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem;">7</div>
            <strong>Implementação</strong>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Escala da solução no Banco</div>
          </div>
        </div>
        <p style="text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-top: 1rem;">
          Duração Esteira: ~ 12 a 14 semanas • Duração PoC Execution e Implementação: ~ 6 meses
        </p>
      `
    },
    {
      id: 7,
      title: "Portfólio de Inovação Aberta — Resumo Executivo",
      subtitle: "30 Projetos Gerenciados • Capacidade Operacional Máxima",
      category: "Portfólio",
      content: `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-bottom: 1.5rem; text-align: center;">
          <div style="background: var(--bnb-red-soft); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--bnb-red-border);">
            <span style="font-size: 2.2rem; font-weight: 800; color: var(--bnb-red);">30</span>
            <span style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--bnb-red); text-transform: uppercase;">Projetos no Portfólio</span>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <span style="font-size: 2.2rem; font-weight: 800; color: var(--text-main);">0</span>
            <span style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Slots Disponíveis (100% Ocupado)</span>
          </div>
          <div style="background: #F3E8FF; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid #DDD6FE;">
            <span style="font-size: 2.2rem; font-weight: 800; color: #6D28D9;">1</span>
            <span style="display: block; font-size: 0.8rem; font-weight: 700; color: #6D28D9; text-transform: uppercase;">Em Implementação (Visual Law)</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
          <div style="background: #FEF3C7; padding: 1rem; border-radius: var(--radius-md);">
            <span style="font-size: 1.5rem; font-weight: 800; color: #B45309;">3</span>
            <span style="display: block; font-size: 0.75rem; font-weight: 600; color: #B45309;">Em CPSI</span>
          </div>
          <div style="background: #EFF6FF; padding: 1rem; border-radius: var(--radius-md);">
            <span style="font-size: 1.5rem; font-weight: 800; color: #1D4ED8;">10</span>
            <span style="display: block; font-size: 0.75rem; font-weight: 600; color: #1D4ED8;">Com Progresso</span>
          </div>
          <div style="background: #FFEDD5; padding: 1rem; border-radius: var(--radius-md);">
            <span style="font-size: 1.5rem; font-weight: 800; color: #C2410C;">4</span>
            <span style="display: block; font-size: 0.75rem; font-weight: 600; color: #C2410C;">Em Espera</span>
          </div>
          <div style="background: #ECFDF5; padding: 1rem; border-radius: var(--radius-md);">
            <span style="font-size: 1.5rem; font-weight: 800; color: #047857;">12</span>
            <span style="display: block; font-size: 0.75rem; font-weight: 600; color: #047857;">Finalizados / Internalizados</span>
          </div>
        </div>
      `
    },
    {
      id: 8,
      title: "Inovação Fechada & Transformação Digital",
      subtitle: "Eficiência Operacional em 7 Frentes e o Projeto TDS",
      category: "Inovação Fechada",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div>
            <h4 style="color: var(--bnb-red); margin-bottom: 0.75rem;">Frentes de Inovação Fechada</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
              <div style="background: #fff; border: 1px solid var(--border-subtle); padding: 0.6rem; border-radius: 4px;">
                <strong>Logística:</strong> Sistematização de Compras, Gestão de Contratos e Engenharia.
              </div>
              <div style="background: #fff; border: 1px solid var(--border-subtle); padding: 0.6rem; border-radius: 4px;">
                <strong>Auditoria:</strong> Identificação de Cenários de Fraudes com Inteligência Artificial.
              </div>
              <div style="background: #fff; border: 1px solid var(--border-subtle); padding: 0.6rem; border-radius: 4px;">
                <strong>Recursos Humanos:</strong> RH 4.0 - Apuração Automatizada de Documentos.
              </div>
              <div style="background: #fff; border: 1px solid var(--border-subtle); padding: 0.6rem; border-radius: 4px;">
                <strong>Jurídico:</strong> Dashboard KPIs e Gestão de Garantias Judiciais.
              </div>
            </div>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-left: 4px solid var(--bnb-orange);">
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.75rem;">Projeto TDS (Transformação Digital)</h4>
            <p style="font-size: 0.9rem; line-height: 1.5;">
              Arquitetura integrada conectando <strong>Software Factory</strong>, <strong>Academy</strong>, <strong>Governança da Inovação Hubine</strong>, <strong>Plataforma Digital EDX</strong>, Inovação Aberta com o <strong>Distrito</strong> e Inovação Fechada com o <strong>CESAR</strong>.
            </p>
          </div>
        </div>
      `
    },
    {
      id: 9,
      title: "Célula da Lei do Bem — Salto de +93%",
      subtitle: "Criada em 2025 para Maximizar Segurança e Benefícios Fiscais",
      category: "Lei do Bem",
      content: `
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; align-items: center;">
          <div>
            <p style="line-height: 1.5; margin-bottom: 1rem;">
              A <strong>Célula da Lei do Bem</strong> criada em 2025 estabeleceu critérios de avaliação mais rigorosos sobre os entregáveis da consultoria, garantindo maior qualidade e segurança técnica junto ao <strong>MCTI</strong>.
            </p>
            <div style="background: var(--bnb-red-soft); padding: 1.25rem; border-radius: var(--radius-md); border-left: 5px solid var(--bnb-red);">
              <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Benefício Fiscal (IRPJ/CSLL) em 2024</span>
              <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-top: 0.25rem;">
                <span style="font-size: 2rem; font-weight: 800; color: var(--bnb-red);">R$ 25,24M</span>
                <span style="background: var(--bnb-orange); color: #fff; font-size: 0.85rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px;">+93% vs Previsão</span>
              </div>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">
                Previsão inicial de R$ 13,05M saltou para R$ 25,24M após a reestruturação.
              </span>
            </div>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); text-align: center;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Investimento BNB em PD&I (2024)</span>
            <div style="font-size: 2.2rem; font-weight: 800; color: var(--bnb-gray-dark); margin: 0.5rem 0;">
              R$ 70,12M
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
              Evolução contínua desde 2019 (R$ 35,1M) até o recorde em 2024.
            </p>
          </div>
        </div>
      `
    },
    {
      id: 10,
      title: "Laboratórios de Experimentação: Blockchain & Quântica",
      subtitle: "Pesquisa Aplicada e Provas de Conceito com a TI do Banco",
      category: "Experimentação",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div style="background: var(--bnb-red-soft); padding: 1.5rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-red);">
            <h4 style="color: var(--bnb-red); margin-bottom: 0.5rem;">🔗 Blockchain em Negócios</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <li>• <strong>Treinamento e Assessoria:</strong> Difusão da tecnologia aplicada ao BNB.</li>
              <li>• <strong>Roadshow e Screening:</strong> Pesquisa de casos aplicados e princípios básicos.</li>
              <li>• <strong>Protótipo Funcional:</strong> Verificação de funções críticas em laboratório simulado.</li>
              <li>• <strong>Previsão PLC:</strong> Contratação no 2º semestre de 2026 (análogo a CEF e BB).</li>
            </ul>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-orange);">
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.5rem;">⚛️ Computação Quântica</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <li>• <strong>Parceria UFPE:</strong> Visitas técnicas e estrutura de extensão.</li>
              <li>• <strong>BNBTech:</strong> Mediação de painel com especialistas IBM e CESAR.</li>
              <li>• <strong>Imersão Temática:</strong> 4 dias de imersão corporativa com a IBM.</li>
              <li>• <strong>Prova de Conceito (PoC):</strong> Prevista para o 1º semestre de 2027 com área de negócios.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      id: 11,
      title: "Crédito para Inovação: R$ 9,60 Bilhões",
      subtitle: "2.523 Contratos Realizados no Nordeste (jan/2020 a dez/2025)",
      category: "Crédito",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div>
            <div style="background: var(--bnb-red); color: #fff; padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
              <span style="font-size: 0.85rem; opacity: 0.9;">Total Contratado em Inovação (2020-2025)</span>
              <div style="font-size: 2.2rem; font-weight: 800; color: #fff;">R$ 9,60 Bilhões</div>
              <span style="font-size: 0.85rem; opacity: 0.9;">2.523 operações formalizadas</span>
            </div>
            <div style="font-size: 0.9rem;">
              <strong>Ano de 2025 (Recorde Anual):</strong><br>
              • Inovação: R$ 3.148.877.738,91<br>
              • FINEP Inovacred: R$ 110.164.992,39<br>
              • FNE Startup: R$ 901.389,58
            </div>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md);">
            <h4 style="color: var(--bnb-red); margin-bottom: 0.75rem;">Distribuição por Segmentos (2025)</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between;"><span>🏭 Indústria</span><strong>R$ 1.752.672.542,76</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>🌾 Agropecuária</span><strong>R$ 996.076.164,63</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>⚡ Infraestrutura</span><strong>R$ 309.061.000,00</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>🔬 Inovacred</span><strong>R$ 110.164.992,39</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>💼 Serviços</span><strong>R$ 87.969.805,78</strong></div>
            </div>
          </div>
        </div>
      `
    },
    {
      id: 12,
      title: "Linhas Oficiais de Financiamento à Inovação",
      subtitle: "FNE Inovação, FNE Startup e FINEP Inovacred",
      category: "Linhas de Crédito",
      content: `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
          <div style="background: #fff; border: 2px solid var(--bnb-red); border-radius: var(--radius-md); padding: 1.25rem;">
            <h4 style="color: var(--bnb-red); margin-bottom: 0.5rem;">FNE Inovação</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <li>• Prazo total: <strong>até 15 anos</strong></li>
              <li>• Carência: <strong>até 5 anos</strong></li>
              <li>• Setor rural e urbano</li>
              <li>• Softwares, VANTs, laboratórios e máquinas</li>
            </ul>
          </div>
          <div style="background: #fff; border: 2px solid var(--bnb-orange); border-radius: var(--radius-md); padding: 1.25rem;">
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.5rem;">FNE Startup</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <li>• Com ou sem faturamento prévio</li>
              <li>• Prazo: <strong>até 8 anos</strong> (2 de carência)</li>
              <li>• Financia nuvem, ERP, IA, BI e pró-labore exclusivo</li>
              <li>• Fixação de capital humano local</li>
            </ul>
          </div>
          <div style="background: #fff; border: 2px solid var(--bnb-gray-dark); border-radius: var(--radius-md); padding: 1.25rem;">
            <h4 style="color: var(--bnb-gray-dark); margin-bottom: 0.5rem;">FINEP Inovacred</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <li>• Até <strong>R$ 15 milhões</strong></li>
              <li>• Taxa: TR + 5,154% a TR + 6,605% a.a.</li>
              <li>• Inovacred, 4.0 e Telecom</li>
              <li>• Faturamento: qualquer porte</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      id: 13,
      title: "Grandes Cases de Financiamento do Hubine",
      subtitle: "Apoio Técnico, Enquadramento e Estruturação de Projetos Inovadores",
      category: "Cases",
      content: `
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; text-align: center;">
          <div style="background: var(--bnb-red-soft); padding: 1rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-red);">
            <strong style="color: var(--bnb-red); display: block; font-size: 1.1rem;">Brisanet</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Fortaleza / Aldeota</span>
            <div style="font-weight: 800; font-size: 1.15rem; color: var(--bnb-red); margin: 0.5rem 0;">R$ 309M</div>
            <span style="background: #ECFDF5; color: #047857; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Contratado</span>
          </div>
          <div style="background: var(--bnb-red-soft); padding: 1rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-orange);">
            <strong style="color: var(--bnb-orange); display: block; font-size: 1.1rem;">Vicunha Têxtil</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Fortaleza / Aldeota</span>
            <div style="font-weight: 800; font-size: 1.15rem; color: var(--bnb-orange); margin: 0.5rem 0;">R$ 246M</div>
            <span style="background: #ECFDF5; color: #047857; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Contratado</span>
          </div>
          <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-gray-dark);">
            <strong style="color: var(--bnb-gray-dark); display: block; font-size: 1.1rem;">Projeart</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Fortaleza / B. Menezes</span>
            <div style="font-weight: 800; font-size: 1.15rem; color: var(--bnb-gray-dark); margin: 0.5rem 0;">R$ 110M</div>
            <span style="background: #EFF6FF; color: #1D4ED8; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Em Análise</span>
          </div>
          <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-red);">
            <strong style="color: var(--bnb-red); display: block; font-size: 1.1rem;">Vonixx</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Maracanaú / CE</span>
            <div style="font-weight: 800; font-size: 1.15rem; color: var(--bnb-red); margin: 0.5rem 0;">R$ 62M</div>
            <span style="background: #EFF6FF; color: #1D4ED8; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Em Análise</span>
          </div>
          <div style="background: var(--bnb-red-soft); padding: 1rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-orange);">
            <strong style="color: var(--bnb-orange); display: block; font-size: 1.1rem;">How BE</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Fortaleza / Montese</span>
            <div style="font-weight: 800; font-size: 1.15rem; color: var(--bnb-orange); margin: 0.5rem 0;">R$ 26M</div>
            <span style="background: #ECFDF5; color: #047857; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Contratado</span>
          </div>
        </div>
      `
    },
    {
      id: 14,
      title: "FUNDECI (50 Anos) & Aceleração de Startups",
      subtitle: "Mais de 5 Mil Projetos Apoiados e R$ 700 Milhões em Subvenção",
      category: "Aceleração",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-left: 4px solid var(--bnb-red);">
            <h4 style="color: var(--bnb-red); margin-bottom: 0.5rem;">FUNDECI: Pioneirismo desde 1971</h4>
            <p style="font-size: 0.9rem; line-height: 1.5;">
              Constituído com recursos do FNE, é pioneiro no fomento à pesquisa e difusão tecnológica regional. Editais contínuos apoiam projetos não-reembolsáveis de grande impacto tecnológico.
            </p>
          </div>
          <div style="background: var(--bnb-red-soft); padding: 1.5rem; border-radius: var(--radius-md); border-left: 4px solid var(--bnb-orange);">
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.5rem;">Aceleração para Startups (2023-2025)</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <li>• <strong>5 ciclos</strong> de aceleração realizados com 5 aceleradoras</li>
              <li>• <strong>738 startups</strong> inscritas e <strong>320 aceleradas</strong></li>
              <li>• <strong>30 startups premiadas</strong> com até R$ 150 mil cada</li>
              <li>• Destaque: <strong>Eduvem</strong> (grande vencedora do Delta-V da Casa Azul)</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      id: 15,
      title: "Venture Capital & FIP Nordeste Capital Semente",
      subtitle: "Carteira Ativa de R$ 103 Milhões e Alvo de R$ 120M a R$ 150M",
      category: "Venture Capital",
      content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div>
            <h4 style="color: var(--bnb-red); margin-bottom: 0.5rem;">Carteira Ativa BNB</h4>
            <p style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem;">
              O BNB possui cerca de <strong>R$ 103 milhões</strong> em Venture Capital ativo (CRIATECs I, II, III e IV, FIP Anjo e FIP Nordeste Capital Semente).
            </p>
            <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem;">
              <strong>Startups de Destaque na Região:</strong><br>
              Usix (Fortaleza), PagCerto (Aracaju), Síntese (Recife), Izi App (Fortaleza) e Infleet (Salvador).
            </div>
          </div>
          <div style="background: var(--bnb-red-soft); padding: 1.5rem; border-radius: var(--radius-md); border-top: 4px solid var(--bnb-orange);">
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.5rem;">FIP Nordeste Capital Semente</h4>
            <p style="font-size: 0.85rem; line-height: 1.5;">
              Estruturado pelo Banco do Nordeste, FINEP e SEBRAE com captação alvo de <strong>R$ 120M a R$ 150M</strong> para impulsionar entre 20 e 30 startups <em>early stage</em> nordestinas.
            </p>
          </div>
        </div>
      `
    },
    {
      id: 16,
      title: "Projeto CONE & Premiações Institucionais",
      subtitle: "R$ 300 Milhões em Parceria com BID, Sudene e Enap para 52 Municípios",
      category: "Futuro & Reconhecimento",
      content: `
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem;">
          <div style="background: var(--bg-subtle); padding: 1.5rem; border-radius: var(--radius-md); border-left: 4px solid var(--bnb-red);">
            <h4 style="color: var(--bnb-red); margin-bottom: 0.5rem;">Projeto CONE (Inovação Aberta Nordeste)</h4>
            <p style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 0.75rem;">
              Parceria de grande escala com BID, Sudene, Enap e Impact Hub: <strong>Linha prevista de R$ 300 Milhões</strong> para modernizar a gestão pública de municípios nordestinos através do CPSI.
            </p>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              Previsão até 2028: 13 ciclos de inovação, 52 municípios e até 156 desafios públicos solucionados.
            </span>
          </div>
          <div>
            <h4 style="color: var(--bnb-orange); margin-bottom: 0.5rem;">🏆 Reconhecimentos Oficiais</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <li>🥇 <strong>2019:</strong> Prêmio Enap (Setor Público Brasil)</li>
              <li>🥇 <strong>2020:</strong> 100 Open Startups (Setor Privado Brasil)</li>
              <li>🥇 <strong>2020:</strong> Prêmio Saúde (América Latina)</li>
              <li>🥇 <strong>2024:</strong> Prêmio ALIDE (América Latina)</li>
            </ul>
          </div>
        </div>
      `
    }
  ]
};

// State
let currentSlideIndex = 0;
let activeTab = 'oquee';

// Initialize the Hubine Page View
function initHubinePage(subHash) {
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update document title
  document.title = "Hubine 10 Anos (2016 – 2026) — Trajetória e Portfólio Institucional | Banco do Nordeste";

  // Check subhash to activate specific tab or slide mode
  if (subHash === '#hubine/slides') {
    openSlideDeck();
  } else if (subHash && subHash.startsWith('#hubine/tab/')) {
    const tabName = subHash.replace('#hubine/tab/', '');
    switchHubineTab(tabName);
  } else {
    switchHubineTab('oquee');
  }

  renderPortfolioTable();
  setupHubineListeners();
}

function switchHubineTab(tabId) {
  // Narrative mapping with fallback aliases
  const aliasMap = {
    'origem': 'historia',
    'aberta': 'programas',
    'portfolio': 'resultados',
    'fechada': 'programas',
    'credito': 'impacto',
    'leibem': 'resultados',
    'experimentacao': 'programas',
    'ecossistema': 'celebracao'
  };
  const resolvedTab = aliasMap[tabId] || tabId || 'oquee';
  activeTab = resolvedTab;

  // Update tab buttons
  document.querySelectorAll('.hubine-tab-btn').forEach(btn => {
    if (btn.dataset.tab === resolvedTab || btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show corresponding section
  document.querySelectorAll('.hubine-section').forEach(sec => {
    if (sec.id === 'hubine-sec-' + resolvedTab) {
      sec.classList.add('active');
      sec.style.display = 'block';
    } else {
      sec.classList.remove('active');
      sec.style.display = 'none';
    }
  });

  // Re-render table if on resultados
  if (resolvedTab === 'resultados') {
    renderPortfolioTable();
  }
}

function setupHubineListeners() {
  // Tab buttons click
  document.querySelectorAll('.hubine-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      switchHubineTab(tab);
    };
  });

  // Search input and filters for 30 challenges
  const searchInput = document.getElementById('hubine-search-challenge');
  const statusFilter = document.getElementById('hubine-filter-status');
  const areaFilter = document.getElementById('hubine-filter-area');

  if (searchInput) searchInput.oninput = renderPortfolioTable;
  if (statusFilter) statusFilter.onchange = renderPortfolioTable;
  if (areaFilter) areaFilter.onchange = renderPortfolioTable;

  // Slide Deck keyboard controls
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('hubine-slide-modal');
    if (!modal || !modal.classList.contains('active')) return;

    if (e.key === 'ArrowRight' || e.key === 'Space') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'Escape') {
      closeSlideDeck();
    }
  });
}

// Render the 30 challenges in the table with real-time filtering
function renderPortfolioTable() {
  const tbody = document.getElementById('hubine-challenges-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('hubine-search-challenge');
  const statusFilter = document.getElementById('hubine-filter-status');
  const areaFilter = document.getElementById('hubine-filter-area');

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const statusVal = statusFilter ? statusFilter.value : 'all';
  const areaVal = areaFilter ? areaFilter.value : 'all';

  const filtered = HUBINE_DATA.challenges.filter(item => {
    const matchesQuery = !query ||
      item.challenge.toLowerCase().includes(query) ||
      item.area.toLowerCase().includes(query) ||
      item.update.toLowerCase().includes(query) ||
      item.stage.toLowerCase().includes(query);

    const matchesStatus = (statusVal === 'all') || (item.status === statusVal);
    const matchesArea = (areaVal === 'all') || (item.area === areaVal);

    return matchesQuery && matchesStatus && matchesArea;
  });

  const counterBadge = document.getElementById('hubine-filtered-count');
  if (counterBadge) {
    counterBadge.textContent = `${filtered.length} de ${HUBINE_DATA.challenges.length} desafios`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Nenhum desafio encontrado para os filtros selecionados. Tente ajustar os termos de busca.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    let pillClass = 'status-pill-progresso';
    if (item.status === 'cpsi') pillClass = 'status-pill-cpsi';
    if (item.status === 'espera') pillClass = 'status-pill-espera';
    if (item.status === 'finalizado') pillClass = 'status-pill-finalizado';
    if (item.status === 'implementacao') pillClass = 'status-pill-implementacao';

    return `
      <tr>
        <td class="td-area">${escapeHtml(item.area)}</td>
        <td class="td-challenge">
          <strong>${escapeHtml(item.challenge)}</strong>
        </td>
        <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 380px;">
          ${escapeHtml(item.update)}
        </td>
        <td style="font-size: 0.85rem; font-weight: 600;">
          ${escapeHtml(item.stage)}
        </td>
        <td>
          <span class="badge ${pillClass}" style="text-transform: uppercase; font-size: 0.7rem; font-weight: 700;">
            ${escapeHtml(item.statusLabel)}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Slide Deck Controls
function openSlideDeck(slideIndex = 0) {
  currentSlideIndex = slideIndex;
  const modal = document.getElementById('hubine-slide-modal');
  if (modal) {
    modal.classList.add('active');
    renderCurrentSlide();
  }
}

function closeSlideDeck() {
  const modal = document.getElementById('hubine-slide-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function nextSlide() {
  if (currentSlideIndex < HUBINE_DATA.slides.length - 1) {
    currentSlideIndex++;
    renderCurrentSlide();
  }
}

function prevSlide() {
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    renderCurrentSlide();
  }
}

function renderCurrentSlide() {
  const slide = HUBINE_DATA.slides[currentSlideIndex];
  if (!slide) return;

  const titleEl = document.getElementById('slide-card-title');
  const subEl = document.getElementById('slide-card-subtitle');
  const catEl = document.getElementById('slide-card-category');
  const bodyEl = document.getElementById('slide-card-body');
  const counterEl = document.getElementById('slide-deck-counter');
  const prevBtn = document.getElementById('btn-slide-prev');
  const nextBtn = document.getElementById('btn-slide-next');

  if (titleEl) titleEl.textContent = slide.title;
  if (subEl) subEl.textContent = slide.subtitle;
  if (catEl) catEl.textContent = slide.category;
  if (bodyEl) bodyEl.innerHTML = slide.content;
  if (counterEl) counterEl.textContent = `Slide ${currentSlideIndex + 1} de ${HUBINE_DATA.slides.length}`;

  if (prevBtn) prevBtn.disabled = (currentSlideIndex === 0);
  if (nextBtn) nextBtn.disabled = (currentSlideIndex === HUBINE_DATA.slides.length - 1);
}

// Print / PDF Helper
function printHubineReport() {
  window.print();
}
