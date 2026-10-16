const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const TMP_FILE = path.join(DATA_DIR, 'database.json.tmp');

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
  emailOutbox: []
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
    this.init();
  }

  async runLocked(fn) {
    return this.lock.acquire(fn);
  }

  reloadIfModified() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        if (stat.mtimeMs > this.lastMtime + 50) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          this.data = JSON.parse(raw);
          this.lastMtime = stat.mtimeMs;
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

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
      } catch (err) {
        console.error("Erro ao ler banco de dados existente, restaurando padrão:", err);
        this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.saveSync();
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.saveSync();
    }
  }

  saveSync() {
    const json = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(DB_FILE, json, 'utf-8');
    try {
      this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch (e) {}
  }

  async save() {
    return new Promise((resolve, reject) => {
      const json = JSON.stringify(this.data, null, 2);
      fs.writeFile(DB_FILE, json, 'utf-8', (err) => {
        if (err) return reject(err);
        try {
          this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
        } catch (e) {}
        resolve();
      });
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
    return user;
  }

  async updateUser(id, updates) {
    this.reloadIfModified();
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    return this.data.users[idx];
  }

  async deleteUser(id) {
    this.reloadIfModified();
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    await this.save();
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

  async addRegistration(reg) {
    const formatted = formatRegistration(reg);
    this.data.registrations.push(formatted);
    await this.save();
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
    return this.data.registrations[idx];
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
    return speaker;
  }

  async updateSpeaker(id, updates) {
    this.reloadIfModified();
    const idx = this.data.speakers.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.speakers[idx] = { ...this.data.speakers[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    return this.data.speakers[idx];
  }

  async deleteSpeaker(id) {
    this.reloadIfModified();
    const idx = this.data.speakers.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.speakers.splice(idx, 1);
    await this.save();
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
    return item;
  }

  async clearEmailOutbox() {
    this.data.emailOutbox = [];
    await this.save();
    return true;
  }
}

const db = new Database();
module.exports = db;
