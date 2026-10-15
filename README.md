# Hubine 10 Anos — Sistema Institucional de Inscrição e Credenciamento

Aplicação web completa e responsiva para o evento comemorativo dos **10 anos do Hub de Inovação do Banco do Nordeste — Hubine**.

- **Tema:** *Conectando inovação, pessoas e desenvolvimento regional*
- **Data do Evento:** 4 de novembro de 2026
- **Local:** Auditório Celso Furtado, Fortaleza — CE
- **Início do Credenciamento:** 13h

---

## 🚀 Tecnologias Utilizadas

- **Backend:** Node.js, Express, JWT (`jsonwebtoken`), Criptografia de senhas com `bcryptjs`, Geração de QR Code (`qrcode`), Disparo de e-mails institucionais (`nodemailer`), UUID criptográfico.
- **Frontend:** Single Page Application (SPA) em Vanilla JavaScript (ES6+), Vanilla CSS estruturado com tokens de design system, tipografia Google Fonts (*Outfit* e *Plus Jakarta Sans*).
- **Credenciamento Mobile:** Câmera scanner em tempo real com biblioteca `html5-qrcode` e sintetizador de áudio sonoro via Web Audio API.
- **Banco de Dados:** Engine de persistência JSON ACID em `data/database.json` com escrita síncrona segura e zero dependências de compilação nativa.
- **Exportação:** CSV formatado com delimitador e Byte Order Mark (UTF-8 BOM) para compatibilidade nativa com Microsoft Excel e LibreOffice Calc em português.

---

## 🎨 Identidade Visual e Acessibilidade

- **Paleta de Cores:**
  - Bordô Institucional BNB (`#6B1D2F` e gradientes `#4D1220`)
  - Branco Puro e Cinzas Slate Neutros (`#F8FAFC`, `#E2E8F0`, `#0F172A`)
  - Acentos em Dourado / Âmbar (`#D97706`) celebrando os 10 anos
- **Espaços Oficiais Reservados:** Enquadramentos próprios para inserção das marcas oficiais do Banco do Nordeste e do Hubine, sem logotipos fictícios.
- **Conformidade de Acessibilidade:** Foco visível (`:focus-visible`), navegação completa por teclado, contraste em conformidade com as diretrizes WCAG 2.1 AA, campos com rótulos semânticos e notas de confidencialidade para necessidades especiais.

---

## 📦 Como Instalar e Executar

### 1. Pré-requisitos
- Node.js (v18, v20, v22 ou v24)
- npm

### 2. Instalação das Dependências
```bash
npm install
```

### 3. Inicialização dos Dados Padrão (Seed)
Executa a criação das configurações institucionais, grade oficial de programação, palestrantes previstos e os usuários com perfis de acesso:
```bash
npm run seed
```

### 4. Executando o Servidor
```bash
npm start
```
Acesse no navegador:
- **Página Pública do Evento:** [http://localhost:3000](http://localhost:3000)
- **Painel da Organização:** [http://localhost:3000/#admin](http://localhost:3000/#admin)
- **Credenciamento Mobile:** [http://localhost:3000/#credenciamento](http://localhost:3000/#credenciamento)

### 5. Execução da Bateria de Testes Automatizados
Testa todos os 10 fluxos exigidos (inscrição, duplicidade, lista de espera, credenciamento, convite de palestrante, autoatendimento, permissões e exportação):
```bash
npm test
```

---

## 🔑 Credenciais Institucionais Pré-configuradas

O comando de seed inicializa três contas de acesso com papéis bem definidos:

| Perfil | E-mail | Senha Padrão | Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@hubine10anos.bnb.gov.br` | `HubineAdmin2026!` | Gestão completa, capacidade, configurações, usuários, auditoria e exportação. |
| **Organização** | `organizacao@hubine10anos.bnb.gov.br` | `HubineOrg2026!` | Gestão de participantes, emissão de convites de palestrantes, revisão e programação. |
| **Credenciamento** | `credenciamento@hubine10anos.bnb.gov.br` | `Checkin2026!` | Leitura de QR Code pela câmera, busca manual e registro de presenças. |

> **Nota de Segurança:** Para criar ou redefinir administradores adicionais em ambiente de produção, utilize o próprio painel de usuários pelo Administrador ou modifique a variável `JWT_SECRET` no arquivo `.env`.

---

## ⚙️ Variáveis de Ambiente (`.env`)

Copie o arquivo `.env.example` para `.env`:

```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
JWT_SECRET=hubine-10-anos-chave-secreta-jwt-2026-prod

# Configurações de SMTP para envio real de e-mails
# Caso não configuradas, o sistema opera automaticamente no MODO DEMONSTRAÇÃO
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Hubine 10 Anos <hubine10anos@bnb.gov.br>"
```

### ⚡ Modo Demonstração (Sem SMTP Externo)
Na ausência de credenciais SMTP reais, o sistema ativa automaticamente o **Modo Demonstração**:
- Uma barra discreta no topo informa que o modo de demonstração está ativo.
- O sistema **não simula falsamente** o envio externo: todos os e-mails gerados (comprovantes com QR Code, avisos de vaga e convites de palestrantes) são armazenados na aba **"Caixa de E-mails (Demo)"** do painel restrito.
- A organização e avaliadores podem inspecionar o HTML renderizado e clicar diretamente nos links para validar toda a experiência do participante.

---

## 📋 Fluxos do Sistema

### 1. Inscrição de Convidados
- Campos obrigatórios: Nome completo, E-mail, Instituição/Empresa e Perfil de participação.
- Campos opcionais: Nome social / nome para crachá, Cargo/Função, Telefone/WhatsApp, Cidade e UF, e Solicitação de recurso de acessibilidade.
- Não solicita CPF, RG, endereço residencial ou data de nascimento.
- Prevenção contra e-mails duplicados com mensagem amigável e reenvio de comprovante.
- Ao atingir a capacidade configurada (ex: 250 pessoas), o sistema inscreve automaticamente na **Lista de Espera**.

### 2. Comprovante e Credencial Digital
- Número de inscrição individual: `HUB10-XXXX`.
- QR Code seguro contendo identificador opaco aleatório (`urn:hubine:checkin:uuid`), sem dados pessoais legíveis em texto plano.
- Botão "Adicionar ao Google Agenda" e download de arquivo de calendário `.ics`.
- Autoatendimento com link individual para editar nome para crachá, telefone ou cancelar a inscrição.
- O cancelamento voluntário de uma inscrição confirmada **promove automaticamente** o próximo participante da lista de espera e dispara a notificação de vaga!

### 3. Cadastro e Revisão de Palestrantes
- Inscrição pública não permite seleção de papel de palestrante.
- O cadastro de palestrante exige convite individual gerado pela organização com link seguro (`/#palestrante/convite/:token`).
- Coleta nome profissional, cargo, instituição, resumo da palestra, necessidades audiovisuais (AV), foto profissional e **autorização expressa específica** para publicação.
- Nada é publicado na grade sem a aprovação prévia da organização no painel restrito.

### 4. Credenciamento Mobile
- Interface otimizada para smartphones com leitura de QR Code em tempo real pela câmera.
- Busca manual rápida alternativa por nome ou código `HUB10-XXXX`.
- Feedback audiovisual imediato:
  - 🟢 **Sucesso:** Nome, crachá, instituição e operador com carimbo de data/hora (fuso *America/Fortaleza*).
  - 🟡 **Alerta:** Aviso de check-in já realizado anteriormente, informando o operador e horário prévios.
  - 🛑 **Atenção:** Aviso para inscrições canceladas ou participantes em lista de espera.
- Botão para desfazer check-in em caso de leitura acidental.

### 5. Privacidade e Proteção de Dados (LGPD)
- Aviso de privacidade com indicação do controlador (Banco do Nordeste / Hubine), finalidades legítimas, base legal e prazo de retenção (90 dias).
- Opção para comunicações futuras desmarcada por padrão.
- Informações de acessibilidade restritas à equipe de suporte para acolhimento individual.
