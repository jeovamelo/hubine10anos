# Hubine 10 Anos — Sistema Institucional de Inscrição e Credenciamento

Aplicação web completa, segura e responsiva para o evento comemorativo dos **10 anos do Hub de Inovação do Banco do Nordeste — Hubine**.

- **Tema:** *Conectando inovação, pessoas e desenvolvimento regional*
- **Data do Evento:** 4 de novembro de 2026
- **Local:** Auditório Celso Furtado, Fortaleza — CE
- **Início do Credenciamento:** 13h
- **E-mail Oficial:** `eventos@hubine.org` / `hubine10anos@bnb.gov.br`

---

## 🚀 Tecnologias Utilizadas

- **Backend:** Node.js, Express 5, JWT (`jsonwebtoken`), Criptografia com `bcryptjs`, Envio SMTP autenticado com TLS (`nodemailer`), Adaptador Evolution API para WhatsApp, Mutex assíncrono para serialização de concorrência.
- **Frontend:** Single Page Application (SPA) em Vanilla JavaScript (ES6+), Vanilla CSS estruturado com tokens de design system, tipografia Google Fonts (*Outfit* e *Plus Jakarta Sans*).
- **Credenciamento Rápido:** Busca instantânea por número de inscrição e/ou nome do participante com sintetizador de áudio via Web Audio API.
- **Persistência de Dados Híbrida:**
  - **Armazenamento JSON Seguro:** Gravação atômica via arquivo temporário com `fsync` e backup rotativo, isolamento por Mutex e quarentena automática de arquivos corrompidos em `data/database.json`.
  - **PostgreSQL de Alta Concorrência:** Suporte nativo transacional via `DATABASE_URL` com isolamento de transações e índices parciais de unicidade.
- **Exportação:** CSV seguro contra injeção de fórmulas com delimitação e Byte Order Mark (UTF-8 BOM) para compatibilidade nativa com Microsoft Excel e LibreOffice Calc.

---

## 🎨 Identidade Visual e Acessibilidade

- **Paleta de Cores:**
  - Bordô Institucional BNB (`#6B1D2F` e gradientes `#4D1220`)
  - Branco Puro e Cinzas Slate Neutros (`#F8FAFC`, `#E2E8F0`, `#0F172A`)
  - Acentos em Dourado / Âmbar (`#D97706`) celebrando os 10 anos
- **Acessibilidade:** Foco visível (`:focus-visible`), navegação completa por teclado, contraste em conformidade com WCAG 2.1 AA, campos com rótulos semânticos e notas de confidencialidade para necessidades especiais.

---

## 📦 Como Instalar e Executar

### 1. Pré-requisitos
- Node.js (v18, v20, v22 ou v24)
- npm

### 2. Instalação das Dependências
```bash
npm install
```

### 3. Configuração de Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure chaves exclusivas para o ambiente:
```bash
cp .env.example .env
```

### 4. Inicialização Segura (Seed)
Em desenvolvimento, cria as contas de demonstração e a programação inicial. Em produção, inicializa apenas as configurações do evento e o administrador seguro caso configurado via `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`:
```bash
npm run seed
```

### 5. Executando o Servidor
```bash
npm start
```
Acesse no navegador:
- **Página Pública do Evento:** [http://localhost:3000](http://localhost:3000)
- **Painel da Organização:** [http://localhost:3000/#admin](http://localhost:3000/#admin)
- **Credenciamento Mobile:** [http://localhost:3000/#credenciamento](http://localhost:3000/#credenciamento)
- **Rota Alternativa:** [http://localhost:3000/dezanos/](http://localhost:3000/dezanos/)

### 6. Execução da Bateria de Testes Automatizados Isolados
Testa todos os 16 itens técnicos e de segurança em ambiente completamente isolado (sem tocar em `data/database.json`):
```bash
npm test
```

---

## 🔐 Segurança, Troca de Senha e Rotação de Credenciais

### Alteração do JWT_SECRET
> [!IMPORTANT]
> **Esclarecimento Importante:** A variável `JWT_SECRET` é utilizada exclusivamente para a assinatura criptográfica dos tokens de sessão JWT. **Alterar o `JWT_SECRET` NÃO redefine as senhas dos usuários.** Ao alterar `JWT_SECRET`, todas as sessões ativas no navegador são imediatamente invalidadas, exigindo novo login.
>
> Em ambiente de produção (`NODE_ENV=production`), o sistema **bloqueia a inicialização** caso o `JWT_SECRET` possua menos de 32 caracteres ou corresponda a chaves de exemplo conhecidas do repositório.

### Procedimento para Troca de Senha de Usuários
Para trocar ou redefinir a senha de qualquer usuário (administrador, organização ou credenciamento) diretamente no servidor sem intervenção no banco, utilize o script utilitário seguro:
```bash
node server/change-password.js <email_do_usuario> <nova_senha_forte>
```
*Exemplo:*
```bash
node server/change-password.js admin@hubine10anos.bnb.gov.br "NovaSenhaComplexa2026!#"
```

---

## 🗄️ Arquitetura de Persistência e Limites do Armazenamento JSON

A aplicação oferece dois modos de persistência:

1. **Modo JSON (`data/database.json`):**
   - **Garantias:** Escritas atômicas via arquivos temporários (`writeAtomic`), `fsync` no sistema de arquivos, backup rotativo automático (`database.json.backup`) a cada alteração, e quarentena forense de arquivos corrompidos (`database.json.corrupted.<timestamp>`).
   - **Controle de Concorrência:** Serialização através de fila assíncrona (`AsyncMutex`) em memória.
   - **Limites Operacionais:** Ideal para instâncias únicas (*single-node*) de desenvolvimento, homologação ou eventos de médio porte. **Não é recomendado para clusters multi-instâncias** (múltiplos processos Node compartilhando o mesmo arquivo JSON via NFS ou volume de rede).
2. **Modo PostgreSQL (`DATABASE_URL`):**
   - **Garantias:** Concorrência total entre múltiplas instâncias da aplicação, transações ACID nativas, índices parciais de unicidade para e-mails ativos e persistência robusta.
   - **Recomendação de Produção:** Para implantação em containers com réplicas ou alta demanda simultânea no credenciamento, configure a variável `DATABASE_URL`.

---

## 📧 Integração de E-mail (`eventos@hubine.org`)

A aplicação suporta envio autenticado via SMTP com TLS:

```env
SMTP_HOST=mail.hubine.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=eventos@hubine.org
SMTP_PASS=<SENHA_SEGURA>
SMTP_FROM="Hubine Eventos <eventos@hubine.org>"
SMTP_REPLY_TO="eventos@hubine.org"
SMTP_REJECT_UNAUTHORIZED=true
```

- **Validação de Conectividade:** A rota `GET /api/admin/diagnostics/email` testa a comunicação SMTP diretamente pelo painel administrativo.
- **Modo Demonstração:** Na ausência de SMTP configurado, o sistema arquiva as mensagens na aba "Caixa de E-mails (Demo)" sem simular falso envio real.
- **Procedimento DNS de Implantação:** Consulte o guia completo com registros MX, SPF, DKIM, DMARC e PTR em [`docs/email-setup-hubine-org.md`](docs/email-setup-hubine-org.md).

---

## 💬 Integração WhatsApp (Evolution API)

O envio de convites e links de credenciamento via WhatsApp é realizado exclusivamente pelo backend:

```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=<CHAVE_API_EVOLUTION>
EVOLUTION_INSTANCE_NAME=hubine
EVOLUTION_WEBHOOK_SECRET=<SEGREDO_WEBHOOK>
```

- **Nenhuma chave ou URL é exposta ao navegador.**
- **Normalização de Telefones:** Formata automaticamente números brasileiros para DDI 55 + DDD + dígitos, rejeitando números inválidos.
- **Estados de Comunicação:**
  - `LINK_MANUAL_PREPARADO`: Quando a organização gera link para envio manual via WhatsApp Web (não marca como enviado).
  - `ENVIADO`: Aceito pela API externa.
  - `ENTREGUE` / `LIDO`: Atualizado automaticamente via webhook `/api/webhooks/evolution`.
  - `FALHOU`: Registro de erro e visibilidade no painel com botão de reprocessamento.
- **Diagnóstico:** A rota `GET /api/admin/diagnostics/whatsapp` verifica o estado da instância conectada.

---

## 🛡️ Proteção LGPD e Neutralização de CSV

- **Minimização de Dados por Perfil (RBAC):** Operadores de credenciamento recebem apenas os dados estritamente necessários ao acolhimento e crachá (sem acesso a tokens de autoatendimento, notas internas ou contatos privados).
- **Proteção contra Injeção de Fórmulas no CSV:** Exportações de participantes neutralizam caracteres de controle e prefixos `=, +, -, @, \t, \r` com apóstrofo (`'`), impedindo a execução arbitrária de fórmulas no Excel e LibreOffice.
- **Quarentena e Dados Sensíveis:** O arquivo `data/database.example.json` contém exclusivamente registros fictícios. Nenhum dado operacional real ou credencial é versionado no Git.
