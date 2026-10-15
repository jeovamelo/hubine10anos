const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { generateToken, hashPassword, comparePassword, authMiddleware, requireRole } = require('../auth');
const emailService = require('../emailService');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = db.getUserByEmail(email.trim());
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
  }

  const isValid = comparePassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

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
  const cancelled = registrations.filter(r => r.status === 'CANCELADO').length;

  const totalActive = confirmed + present;
  const occupancyPercent = settings.capacity > 0 ? Math.round((totalActive / settings.capacity) * 100) : 0;
  const attendancePercent = totalActive > 0 ? Math.round((present / totalActive) * 100) : 0;

  // Breakdown by profile
  const profileBreakdown = {};
  for (const r of registrations) {
    if (r.status !== 'CANCELADO') {
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
    cancelled,
    totalActive,
    occupancyPercent,
    attendancePercent,
    profileBreakdown
  });
});

// GET /api/admin/registrations
router.get('/registrations', requireRole(['administrador', 'organizacao', 'credenciamento']), (req, res) => {
  const { search, status, profile, type } = req.query;
  let list = db.getRegistrations();

  if (status) {
    list = list.filter(r => r.status === status);
  }
  if (profile) {
    list = list.filter(r => r.profile === profile);
  }
  if (type) {
    list = list.filter(r => r.type === type);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.institution && r.institution.toLowerCase().includes(q)) ||
      (r.registrationNumber && r.registrationNumber.toLowerCase().includes(q)) ||
      (r.badgeName && r.badgeName.toLowerCase().includes(q))
    );
  }

  // Sort by newest first, or waitlist sequence
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(list);
});

// GET /api/admin/registrations/:id
router.get('/registrations/:id', requireRole(['administrador', 'organizacao', 'credenciamento']), (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }
  res.json(reg);
});

// PUT /api/admin/registrations/:id
router.put('/registrations/:id', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  const { name, email, badgeName, institution, profile, role, phone, cityUf, accessibility, status } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (badgeName !== undefined) updates.badgeName = badgeName.trim();
  if (institution !== undefined) updates.institution = institution.trim();
  if (profile !== undefined) updates.profile = profile.trim();
  if (role !== undefined) updates.role = role.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (cityUf !== undefined) updates.cityUf = cityUf.trim();
  if (accessibility !== undefined) updates.accessibility = accessibility.trim();
  if (status !== undefined) updates.status = status;

  const updated = await db.updateRegistration(reg.id, updates);

  await db.addAuditLog({
    action: 'EDICAO_PARTICIPANTE',
    details: `Participante ${reg.registrationNumber} editado por ${req.user.name}`,
    user: req.user.name
  });

  res.json(updated);
});

// POST /api/admin/registrations/:id/resend
router.post('/registrations/:id/resend', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  await emailService.sendRegistrationConfirmation(reg);

  await db.addAuditLog({
    action: 'REENVIO_CONFIRMACAO',
    details: `Reenvio manual de comprovante para ${reg.name} (${reg.registrationNumber})`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Comprovante reenviado com sucesso.' });
});

// POST /api/admin/registrations/:id/promote
router.post('/registrations/:id/promote', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (reg.status !== 'LISTA_ESPERA') {
    return res.status(400).json({ error: 'Esta inscrição não está na lista de espera.' });
  }

  const updated = await db.updateRegistration(reg.id, {
    status: 'CONFIRMADO',
    waitlistPosition: null,
    promotedAt: new Date().toISOString()
  });

  await emailService.sendWaitlistPromotion(updated);

  await db.addAuditLog({
    action: 'PROMOCAO_MANUAL_LISTA_ESPERA',
    details: `Participante ${reg.name} (${reg.registrationNumber}) promovido manualmente para CONFIRMADO por ${req.user.name}`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Participante promovido para CONFIRMADO com sucesso.', registration: updated });
});

// POST /api/admin/registrations/:id/cancel
router.post('/registrations/:id/cancel', requireRole(['administrador', 'organizacao']), async (req, res) => {
  const reg = db.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  await db.updateRegistration(reg.id, {
    status: 'CANCELADO',
    cancelledAt: new Date().toISOString()
  });

  await db.addAuditLog({
    action: 'CANCELAMENTO_ADMIN',
    details: `Inscrição ${reg.registrationNumber} (${reg.name}) cancelada pela organização (${req.user.name})`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Inscrição cancelada com sucesso.' });
});

// GET /api/admin/export/csv (Excel compatible with UTF-8 BOM)
router.get('/export/csv', requireRole(['administrador', 'organizacao']), (req, res) => {
  const registrations = db.getRegistrations();

  const headers = [
    'Numero_Inscricao',
    'Nome_Completo',
    'Nome_Cracha',
    'Email',
    'Instituicao',
    'Perfil',
    'Cargo',
    'Telefone',
    'Cidade_UF',
    'Status',
    'Acessibilidade',
    'OptIn_Comunicacao',
    'Data_Inscricao',
    'Checkin_Data',
    'Checkin_Operador'
  ];

  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  }

  const rows = registrations.map(r => [
    escapeCsv(r.registrationNumber),
    escapeCsv(r.name),
    escapeCsv(r.badgeName),
    escapeCsv(r.email),
    escapeCsv(r.institution),
    escapeCsv(r.profile),
    escapeCsv(r.role),
    escapeCsv(r.phone),
    escapeCsv(r.cityUf),
    escapeCsv(r.status),
    escapeCsv(r.accessibility),
    escapeCsv(r.futureEventsOptIn ? 'SIM' : 'NÃO'),
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

module.exports = router;
