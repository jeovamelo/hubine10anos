const fs = require('fs');
const path = require('path');
const postgres = require('./postgres');

const DATA_DIR = process.env.HUBINE_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = process.env.HUBINE_DB_PATH || path.join(DATA_DIR, 'database.json');
const EXAMPLE_DB_FILE = path.join(__dirname, '..', 'data', 'database.example.json');

const DEFAULT_STATE = {
  settings: {
    eventName: "Hubine 10 Anos",
    theme: "Conectando inovação, pessoas e desenvolvimento regional",
    eventDate: "2026-11-04",
    eventDateFormatted: "4 de novembro de 2026",
    checkinStartTime: "13:00",
    eventEndTime: "18:00",
    locationName: "Auditório Celso Furtado",
    locationCity: "Fortaleza — CE",
    locationAddress: "Av. Dr. Silas Munguba, 5700 - Passaré (Campus Banco do Nordeste)",
    locationMapUrl: "https://maps.google.com/?q=Banco+do+Nordeste+Passare+Fortaleza",
    capacity: 250,
    registrationsOpen: true,
    contactEmail: "hubine10anos@bnb.gov.br",
    privacyNotice: {
      controller: "Banco do Nordeste do Brasil S.A. — Hub de Inovação (Hubine)",
      purpose: "Credenciamento, emissão de comprovantes, organização logística, segurança predial e controle de acesso ao evento comemorativo Hubine 10 Anos.",
      legalBasis: "Execução de procedimentos preliminares a pedido do titular e legítimo interesse institucional (Art. 7º, incisos V e IX da Lei Geral de Proteção de Dados - LGPD).",
      retentionPeriod: "90 dias após o encerramento do evento para fins de auditoria e emissão de certificados, após os quais os dados cadastrais serão eliminados ou anonimizados, exceto comunicações expressamente autorizadas.",
      dpoContact: "privacidade@bnb.gov.br",
      accessibilityNote: "Dados sobre recursos de acessibilidade têm tratamento confidencial e restrito à equipe técnica de suporte do evento para atendimento às necessidades indicadas."
    }
  },
  users: [],
  registrations: [],
  speakers: [],
  schedule: [],
  auditLogs: [],
  emailOutbox: [],
  whatsappOutbox: []
};

class AsyncLock {
  constructor() {
    this.queue = Promise.resolve();
  }
  acquire(fn) {
    const next = this.queue.then(() => fn());
    this.queue = next.catch(() => {});
    return next;
  }
}

function normalizeDigits(str) {
  if (!str) return '';
  return String(str).replace(/\D/g, '');
}

function formatRegistration(r) {
  if (!r) return null;
  return {
    ...r,
    origin: r.origin || 'PUBLIC_REGISTRATION',
    whatsapp: r.whatsapp || r.phone || '',
    invitedBy: r.invitedBy || null,
    invitedAt: r.invitedAt || null,
    invitationSentAt: r.invitationSentAt || null,
    invitationChannel: r.invitationChannel || null,
    invitationStatus: r.invitationStatus || (r.origin === 'ORGANIZATION_INVITE' ? 'PENDENTE' : null),
    internalNotes: r.internalNotes || ''
  };
}

class Database {
  constructor() {
    this.data = null;
    this.lock = new AsyncLock();
    this.lastMtime = 0;
    this.pg = postgres;
    this.isPostgresReady = false;
    this.init();
  }

  async runLocked(fn) {
    return this.lock.acquire(fn);
  }

  async initPostgres() {
    if (!this.pg.isEnabled()) {
      return false;
    }
    const ok = await this.pg.init();
    if (!ok) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FALHA CRÍTICA DE PERSISTÊNCIA: PostgreSQL configurado via DATABASE_URL não está acessível no ambiente de produção. Operação interrompida para evitar divergência de dados.');
      }
      console.warn('⚠️ [Database] Falha ao conectar ao PostgreSQL. Operando com armazenamento local JSON como fallback em ambiente de desenvolvimento/teste.');
      return false;
    }

    try {
      const existing = await this.pg.loadAll();
      if (existing && existing.users && existing.users.length > 0) {
        console.log(`✓ [PostgreSQL] Carregados ${existing.registrations.length} inscritos e ${existing.users.length} usuários do banco PostgreSQL.`);
        this.data = existing;
        this.saveSync(); // Mantém backup local em sincronia
      } else {
        if (process.env.AUTO_MIGRATE_FROM_JSON === 'true') {
          console.log(`[PostgreSQL] Banco PostgreSQL vazio e AUTO_MIGRATE_FROM_JSON=true. Migrando ${this.data.registrations.length} inscritos e ${this.data.users.length} usuários para o PostgreSQL...`);
          await this.pg.migrateFromState(this.data);
          console.log(`✓ [PostgreSQL] Migração para o PostgreSQL concluída com sucesso!`);
        } else {
          console.log(`[PostgreSQL] Banco PostgreSQL inicializado vazio.`);
        }
      }
      this.isPostgresReady = true;
      return true;
    } catch (e) {
      console.error('❌ [PostgreSQL] Erro ao carregar dados do PostgreSQL:', e.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`FALHA CRÍTICA DE PERSISTÊNCIA: Erro ao carregar dados do PostgreSQL em produção: ${e.message}`);
      }
      return false;
    }
  }

  reloadIfModified() {
    if (this.isPostgresReady) return;
    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        if (stat.mtimeMs !== this.lastMtime || stat.size !== this.lastSize) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          this.data = JSON.parse(raw);
        if (!this.data.whatsappOutbox) this.data.whatsappOutbox = [];
          this.lastMtime = stat.mtimeMs;
          this.lastSize = stat.size;
        }
      }
    } catch (err) {
      // ignore
    }
  }

  reload() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
        return true;
      } catch (err) {
        console.error("Erro ao recarregar banco de dados:", err);
      }
    }
    return false;
  }

  _writeAtomic(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    const fd = fs.openSync(tmp, 'w');
    fs.writeFileSync(fd, content, 'utf-8');
    try { fs.fsyncSync(fd); } catch (e) {}
    fs.closeSync(fd);

    let attempts = 0;
    while (true) {
      try {
        fs.renameSync(tmp, filePath);
        break;
      } catch (err) {
        attempts++;
        if (attempts > 5) {
          try {
            fs.copyFileSync(tmp, filePath);
            fs.unlinkSync(tmp);
            break;
          } catch (copyErr) {
            try { fs.unlinkSync(tmp); } catch (e) {}
            throw err;
          }
        }
        const start = Date.now();
        while (Date.now() - start < 15) {}
      }
    }

    // Maintain a rotating backup copy of the valid DB
    try {
      const backupPath = `${filePath}.backup`;
      fs.copyFileSync(filePath, backupPath);
    } catch (e) {}
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        const stat = fs.statSync(DB_FILE);
        this.lastMtime = stat.mtimeMs;
        this.lastSize = stat.size;
      } catch (err) {
        console.error("❌ [Database] Arquivo JSON corrompido ou ilegível:", err.message);
        // Preserva arquivo corrompido para perícia forense
        const corruptedPath = `${DB_FILE}.corrupted.${Date.now()}`;
        try {
          fs.copyFileSync(DB_FILE, corruptedPath);
          console.warn(`⚠️ [Database] Arquivo corrompido preservado em: ${corruptedPath}`);
        } catch (e) {}

        // Tenta recuperar do backup
        const backupPath = `${DB_FILE}.backup`;
        let recovered = false;
        if (fs.existsSync(backupPath)) {
          try {
            const rawBackup = fs.readFileSync(backupPath, 'utf-8');
            this.data = JSON.parse(rawBackup);
            this.saveSync();
            console.log(`✓ [Database] Recuperado com sucesso a partir de backup validado (${backupPath}).`);
            recovered = true;
          } catch (bErr) {
            console.error("❌ [Database] Backup também está corrompido:", bErr.message);
          }
        }

        if (!recovered) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error(`FALHA CRÍTICA DE PERSISTÊNCIA: Banco de dados JSON corrompido e sem backup válido. Processo interrompido para evitar perda silenciosa de dados. Arquivo: ${corruptedPath}`);
          } else {
            console.warn("⚠️ [Database] Modo de teste/dev: restaurando estado inicial a partir do template.");
            this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
            this.saveSync();
          }
        }
      }
    } else {
      if (fs.existsSync(EXAMPLE_DB_FILE)) {
        try {
          const rawExample = fs.readFileSync(EXAMPLE_DB_FILE, 'utf-8');
          this.data = JSON.parse(rawExample);
          this.saveSync();
          console.log('✓ [Database] Inicializado com sucesso a partir de database.example.json.');
          return;
        } catch (e) {}
      }
      this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.saveSync();
    }
  }

  saveSync() {
    const json = JSON.stringify(this.data, null, 2);
    this._writeAtomic(DB_FILE, json);
    try {
      const stat = fs.statSync(DB_FILE);
      this.lastMtime = stat.mtimeMs;
      this.lastSize = stat.size;
    } catch (e) {}
  }

  async save() {
    return new Promise((resolve, reject) => {
      try {
        const json = JSON.stringify(this.data, null, 2);
        this._writeAtomic(DB_FILE, json);
        try {
          const stat = fs.statSync(DB_FILE);
          this.lastMtime = stat.mtimeMs;
          this.lastSize = stat.size;
        } catch (e) {}
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  getSettings() {
    this.reloadIfModified();
    return this.data.settings;
  }

  async updateSettings(partial) {
    this.reloadIfModified();
    this.data.settings = { ...this.data.settings, ...partial };
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveSettings(this.data.settings);
    }
    return this.data.settings;
  }

  // Users
  getUsers() {
    this.reloadIfModified();
    return this.data.users;
  }

  getUserByEmail(email) {
    this.reloadIfModified();
    if (!email) return null;
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id) {
    this.reloadIfModified();
    return this.data.users.find(u => u.id === id);
  }

  async addUser(user) {
    this.reloadIfModified();
    this.data.users.push(user);
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveUser(user);
    }
    return user;
  }

  async updateUser(id, updates) {
    this.reloadIfModified();
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveUser(this.data.users[idx]);
    }
    return this.data.users[idx];
  }

  async deleteUser(id) {
    this.reloadIfModified();
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.deleteUser(id);
    }
    return true;
  }

  // Registrations
  getRegistrations() {
    this.reloadIfModified();
    return (this.data.registrations || []).map(formatRegistration);
  }

  getRegistrationById(id) {
    this.reloadIfModified();
    const reg = (this.data.registrations || []).find(r => r.id === id);
    return formatRegistration(reg);
  }

  getRegistrationByToken(token) {
    this.reloadIfModified();
    const reg = (this.data.registrations || []).find(r => r.token === token);
    return formatRegistration(reg);
  }

  getRegistrationByQrToken(qrToken) {
    this.reloadIfModified();
    const reg = (this.data.registrations || []).find(r => r.qrToken === qrToken);
    return formatRegistration(reg);
  }


  // Helper para buscar inscrição ATIVA (exclui CANCELADO, DESISTIU, NAO_VEM)
  getActiveRegistrationByEmail(email) {
    this.reloadIfModified();
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    const found = (this.data.registrations || []).find(r => 
      r.email && r.email.trim().toLowerCase() === clean && !['CANCELADO', 'DESISTIU', 'NAO_VEM'].includes(r.status)
    );
    return formatRegistration(found);
  }

  // Helper para buscar inscrição ATIVA por telefone/whatsapp
  getActiveRegistrationByPhone(phone) {
    this.reloadIfModified();
    if (!phone) return null;
    const digits = normalizeDigits(phone);
    if (!digits) return null;
    const found = (this.data.registrations || []).find(r => {
      if (['CANCELADO', 'DESISTIU', 'NAO_VEM'].includes(r.status)) return false;
      const rDigits = normalizeDigits(r.whatsapp || r.phone);
      return rDigits === digits || (digits.length >= 10 && rDigits.endsWith(digits.slice(-10)));
    });
    return formatRegistration(found);
  }

  getRegistrationByEmail(email) {
    this.reloadIfModified();
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    const reg = (this.data.registrations || []).find(r => r.email && r.email.toLowerCase() === clean);
    return formatRegistration(reg);
  }

  getRegistrationByWhatsapp(phoneOrWhatsapp) {
    this.reloadIfModified();
    if (!phoneOrWhatsapp) return null;
    const target = normalizeDigits(phoneOrWhatsapp);
    if (!target) return null;
    const reg = (this.data.registrations || []).find(r => {
      if (r.status === 'CANCELADO') return false;
      const rPhone = normalizeDigits(r.whatsapp || r.phone);
      return rPhone && rPhone === target;
    });
    return formatRegistration(reg);
  }

  getRegistrationByNumber(num) {
    this.reloadIfModified();
    if (!num) return null;
    const clean = num.trim().toUpperCase();
    const reg = (this.data.registrations || []).find(r => r.registrationNumber && r.registrationNumber.toUpperCase() === clean);
    return formatRegistration(reg);
  }

  getNextRegistrationNumber() {
    this.reloadIfModified();
    let maxSeq = 1000;
    for (const r of (this.data.registrations || [])) {
      if (r.registrationNumber) {
        const m = r.registrationNumber.match(/HUB10-(\d+)/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (!isNaN(val) && val > maxSeq) {
            maxSeq = val;
          }
        }
      }
    }
    return `HUB10-${maxSeq + 1}`;
  }

  generateRegistrationNumber() {
    return this.getNextRegistrationNumber();
  }

  async generateQrCode(text) {
    const qrcode = require('qrcode');
    return qrcode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#6B1D2F',
        light: '#FFFFFF'
      }
    });
  }

  async addRegistration(reg) {
    const formatted = formatRegistration(reg);
    this.data.registrations.push(formatted);
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveRegistration(formatted);
    }
    return formatted;
  }

  async updateRegistration(id, updates) {
    const idx = this.data.registrations.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.registrations[idx] = formatRegistration({
      ...this.data.registrations[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveRegistration(this.data.registrations[idx]);
    }
    return this.data.registrations[idx];
  }

  async deleteRegistration(id) {
    const idx = this.data.registrations.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.data.registrations.splice(idx, 1);
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.deleteRegistration(id);
    }
    return true;
  }

  getConfirmedCount() {
    return this.data.registrations.filter(r => r.status === 'CONFIRMADO' || r.status === 'PRESENTE').length;
  }

  getWaitlistCount() {
    return this.data.registrations.filter(r => r.status === 'LISTA_ESPERA').length;
  }

  // Speakers
  getSpeakers() {
    this.reloadIfModified();
    return this.data.speakers;
  }

  getSpeakerById(id) {
    this.reloadIfModified();
    return this.data.speakers.find(s => s.id === id);
  }

  getSpeakerByInviteToken(token) {
    this.reloadIfModified();
    return this.data.speakers.find(s => s.inviteToken === token);
  }

  async addSpeaker(speaker) {
    this.reloadIfModified();
    this.data.speakers.push(speaker);
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveSpeaker(speaker);
    }
    return speaker;
  }

  async updateSpeaker(id, updates) {
    this.reloadIfModified();
    const idx = this.data.speakers.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.speakers[idx] = { ...this.data.speakers[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveSpeaker(this.data.speakers[idx]);
    }
    return this.data.speakers[idx];
  }

  async deleteSpeaker(id) {
    this.reloadIfModified();
    const idx = this.data.speakers.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.speakers.splice(idx, 1);
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.deleteSpeaker(id);
    }
    return true;
  }

  // Schedule
  getSchedule() {
    this.reloadIfModified();
    return this.data.schedule;
  }

  async updateSchedule(items) {
    this.reloadIfModified();
    this.data.schedule = items;
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveSchedule(items);
    }
    return this.data.schedule;
  }

  // Audit Logs
  getAuditLogs(limit = 200) {
    this.reloadIfModified();
    return this.data.auditLogs.slice(-limit).reverse();
  }

  async addAuditLog(entry) {
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.auditLogs.push(log);
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(-2000);
    }
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveAuditLog(log);
    }
    return log;
  }

  // Email Outbox (for Demo Mode)
  getEmailOutbox(limit = 100) {
    return this.data.emailOutbox.slice(-limit).reverse();
  }

  async addEmailOutbox(email) {
    const item = {
      id: 'mail_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...email
    };
    this.data.emailOutbox.push(item);
    if (this.data.emailOutbox.length > 300) {
      this.data.emailOutbox = this.data.emailOutbox.slice(-300);
    }
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.saveEmailOutbox(item);
    }
    return item;
  }

  async clearEmailOutbox() {
    this.data.emailOutbox = [];
    await this.save();
    if (this.isPostgresReady) {
      await this.pg.clearEmailOutbox();
    }
    return true;
  }

  // WhatsApp Outbox
  getWhatsappOutbox(limit = 100) {
    if (!this.data.whatsappOutbox) this.data.whatsappOutbox = [];
    return this.data.whatsappOutbox.slice(-limit).reverse();
  }

  async addWhatsappOutbox(msg) {
    if (!this.data.whatsappOutbox) this.data.whatsappOutbox = [];
    const item = {
      id: 'wa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...msg
    };
    this.data.whatsappOutbox.push(item);
    if (this.data.whatsappOutbox.length > 300) {
      this.data.whatsappOutbox = this.data.whatsappOutbox.slice(-300);
    }
    await this.save();
    return item;
  }

  async updateWhatsappOutbox(id, updates) {
    if (!this.data.whatsappOutbox) this.data.whatsappOutbox = [];
    const idx = this.data.whatsappOutbox.findIndex(m => m.id === id || m.providerMessageId === id);
    if (idx !== -1) {
      this.data.whatsappOutbox[idx] = {
        ...this.data.whatsappOutbox[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.whatsappOutbox[idx];
    }
    return null;
  }

  getWhatsappOutboxByProviderId(providerId) {
    if (!this.data.whatsappOutbox) return null;
    return this.data.whatsappOutbox.find(m => m.providerMessageId === providerId) || null;
  }

  async clearWhatsappOutbox() {
    this.data.whatsappOutbox = [];
    await this.save();
    return true;
  }
}

const db = new Database();
module.exports = db;
