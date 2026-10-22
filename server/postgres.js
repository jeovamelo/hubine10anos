// Hubine 10 Anos - PostgreSQL Storage Engine
const { Pool } = require('pg');

class PostgresStorage {
  constructor() {
    this.pool = null;
    this.ready = false;
  }

  isEnabled() {
    return Boolean(process.env.DATABASE_URL);
  }

  async init() {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const sslConfig = process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false;

      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      // Test connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }

      await this.initSchema();
      this.ready = true;
      console.log('✓ [PostgreSQL] Conexão com o banco de dados PostgreSQL estabelecida e schema verificado.');
      return true;
    } catch (err) {
      console.error('❌ [PostgreSQL] Erro ao conectar ou inicializar banco PostgreSQL:', err.message);
      this.ready = false;
      return false;
    }
  }

  async initSchema() {
    const ddl = `
      CREATE TABLE IF NOT EXISTS hubine_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hubine_users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        role TEXT,
        active BOOLEAN DEFAULT TRUE,
        raw_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hubine_registrations (
        id TEXT PRIMARY KEY,
        registration_number TEXT UNIQUE,
        token TEXT UNIQUE,
        qr_token TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        whatsapp TEXT,
        institution TEXT,
        profile TEXT,
        origin TEXT,
        type TEXT,
        status TEXT,
        waitlist_position INT,
        checkin_at TIMESTAMPTZ,
        raw_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reg_email ON hubine_registrations (email);
      CREATE INDEX IF NOT EXISTS idx_reg_status ON hubine_registrations (status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_active_email ON hubine_registrations (LOWER(email)) WHERE status NOT IN ('CANCELADO', 'DESISTIU', 'NAO_VEM');
      CREATE INDEX IF NOT EXISTS idx_reg_token ON hubine_registrations (token);
      CREATE INDEX IF NOT EXISTS idx_reg_qr_token ON hubine_registrations (qr_token);
      CREATE INDEX IF NOT EXISTS idx_reg_number ON hubine_registrations (registration_number);

      CREATE TABLE IF NOT EXISTS hubine_speakers (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        institution TEXT,
        status TEXT,
        invite_token TEXT,
        raw_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hubine_schedule (
        id TEXT PRIMARY KEY,
        raw_data JSONB NOT NULL,
        order_index INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS hubine_audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        action TEXT,
        details TEXT,
        user_name TEXT,
        raw_data JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_time ON hubine_audit_logs (timestamp DESC);

      CREATE TABLE IF NOT EXISTS hubine_email_outbox (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        to_email TEXT,
        subject TEXT,
        sent BOOLEAN DEFAULT FALSE,
        raw_data JSONB NOT NULL
      );
    `;

    await this.pool.query(ddl);
  }

  async loadAll() {
    if (!this.ready) return null;

    try {
      const settingsRes = await this.pool.query("SELECT data FROM hubine_settings WHERE id = 'settings'");
      const usersRes = await this.pool.query("SELECT raw_data FROM hubine_users ORDER BY created_at ASC");
      const regRes = await this.pool.query("SELECT raw_data FROM hubine_registrations ORDER BY created_at ASC");
      const spkRes = await this.pool.query("SELECT raw_data FROM hubine_speakers ORDER BY created_at ASC");
      const schedRes = await this.pool.query("SELECT raw_data FROM hubine_schedule ORDER BY order_index ASC");
      const auditRes = await this.pool.query("SELECT raw_data FROM hubine_audit_logs ORDER BY timestamp ASC");
      const outboxRes = await this.pool.query("SELECT raw_data FROM hubine_email_outbox ORDER BY timestamp ASC");

      if (usersRes.rows.length === 0 || settingsRes.rows.length === 0) {
        return null; // Empty or needs initial migration
      }

      return {
        settings: settingsRes.rows[0].data,
        users: usersRes.rows.map(r => r.raw_data),
        registrations: regRes.rows.map(r => r.raw_data),
        speakers: spkRes.rows.map(r => r.raw_data),
        schedule: schedRes.rows.map(r => r.raw_data),
        auditLogs: auditRes.rows.map(r => r.raw_data),
        emailOutbox: outboxRes.rows.map(r => r.raw_data)
      };
    } catch (err) {
      console.error('❌ [PostgreSQL] Erro ao carregar dados do banco:', err.message);
      return null;
    }
  }

  async migrateFromState(state) {
    if (!this.ready || !state) return false;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Settings
      if (state.settings) {
        await client.query(
          "INSERT INTO hubine_settings (id, data, updated_at) VALUES ('settings', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
          [state.settings]
        );
      }

      // 2. Users
      if (Array.isArray(state.users)) {
        for (const u of state.users) {
          await client.query(
            `INSERT INTO hubine_users (id, name, email, password_hash, role, active, raw_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               email = EXCLUDED.email,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role,
               active = EXCLUDED.active,
               raw_data = EXCLUDED.raw_data,
               updated_at = NOW()`,
            [u.id, u.name, u.email, u.passwordHash, u.role, u.active !== false, u, u.createdAt || new Date()]
          );
        }
      }

      // 3. Registrations
      if (Array.isArray(state.registrations)) {
        for (const r of state.registrations) {
          await client.query(
            `INSERT INTO hubine_registrations (
               id, registration_number, token, qr_token, name, email, phone, whatsapp,
               institution, profile, origin, type, status, waitlist_position, checkin_at,
               raw_data, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             ON CONFLICT (id) DO UPDATE SET
               registration_number = EXCLUDED.registration_number,
               token = EXCLUDED.token,
               qr_token = EXCLUDED.qr_token,
               name = EXCLUDED.name,
               email = EXCLUDED.email,
               phone = EXCLUDED.phone,
               whatsapp = EXCLUDED.whatsapp,
               institution = EXCLUDED.institution,
               profile = EXCLUDED.profile,
               origin = EXCLUDED.origin,
               type = EXCLUDED.type,
               status = EXCLUDED.status,
               waitlist_position = EXCLUDED.waitlist_position,
               checkin_at = EXCLUDED.checkin_at,
               raw_data = EXCLUDED.raw_data,
               updated_at = EXCLUDED.updated_at`,
            [
              r.id,
              r.registrationNumber,
              r.token,
              r.qrToken,
              r.name,
              r.email,
              r.phone,
              r.whatsapp,
              r.institution,
              r.profile,
              r.origin,
              r.type,
              r.status,
              r.waitlistPosition || null,
              r.checkinAt || null,
              r,
              r.createdAt || new Date(),
              r.updatedAt || new Date()
            ]
          );
        }
      }

      // 4. Speakers
      if (Array.isArray(state.speakers)) {
        for (const s of state.speakers) {
          await client.query(
            `INSERT INTO hubine_speakers (id, name, role, institution, status, invite_token, raw_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               role = EXCLUDED.role,
               institution = EXCLUDED.institution,
               status = EXCLUDED.status,
               invite_token = EXCLUDED.invite_token,
               raw_data = EXCLUDED.raw_data,
               updated_at = NOW()`,
            [s.id, s.name, s.role, s.institution, s.status, s.inviteToken, s, s.createdAt || new Date()]
          );
        }
      }

      // 5. Schedule
      if (Array.isArray(state.schedule)) {
        await client.query('DELETE FROM hubine_schedule');
        for (let idx = 0; idx < state.schedule.length; idx++) {
          const item = state.schedule[idx];
          await client.query(
            'INSERT INTO hubine_schedule (id, raw_data, order_index) VALUES ($1, $2, $3)',
            [item.id, item, idx]
          );
        }
      }

      // 6. Audit Logs
      if (Array.isArray(state.auditLogs)) {
        for (const log of state.auditLogs.slice(-500)) {
          await client.query(
            `INSERT INTO hubine_audit_logs (id, timestamp, action, details, user_name, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [log.id, log.timestamp || new Date(), log.action, log.details, log.user, log]
          );
        }
      }

      // 7. Email Outbox
      if (Array.isArray(state.emailOutbox)) {
        for (const mail of state.emailOutbox.slice(-100)) {
          await client.query(
            `INSERT INTO hubine_email_outbox (id, timestamp, to_email, subject, sent, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [mail.id, mail.timestamp || new Date(), mail.to, mail.subject, Boolean(mail.sent), mail]
          );
        }
      }

      await client.query('COMMIT');
      console.log('✓ [PostgreSQL] Migração de dados concluída com sucesso!');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ [PostgreSQL] Erro na migração de dados:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async saveSettings(settings) {
    if (!this.ready) return;
    try {
      await this.pool.query(
        "INSERT INTO hubine_settings (id, data, updated_at) VALUES ('settings', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
        [settings]
      );
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar settings:', e.message);
    }
  }

  async saveUser(user) {
    if (!this.ready) return;
    try {
      await this.pool.query(
        `INSERT INTO hubine_users (id, name, email, password_hash, role, active, raw_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           active = EXCLUDED.active,
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [user.id, user.name, user.email, user.passwordHash, user.role, user.active !== false, user, user.createdAt || new Date()]
      );
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar user:', e.message);
    }
  }

  async deleteUser(id) {
    if (!this.ready) return;
    try {
      await this.pool.query('DELETE FROM hubine_users WHERE id = $1', [id]);
    } catch (e) {
      console.error('[PostgreSQL] Erro ao deletar user:', e.message);
    }
  }

  async saveRegistration(reg) {
    if (!this.ready) return;
    try {
      await this.pool.query(
        `INSERT INTO hubine_registrations (
           id, registration_number, token, qr_token, name, email, phone, whatsapp,
           institution, profile, origin, type, status, waitlist_position, checkin_at,
           raw_data, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
           registration_number = EXCLUDED.registration_number,
           token = EXCLUDED.token,
           qr_token = EXCLUDED.qr_token,
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           whatsapp = EXCLUDED.whatsapp,
           institution = EXCLUDED.institution,
           profile = EXCLUDED.profile,
           origin = EXCLUDED.origin,
           type = EXCLUDED.type,
           status = EXCLUDED.status,
           waitlist_position = EXCLUDED.waitlist_position,
           checkin_at = EXCLUDED.checkin_at,
           raw_data = EXCLUDED.raw_data,
           updated_at = EXCLUDED.updated_at`,
        [
          reg.id,
          reg.registrationNumber,
          reg.token,
          reg.qrToken,
          reg.name,
          reg.email,
          reg.phone,
          reg.whatsapp,
          reg.institution,
          reg.profile,
          reg.origin,
          reg.type,
          reg.status,
          reg.waitlistPosition || null,
          reg.checkinAt || null,
          reg,
          reg.createdAt || new Date(),
          reg.updatedAt || new Date()
        ]
      );
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar registration:', e.message);
    }
  }

  async deleteRegistration(id) {
    if (!this.ready) return;
    try {
      await this.pool.query('DELETE FROM hubine_registrations WHERE id = $1', [id]);
    } catch (e) {
      console.error('[PostgreSQL] Erro ao deletar registration:', e.message);
    }
  }

  async saveSpeaker(speaker) {
    if (!this.ready) return;
    try {
      await this.pool.query(
        `INSERT INTO hubine_speakers (id, name, role, institution, status, invite_token, raw_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           institution = EXCLUDED.institution,
           status = EXCLUDED.status,
           invite_token = EXCLUDED.invite_token,
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [speaker.id, speaker.name, speaker.role, speaker.institution, speaker.status, speaker.inviteToken, speaker, speaker.createdAt || new Date()]
      );
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar speaker:', e.message);
    }
  }

  async deleteSpeaker(id) {
    if (!this.ready) return;
    try {
      await this.pool.query('DELETE FROM hubine_speakers WHERE id = $1', [id]);
    } catch (e) {
      console.error('[PostgreSQL] Erro ao deletar speaker:', e.message);
    }
  }

  async saveSchedule(schedule) {
    if (!this.ready) return;
    try {
      await this.pool.query('DELETE FROM hubine_schedule');
      for (let idx = 0; idx < schedule.length; idx++) {
        const item = schedule[idx];
        await this.pool.query(
          'INSERT INTO hubine_schedule (id, raw_data, order_index) VALUES ($1, $2, $3)',
          [item.id, item, idx]
        );
      }
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar schedule:', e.message);
    }
  }

  async saveAuditLog(log) {
    if (!this.ready) return;
    try {
      await this.pool.query(
        `INSERT INTO hubine_audit_logs (id, timestamp, action, details, user_name, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [log.id, log.timestamp || new Date(), log.action, log.details, log.user, log]
      );
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar audit log:', e.message);
    }
  }

  async saveEmailOutbox(email) {
    if (!this.ready) return;
    try {
      await this.pool.query(
        `INSERT INTO hubine_email_outbox (id, timestamp, to_email, subject, sent, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [email.id, email.timestamp || new Date(), email.to, email.subject, Boolean(email.sent), email]
      );
    } catch (e) {
      console.error('[PostgreSQL] Erro ao salvar outbox email:', e.message);
    }
  }

  async clearEmailOutbox() {
    if (!this.ready) return;
    try {
      await this.pool.query('DELETE FROM hubine_email_outbox');
    } catch (e) {
      console.error('[PostgreSQL] Erro ao limpar outbox:', e.message);
    }
  }

  async shutdown() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.ready = false;
        console.log('✓ [PostgreSQL] Pool de conexões encerrado com sucesso.');
      } catch (err) {
        console.error('Erro ao encerrar pool PostgreSQL:', err.message);
      }
    }
  }
}

const postgres = new PostgresStorage();
module.exports = postgres;
