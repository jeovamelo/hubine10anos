const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const qrcode = require('qrcode');
const db = require('../db');
const { generateToken, hashPassword, comparePassword, authMiddleware, requireRole } = require('../auth');
const emailService = require('../emailService');
const registrationService = require('../registrationService');
const whatsappService = require('../whatsappService');
const {
  validateGuestCreation,
  validateSpeakerInput,
  validatePhotoUrl,
  sanitizeRegistrationForRole
} = require('../middleware/validation');

// Login Rate Limiter (Max 10 failed/consecutive attempts per 15 minutes per IP)
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    if (now - record.firstAttempt < LOGIN_WINDOW_MS) {
      if (record.count >= MAX_LOGIN_ATTEMPTS) {
        return res.status(429).json({
          error: 'Muitas tentativas de login consecutivas. Por favor, aguarde 15 minutos antes de tentar novamente.'
        });
      }
    } else {
      // Reset expired window
      loginAttempts.set(ip, { count: 0, firstAttempt: now });
    }
  } else {
    loginAttempts.set(ip, { count: 0, firstAttempt: now });
  }
  next();
}

// POST /api/admin/login
router.post('/login', loginRateLimiter, (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = db.getUserByEmail(email.trim());
  if (!user || !user.active) {
    const rec = loginAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
    rec.count += 1;
    loginAttempts.set(ip, rec);
    return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
  }

  const isValid = comparePassword(password, user.passwordHash);
  if (!isValid) {
    const rec = loginAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
    rec.count += 1;
    loginAttempts.set(ip, rec);
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  // Successful login: reset attempts
  loginAttempts.delete(ip);

  const token = generateToken(user);

  db.addAuditLog({
    action: 'LOGIN_ADMIN',
    details: `Login efetuado por ${user.name} (${user.role})`,
    user: user.name
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// All following endpoints require valid JWT authentication
router.use(authMiddleware);

// GET /api/admin/me
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

// GET /api/admin/overview
router.get('/overview', requireRole(['administrador', 'organizacao', 'credenciamento']), (req, res) => {
  const settings = db.getSettings();
  const registrations = db.getRegistrations();

  const total = registrations.length;
  const confirmed = registrations.filter(r => r.status === 'CONFIRMADO').length;
  const present = registrations.filter(r => r.status === 'PRESENTE').length;
  const waitlist = registrations.filter(r => r.status === 'LISTA_ESPERA').length;
  const pending = registrations.filter(r => r.status === 'PENDENTE').length;
  const cancelled = registrations.filter(r => r.status === 'CANCELADO' || r.status === 'DESISTIU' || r.status === 'NAO_VEM').length;

  const totalActive = confirmed + present;
  const invitedGuests = registrations.filter(r => r.origin === 'ORGANIZATION_INVITE').length;
  const remainingSlots = Math.max(0, (settings.capacity || 0) - totalActive);
  const occupancyPercent = settings.capacity > 0 ? Math.round((totalActive / settings.capacity) * 100) : 0;
  const attendancePercent = totalActive > 0 ? Math.round((present / totalActive) * 100) : 0;

  // Breakdown by profile
  const profileBreakdown = {};
  for (const r of registrations) {
    if (r.status !== 'CANCELADO' && r.status !== 'DESISTIU' && r.status !== 'NAO_VEM') {
      const p = r.profile || 'Outro';
      profileBreakdown[p] = (profileBreakdown[p] || 0) + 1;
    }
  }

  res.json({
    capacity: settings.capacity,
    registrationsOpen: settings.registrationsOpen,
    total,
    confirmed,
    present,
    waitlist,
    pending,
    cancelled,
    invitedGuests,
    remainingSlots,
    totalActive,
    occupancyPercent,
    attendancePercent,
    profileBreakdown
  });
});

// GET /api/admin/registrations
router.get('/registrations', requireRole(['administrador', 'organizacao', 'credenciamento']), (req, res) => {
  const { search, status, profile, type, origin } = req.query;
  let list = db.getRegistrations();

  const effectiveStatus = (status !== undefined && status !== '')
    ? status
    : (origin === 'ORGANIZATION_INVITE' ? 'ALL' : 'CONFIRMADO');
  if (effectiveStatus !== 'ALL') {
    list = list.filter(r => r.status === effectiveStatus);
  }
  if (profile && profile !== 'ALL') {
    list = list.filter(r => r.profile === profile);
  }
  if (type) {
    list = list.filter(r => r.type === type);
  }
  if (origin && origin !== 'ALL') {
    list = list.filter(r => r.origin === origin);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    list = list.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.institution && r.institution.toLowerCase().includes(q)) ||
      (r.registrationNumber && r.registrationNumber.toLowerCase().includes(q)) ||
      (r.badgeName && r.badgeName.toLowerCase().includes(q)) ||
      (r.whatsapp && r.whatsapp.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q)) ||
      (qDigits.length >= 3 && r.whatsapp && r.whatsapp.replace(/\D/g, '').includes(qDigits)) ||
      (qDigits.length >= 3 && r.phone && r.phone.replace(/\D/g, '').includes(qDigits))
    );
  }

  // Sort by newest first, or waitlist sequence
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Sanitize fields based on caller role (RBAC data minimization)
  const sanitized = list.map(r => sanitizeRegistrationForRole(r, req.user.role));
  res.json(sanitized);
});

// GET /api/admin/registrations/:id
router.get('/registrations/:id', requireRole(['administrador', 'organizacao', 'credenciamento']), (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }
  res.json(sanitizeRegistrationForRole(reg, req.user.role));
});

// PUT /api/admin/registrations/:id
router.put('/registrations/:id', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  const {
    name,
    email,
    badgeName,
    institution,
    profile,
    role,
    phone,
    whatsapp,
    cityUf,
    accessibility,
    status,
    internalNotes
  } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (badgeName !== undefined) updates.badgeName = badgeName.trim();
  if (institution !== undefined) updates.institution = institution.trim();
  if (profile !== undefined) updates.profile = profile.trim();
  if (role !== undefined) updates.role = role.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (whatsapp !== undefined) updates.whatsapp = whatsapp.trim();
  if (cityUf !== undefined) updates.cityUf = cityUf.trim();
  if (accessibility !== undefined) updates.accessibility = accessibility.trim();
  if (status !== undefined) updates.status = status;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes.trim();

  if (updates.status === 'CANCELADO' || updates.status === 'DESISTIU' || updates.status === 'NAO_VEM') {
    updates.cancelledAt = new Date().toISOString();
  } else if (updates.status && updates.status !== 'CANCELADO') {
    updates.cancelledAt = null;
  }

  const updated = await db.updateRegistration(reg.id, updates);

  await db.addAuditLog({
    action: 'EDICAO_PARTICIPANTE',
    details: `Participante ${reg.registrationNumber} editado por ${req.user.name}`,
    user: req.user.name
  });

  res.json(updated);
});

// PUT /api/admin/registrations/:id/status - Alteração Interativa de Status via Serviço Unificado
router.put('/registrations/:id/status', requireRole(['administrador', 'organizacao']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await registrationService.updateRegistrationStatus(id, status, req.user.name);
    res.json(result);
  } catch (err) {
    if (err.status && err.responseBody) {
      return res.status(err.status).json(err.responseBody);
    }
    console.error('Erro ao atualizar status do participante:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar status do participante.' });
  }
});

// POST /api/admin/guests - Adicionar participante convidado pela organização (Status Inicial: PENDENTE)
router.post('/guests', requireRole(['administrador', 'organizacao']), validateGuestCreation, async (req, res) => {
  try {
    const result = await registrationService.createOrganizationGuest(req.body, req.user.name);
    res.status(201).json(result);
  } catch (err) {
    if (err.status && err.responseBody) {
      return res.status(err.status).json(err.responseBody);
    }
    console.error('Erro ao cadastrar convidado da organização:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar participante convidado.' });
  }
});

// POST /api/admin/guests/:id/send-invite - Enviar ou preparar convite com estados estritos
router.post('/guests/:id/send-invite', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const { id } = req.params;
  const { channel, mode = 'MANUAL' } = req.body; // channel: 'EMAIL' | 'WHATSAPP', mode: 'MANUAL' | 'AUTO'

  const reg = db.getRegistrationById(id);
  if (!reg) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (channel === 'EMAIL') {
    const emailResult = await emailService.sendOrganizationGuestInvite(reg);

    const now = new Date().toISOString();
    let statusLabel = 'FALHA_EMAIL';
    let success = false;
    let userMsg = 'Falha ao despachar e-mail via servidor.';

    if (emailResult.success) {
      success = true;
      statusLabel = emailResult.mode === 'SMTP' ? 'ENVIADO_EMAIL' : 'DEMO_EMAIL';
      userMsg = emailResult.mode === 'SMTP'
        ? 'Convite enviado com sucesso por e-mail.'
        : 'Convite registrado na Caixa de Demonstração (servidor SMTP não configurado).';
    } else {
      userMsg = 'Falha no envio SMTP: ' + (emailResult.error || 'Erro desconhecido');
    }

    const updated = await db.updateRegistration(reg.id, {
      invitationSentAt: success ? now : reg.invitationSentAt,
      invitationChannel: 'EMAIL',
      invitationStatus: statusLabel
    });

    await db.addAuditLog({
      action: success ? 'CONVITE_ORGANIZACAO_ENVIADO_EMAIL' : 'FALHA_ENVIO_EMAIL',
      details: `${userMsg} Destinatário: ${reg.email} (${reg.registrationNumber}) por ${req.user.name}`,
      user: req.user.name
    });

    if (!success) {
      return res.status(502).json({
        success: false,
        error: userMsg,
        invitationStatus: statusLabel,
        guest: updated
      });
    }

    return res.json({
      success: true,
      message: userMsg,
      mode: emailResult.mode,
      invitationStatus: updated.invitationStatus,
      invitationChannel: updated.invitationChannel,
      guest: updated
    });
  } else if (channel === 'WHATSAPP') {
    const message = emailService.formatGuestWhatsappMessage(reg, appUrl);
    const now = new Date().toISOString();

    // Se solicitado envio direto automático via Evolution API
    if (mode === 'AUTO' && whatsappService.isConfigured()) {
      const waResult = await whatsappService.sendTextMessage(reg.whatsapp || reg.phone, message, {
        registrationId: reg.id,
        operatorName: req.user.name,
        registrationNumber: reg.registrationNumber
      });

      const waStatus = waResult.success ? `WHATSAPP_${waResult.status}` : 'WHATSAPP_FALHOU';
      const updated = await db.updateRegistration(reg.id, {
        invitationSentAt: waResult.success ? now : reg.invitationSentAt,
        invitationChannel: 'WHATSAPP',
        invitationStatus: waStatus
      });

      await db.addAuditLog({
        action: waResult.success ? 'CONVITE_WHATSAPP_ENVIADO_EVOLUTION' : 'FALHA_WHATSAPP_EVOLUTION',
        details: `Envio WhatsApp via Evolution API para ${reg.name} (${reg.registrationNumber}): ${waStatus}`,
        user: req.user.name
      });

      return res.json({
        success: waResult.success,
        message: waResult.success ? 'Mensagem de WhatsApp enviada via Evolution API.' : ('Falha Evolution API: ' + (waResult.error || '')),
        whatsappStatus: waStatus,
        invitationStatus: updated.invitationStatus,
        invitationChannel: updated.invitationChannel,
        guest: updated
      });
    }

    // Preparação manual de link (WhatsApp Web / API link) - NUNCA marca como enviado!
    const waResult = await whatsappService.sendTextMessage(reg.whatsapp || reg.phone, message, {
      registrationId: reg.id,
      operatorName: req.user.name,
      isManualPreparation: true
    });

    const updated = await db.updateRegistration(reg.id, {
      invitationChannel: 'WHATSAPP',
      invitationStatus: 'LINK_PREPARADO_WHATSAPP' // Distingue explicitamente link preparado de mensagem enviada
    });

    await db.addAuditLog({
      action: 'CONVITE_ORGANIZACAO_LINK_WHATSAPP_PREPARADO',
      details: `Link de WhatsApp preparado para ${reg.name} (${reg.registrationNumber}) por ${req.user.name}`,
      user: req.user.name
    });

    return res.json({
      success: true,
      message: 'Link de WhatsApp gerado. Abra para enviar a mensagem.',
      whatsappUrl: waResult.whatsappUrl,
      whatsappMessage: message,
      invitationStatus: updated.invitationStatus,
      invitationChannel: updated.invitationChannel,
      guest: updated
    });
  } else {
    return res.status(400).json({ error: 'Canal de envio inválido. Utilize "EMAIL" ou "WHATSAPP".' });
  }
});

// POST /api/admin/registrations/:id/resend
router.post('/registrations/:id/resend', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (reg.origin === 'ORGANIZATION_INVITE') {
    await emailService.sendOrganizationGuestInvite(reg);
  } else {
    await emailService.sendRegistrationConfirmation(reg);
  }

  await db.addAuditLog({
    action: 'REENVIO_CONFIRMACAO',
    details: `Reenvio manual de comprovante para ${reg.name} (${reg.registrationNumber})`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Comprovante reenviado com sucesso.' });
});

// POST /api/admin/registrations/:id/promote - Promoção manual com verificação de capacidade
router.post('/registrations/:id/promote', requireRole(['administrador', 'organizacao']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await registrationService.promoteWaitlistParticipant(id, req.user.name);
    res.json(result);
  } catch (err) {
    if (err.status && err.responseBody) {
      return res.status(err.status).json(err.responseBody);
    }
    console.error('Erro ao promover participante:', err);
    res.status(500).json({ error: 'Erro interno ao promover participante.' });
  }
});

// POST /api/admin/registrations/:id/cancel - Cancelamento com promoção automática da fila
router.post('/registrations/:id/cancel', requireRole(['administrador', 'organizacao']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await registrationService.cancelRegistration(id, req.user.name);
    res.json(result);
  } catch (err) {
    if (err.status && err.responseBody) {
      return res.status(err.status).json(err.responseBody);
    }
    console.error('Erro ao cancelar participante:', err);
    res.status(500).json({ error: 'Erro interno ao cancelar participante.' });
  }
});

// GET /api/admin/export/csv (Excel compatible with UTF-8 BOM)
router.get('/export/csv', requireRole(['administrador', 'organizacao']), (req, res) => {
  const registrations = db.getRegistrations();

  const headers = [
    'Numero_Inscricao',
    'Origem',
    'Nome_Completo',
    'Nome_Cracha',
    'Email',
    'Telefone_WhatsApp',
    'Instituicao',
    'Perfil',
    'Cargo',
    'Cidade_UF',
    'Status',
    'Acessibilidade',
    'OptIn_Comunicacao',
    'Convidado_Por',
    'Data_Convite',
    'Status_Comunicacao',
    'Canal_Comunicacao',
    'Data_Envio_Comunicacao',
    'Observacoes_Internas',
    'Data_Inscricao',
    'Checkin_Data',
    'Checkin_Operador'
  ];

  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    let s = String(val);
    // Neutralize CSV formula injection: if first non-whitespace char is =, +, -, @, \t, \r
    const trimmed = s.trimStart();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      s = "'" + s;
    }
    s = s.replace(/"/g, '""');
    return `"${s}"`;
  }

  const rows = registrations.map(r => [
    escapeCsv(r.registrationNumber),
    escapeCsv(r.origin === 'ORGANIZATION_INVITE' ? 'Convidado pela organização' : 'Inscrição pública'),
    escapeCsv(r.name),
    escapeCsv(r.badgeName),
    escapeCsv(r.email),
    escapeCsv(r.whatsapp || r.phone || ''),
    escapeCsv(r.institution),
    escapeCsv(r.profile),
    escapeCsv(r.role),
    escapeCsv(r.cityUf),
    escapeCsv(r.status),
    escapeCsv(r.accessibility),
    escapeCsv(r.futureEventsOptIn ? 'SIM' : 'NÃO'),
    escapeCsv(r.invitedBy || ''),
    escapeCsv(r.invitedAt || ''),
    escapeCsv(r.invitationStatus || ''),
    escapeCsv(r.invitationChannel || ''),
    escapeCsv(r.invitationSentAt || ''),
    escapeCsv(r.internalNotes || ''),
    escapeCsv(r.createdAt),
    escapeCsv(r.checkinAt || ''),
    escapeCsv(r.checkinOperator || '')
  ].join(';'));

  // Prepend UTF-8 Byte Order Mark (BOM) so Excel opens accented Portuguese letters perfectly
  const csvContent = '\uFEFF' + headers.join(';') + '\r\n' + rows.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Hubine10Anos-Participantes.csv"');
  res.send(csvContent);
});

// SPEAKERS MANAGEMENT
// GET /api/admin/speakers
router.get('/speakers', requireRole(['administrador', 'organizacao']), (req, res) => {
  const speakers = db.getSpeakers();
  res.json(speakers);
});

// POST /api/admin/speakers - Cadastro Direto pela Organiza??o
router.post('/speakers', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const { name, email, institution, role, talkTitle, talkSummary, bio, photoUrl, avNeeds, contact } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome do palestrante / profissional ? obrigat?rio.' });
  }
  if (!institution || !institution.trim()) {
    return res.status(400).json({ error: 'A institui??o ou empresa ? obrigat?ria.' });
  }

  if (photoUrl && photoUrl.trim()) {
    const photoCheck = validatePhotoUrl(photoUrl.trim());
    if (!photoCheck.valid) {
      return res.status(400).json({ error: photoCheck.error });
    }
  }

  const newSpeaker = {
    id: 'spk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    email: (email || '').trim().toLowerCase(), // E-mail opcional
    institution: institution.trim(),
    role: (role || '').trim(),
    talkTitle: (talkTitle || '').trim(),
    talkSummary: (talkSummary || '').trim(),
    bio: (bio || '').trim(),
    photoUrl: (photoUrl || '').trim(),
    avNeeds: (avNeeds || '').trim(),
    contact: (contact || '').trim(),
    authorizedPublishing: true,
    status: 'APROVADO',
    isApproved: true,
    approvedAt: new Date().toISOString(),
    approvedBy: req.user.name,
    createdAt: new Date().toISOString()
  };

  await db.addSpeaker(newSpeaker);

  await db.addAuditLog({
    action: 'PALESTRANTE_CADASTRADO',
    details: `Palestrante ${newSpeaker.name} (${newSpeaker.institution}) cadastrado diretamente pela organiza??o por ${req.user.name}`,
    user: req.user.name
  });

  res.status(201).json({
    success: true,
    message: 'Palestrante cadastrado com sucesso e publicado na programa??o oficial.',
    speaker: newSpeaker
  });
});

// PUT /api/admin/speakers/:id - Edi??o Direta pela Organiza??o
router.put('/speakers/:id', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const { id } = req.params;
  const speaker = db.getSpeakerById(id);
  if (!speaker) {
    return res.status(404).json({ error: 'Palestrante n?o encontrado.' });
  }

  const { name, email, institution, role, talkTitle, talkSummary, bio, photoUrl, avNeeds, contact } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'O nome do palestrante / profissional ? obrigat?rio.' });
  }
  if (institution !== undefined && !institution.trim()) {
    return res.status(400).json({ error: 'A institui??o ou empresa ? obrigat?ria.' });
  }

  if (photoUrl !== undefined && photoUrl.trim()) {
    const photoCheck = validatePhotoUrl(photoUrl.trim());
    if (!photoCheck.valid) {
      return res.status(400).json({ error: photoCheck.error });
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (institution !== undefined) updates.institution = institution.trim();
  if (role !== undefined) updates.role = role.trim();
  if (talkTitle !== undefined) updates.talkTitle = talkTitle.trim();
  if (talkSummary !== undefined) updates.talkSummary = talkSummary.trim();
  if (bio !== undefined) updates.bio = bio.trim();
  if (photoUrl !== undefined) updates.photoUrl = photoUrl.trim();
  if (avNeeds !== undefined) updates.avNeeds = avNeeds.trim();
  if (contact !== undefined) updates.contact = contact.trim();

  // Preserva aprova??o e publica??o imediata
  updates.status = 'APROVADO';
  updates.isApproved = true;
  updates.authorizedPublishing = true;
  updates.updatedAt = new Date().toISOString();

  const updated = await db.updateSpeaker(id, updates);

  await db.addAuditLog({
    action: 'PALESTRANTE_ATUALIZADO',
    details: `Dados do palestrante ${updated.name} atualizados por ${req.user.name}`,
    user: req.user.name
  });

  res.json({
    success: true,
    message: 'Dados do palestrante atualizados com sucesso.',
    speaker: updated
  });
});

// POST /api/admin/speakers/invite
router.post('/speakers/invite', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const { name, email, talkTitle, institution } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail do palestrante são obrigatórios.' });
  }

  const inviteToken = 'spk_' + crypto.randomBytes(18).toString('hex');

  const newSpeaker = {
    id: 'spk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: '',
    institution: (institution || '').trim(),
    talkTitle: (talkTitle || '').trim(),
    talkSummary: '',
    bio: '',
    photoUrl: '',
    avNeeds: '',
    contact: '',
    authorizedPublishing: false,
    status: 'PENDENTE', // PENDENTE -> AGUARDANDO_REVISAO -> APROVADO
    isApproved: false,
    inviteToken,
    createdAt: new Date().toISOString()
  };

  await db.addSpeaker(newSpeaker);

  await emailService.sendSpeakerInvite(newSpeaker);

  await db.addAuditLog({
    action: 'CONVITE_PALESTRANTE_GERADO',
    details: `Convite gerado para ${newSpeaker.name} (${newSpeaker.email}) por ${req.user.name}`,
    user: req.user.name
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/#palestrante/convite/${inviteToken}`;

  res.status(201).json({
    success: true,
    speaker: newSpeaker,
    inviteUrl
  });
});

// PUT /api/admin/speakers/:id/review
router.put('/speakers/:id/review', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const { id } = req.params;
  const speaker = db.getSpeakerById(id);
  if (!speaker) {
    return res.status(404).json({ error: 'Palestrante não encontrado.' });
  }

  const { action, notes } = req.body; // action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'
  if (action === 'APPROVE') {
    const updated = await db.updateSpeaker(id, {
      status: 'APROVADO',
      isApproved: true,
      approvedAt: new Date().toISOString(),
      approvedBy: req.user.name
    });

    await db.addAuditLog({
      action: 'PALESTRANTE_APROVADO',
      details: `Palestrante ${speaker.name} aprovado para divulgação pública por ${req.user.name}`,
      user: req.user.name
    });

    return res.json({ success: true, message: 'Palestrante aprovado e publicado na programação.', speaker: updated });
  } else {
    const updated = await db.updateSpeaker(id, {
      status: 'PENDENTE',
      isApproved: false,
      reviewNotes: notes || ''
    });

    await db.addAuditLog({
      action: 'PALESTRANTE_REVISAO_SOLICITADA',
      details: `Revisão solicitada para palestrante ${speaker.name} por ${req.user.name}`,
      user: req.user.name
    });

    return res.json({ success: true, message: 'Status alterado para pendente de revisão.', speaker: updated });
  }
});

// DELETE /api/admin/speakers/:id
router.delete('/speakers/:id', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const { id } = req.params;
  const speaker = db.getSpeakerById(id);
  if (!speaker) {
    return res.status(404).json({ error: 'Palestrante não encontrado.' });
  }

  await db.deleteSpeaker(id);

  await db.addAuditLog({
    action: 'PALESTRANTE_EXCLUIDO',
    details: `Palestrante ${speaker.name} removido por ${req.user.name}`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Palestrante removido com sucesso.' });
});

// SCHEDULE MANAGEMENT
// GET /api/admin/schedule
router.get('/schedule', requireRole(['administrador', 'organizacao']), (req, res) => {
  res.json(db.getSchedule());
});

// PUT /api/admin/schedule
router.put('/schedule', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'A programação deve ser uma lista de atividades.' });
  }

  await db.updateSchedule(items);

  await db.addAuditLog({
    action: 'GRADE_PROGRAMACAO_ATUALIZADA',
    details: `Grade com ${items.length} atividades atualizada por ${req.user.name}`,
    user: req.user.name
  });

  res.json({ success: true, schedule: items });
});

// EVENT SETTINGS (Admin Only)
// GET /api/admin/settings
router.get('/settings', requireRole(['administrador']), (req, res) => {
  res.json(db.getSettings());
});

// PUT /api/admin/settings
router.put('/settings', requireRole(['administrador']), async (req, res) => {
  const {
    capacity,
    registrationsOpen,
    contactEmail,
    locationAddress,
    locationMapUrl,
    privacyNotice
  } = req.body;

  const updates = {};
  if (capacity !== undefined) updates.capacity = parseInt(capacity, 10);
  if (registrationsOpen !== undefined) updates.registrationsOpen = Boolean(registrationsOpen);
  if (contactEmail !== undefined) updates.contactEmail = contactEmail.trim();
  if (locationAddress !== undefined) updates.locationAddress = locationAddress.trim();
  if (locationMapUrl !== undefined) updates.locationMapUrl = locationMapUrl.trim();
  if (privacyNotice !== undefined) updates.privacyNotice = privacyNotice;

  const updated = await db.updateSettings(updates);

  await db.addAuditLog({
    action: 'CONFIGURACOES_ATUALIZADAS',
    details: `Configurações do evento atualizadas por ${req.user.name}`,
    user: req.user.name
  });

  res.json(updated);
});

// USER MANAGEMENT (Admin Only)
// GET /api/admin/users
router.get('/users', requireRole(['administrador']), (req, res) => {
  const users = db.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt
  }));
  res.json(users);
});

// POST /api/admin/users
router.post('/users', requireRole(['administrador']), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Preencha nome, e-mail, senha e perfil.' });
  }

  const existing = db.getUserByEmail(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const newUser = {
    id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    active: true,
    createdAt: new Date().toISOString()
  };

  await db.addUser(newUser);

  await db.addAuditLog({
    action: 'NOVO_USUARIO_CRIADO',
    details: `Novo usuário criado: ${newUser.name} (${newUser.role}) por ${req.user.name}`,
    user: req.user.name
  });

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    active: newUser.active
  });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireRole(['administrador']), async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta conectada.' });
  }

  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  await db.deleteUser(id);

  await db.addAuditLog({
    action: 'USUARIO_EXCLUIDO',
    details: `Usuário ${user.name} (${user.email}) excluído por ${req.user.name}`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Usuário removido com sucesso.' });
});

// AUDIT LOGS
// GET /api/admin/audit-logs
router.get('/audit-logs', requireRole(['administrador']), (req, res) => {
  const logs = db.getAuditLogs(150);
  res.json(logs);
});

// OUTBOX / DEMO MAILBOX
// GET /api/admin/outbox
router.get('/outbox', requireRole(['administrador', 'organizacao']), (req, res) => {
  const outbox = db.getEmailOutbox(100);
  res.json({
    isDemoMode: !emailService.isSmtpConfigured,
    emails: outbox
  });
});

// DELETE /api/admin/outbox
router.delete('/outbox', requireRole(['administrador']), async (req, res) => {
  await db.clearEmailOutbox();
  res.json({ success: true, message: 'Caixa de demonstração limpa.' });
});

// WHATSAPP OUTBOX
// GET /api/admin/whatsapp-outbox
router.get('/whatsapp-outbox', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const outbox = db.getWhatsappOutbox(100);
  const status = await whatsappService.checkInstanceStatus();
  res.json({
    instanceStatus: status,
    messages: outbox
  });
});

// DIAGNOSTICS
// GET /api/admin/diagnostics/email
router.get('/diagnostics/email', requireRole(['administrador']), async (req, res) => {
  const result = await emailService.verifyConnection();
  res.json(result);
});

// GET /api/admin/diagnostics/whatsapp
router.get('/diagnostics/whatsapp', requireRole(['administrador']), async (req, res) => {
  const result = await whatsappService.checkInstanceStatus();
  res.json(result);
});

module.exports = router;
