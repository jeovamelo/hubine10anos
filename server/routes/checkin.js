const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

// All checkin routes require authentication (operator, org, or admin)
router.use(authMiddleware);
router.use(requireRole(['credenciamento', 'organizacao', 'administrador']));

// POST /api/checkin/scan
router.post('/scan', async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ status: 'ERROR', message: 'Código de leitura não informado.' });
  }

  const clean = code.trim();

  return await db.runLocked(async () => {
    // 1. Try finding by QR token (urn:hubine:checkin:...)
    let reg = db.getRegistrationByQrToken(clean);

    // 2. If not found by QR, try by registration number (HUB10-XXXX)
    if (!reg) {
      reg = db.getRegistrationByNumber(clean);
    }

    // 3. If not found, try by email
    if (!reg && clean.includes('@')) {
      reg = db.getRegistrationByEmail(clean);
    }

    // If still not found
    if (!reg) {
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Inscrição não encontrada no sistema. Verifique o código ou busque manualmente.'
      });
    }

    // Check registration status
    if (reg.status === 'CANCELADO') {
      return res.status(400).json({
        status: 'CANCELLED',
        message: 'ATENÇÃO: Esta inscrição está CANCELADA.',
        attendee: {
          registrationNumber: reg.registrationNumber,
          name: reg.name,
          institution: reg.institution
        }
      });
    }

    if (reg.status === 'LISTA_ESPERA') {
      return res.status(400).json({
        status: 'WAITLIST',
        message: 'ATENÇÃO: Participante registrado na LISTA DE ESPERA (vaga não confirmada).',
        attendee: {
          registrationNumber: reg.registrationNumber,
          name: reg.name,
          institution: reg.institution,
          waitlistPosition: reg.waitlistPosition
        }
      });
    }

    // Check if ALREADY checked in
    if (reg.status === 'PRESENTE') {
      return res.status(409).json({
        status: 'ALREADY_CHECKED_IN',
        message: 'ATENÇÃO: Check-in JÁ REALIZADO anteriormente!',
        checkinTime: reg.checkinAt,
        operator: reg.checkinOperator || 'Operador',
        attendee: {
          registrationNumber: reg.registrationNumber,
          name: reg.name,
          badgeName: reg.badgeName,
          institution: reg.institution,
          profile: reg.profile
        }
      });
    }

    // SUCCESS: First-time checkin
    const now = new Date().toISOString();
    const operatorName = req.user.name;

    await db.updateRegistration(reg.id, {
      status: 'PRESENTE',
      checkinAt: now,
      checkinOperator: operatorName
    });

    await db.addAuditLog({
      action: 'CHECKIN_REALIZADO',
      details: `Credenciamento de ${reg.name} (${reg.registrationNumber}) por ${operatorName}`,
      user: operatorName
    });

    return res.json({
      status: 'SUCCESS',
      message: 'Credenciamento realizado com sucesso!',
      checkinTime: now,
      operator: operatorName,
      attendee: {
        registrationNumber: reg.registrationNumber,
        name: reg.name,
        badgeName: reg.badgeName,
        institution: reg.institution,
        profile: reg.profile,
        role: reg.role,
        status: 'PRESENTE',
        accessibility: reg.accessibility
      }
    });
  });
});

// POST /api/checkin/undo
router.post('/undo', async (req, res) => {
  const { registrationNumber } = req.body;
  if (!registrationNumber) {
    return res.status(400).json({ error: 'Número de inscrição obrigatório.' });
  }

  const reg = db.getRegistrationByNumber(registrationNumber);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (reg.status !== 'PRESENTE') {
    return res.status(400).json({ error: 'Esta inscrição não possui check-in ativo.' });
  }

  await db.updateRegistration(reg.id, {
    status: 'CONFIRMADO',
    checkinAt: null,
    checkinOperator: null
  });

  await db.addAuditLog({
    action: 'CHECKIN_ESTORNADO',
    details: `Estorno de credenciamento para ${reg.name} (${reg.registrationNumber}) por ${req.user.name}`,
    user: req.user.name
  });

  res.json({ success: true, message: 'Check-in estornado com sucesso.' });
});


// GET /api/checkin/search?q=...
router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ matches: [] });
  }

  const allRegs = db.getAllRegistrations ? db.getAllRegistrations() : (db.data.registrations || []);
  const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const queryNorm = normalize(query);

  const matches = allRegs.filter(r => {
    const num = (r.registrationNumber || '').toLowerCase();
    const name = normalize(r.name);
    const badge = normalize(r.badgeName);
    const inst = normalize(r.institution);
    return num.includes(query.toLowerCase()) || name.includes(queryNorm) || badge.includes(queryNorm) || inst.includes(queryNorm);
  }).slice(0, 8).map(r => ({
    id: r.id,
    registrationNumber: r.registrationNumber,
    name: r.name,
    badgeName: r.badgeName,
    institution: r.institution,
    profile: r.profile,
    status: r.status,
    checkinAt: r.checkinAt
  }));

  res.json({ matches });
});

module.exports = router;
