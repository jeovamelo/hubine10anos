const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const qrcode = require('qrcode');
const db = require('../db');
const emailService = require('../emailService');
const registrationService = require('../registrationService');
const { validatePublicRegistration } = require('../middleware/validation');

// GET /api/public/event-info
router.get('/event-info', (req, res) => {
  const settings = db.getSettings();
  const confirmed = db.getConfirmedCount();
  const waitlist = db.getWaitlistCount();
  const remaining = Math.max(0, settings.capacity - confirmed);

  res.json({
    eventName: settings.eventName,
    theme: settings.theme,
    eventDate: settings.eventDate,
    eventDateFormatted: settings.eventDateFormatted,
    checkinStartTime: settings.checkinStartTime,
    eventEndTime: settings.eventEndTime,
    locationName: settings.locationName,
    locationCity: settings.locationCity,
    locationAddress: settings.locationAddress,
    locationMapUrl: settings.locationMapUrl,
    capacity: settings.capacity,
    confirmedCount: confirmed,
    waitlistCount: waitlist,
    remainingSpots: remaining,
    registrationsOpen: settings.registrationsOpen && (remaining > 0 || true), // waitlist available
    isWaitlistActive: confirmed >= settings.capacity,
    contactEmail: settings.contactEmail,
    privacyNotice: settings.privacyNotice,
    isDemoMode: !emailService.isSmtpConfigured,
    allowDemoLogin: process.env.NODE_ENV !== 'production'
  });
});

// GET /api/public/schedule
router.get('/schedule', (req, res) => {
  const schedule = db.getSchedule();
  res.json(schedule);
});

// GET /api/public/speakers
router.get('/speakers', (req, res) => {
  const speakers = db.getSpeakers();
  // Only return approved speakers with authorized publishing
  const publicSpeakers = speakers
    .filter(s => s.status === 'APROVADO' && s.authorizedPublishing)
    .map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      institution: s.institution,
      bio: s.bio,
      talkTitle: s.talkTitle,
      talkSummary: s.talkSummary,
      photoUrl: s.photoUrl || ''
    }));
  res.json(publicSpeakers);
});

// POST /api/public/check-email
router.post('/check-email', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const existing = db.getRegistrationByEmail(email.trim());
  const isRegistered = existing && existing.status !== 'CANCELADO';

  res.json({ registered: Boolean(isRegistered) });
});

// POST /api/public/resend-access
router.post('/resend-access', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const reg = db.getRegistrationByEmail(email.trim());
  if (reg && reg.status !== 'CANCELADO') {
    await emailService.sendRegistrationConfirmation(reg);
    await db.addAuditLog({
      action: 'REENVIO_ACESSO_SOLICITADO',
      details: `Reenvio de acesso para e-mail: ${email.trim()}`,
      user: 'Público (Autoatendimento)'
    });
  }

  // Consistent message to prevent email enumeration
  res.json({
    success: true,
    message: 'Se este e-mail estiver cadastrado para o evento, você receberá novamente as instruções e o link seguro de acesso.'
  });
});

// POST /api/public/register
router.post('/register', validatePublicRegistration, async (req, res) => {
  try {
    const result = await registrationService.registerPublicParticipant(req.body);
    res.status(201).json(result);
  } catch (err) {
    if (err.status && err.responseBody) {
      return res.status(err.status).json(err.responseBody);
    }
    console.error('Erro ao processar inscrição pública:', err);
    res.status(500).json({ error: 'Ocorreu um erro interno ao processar sua inscrição. Tente novamente.' });
  }
});

// GET /api/public/registration/:token
router.get('/registration/:token', (req, res) => {
  const { token } = req.params;
  const reg = db.getRegistrationByToken(token);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada ou link expirado.' });
  }

  const settings = db.getSettings();

  res.json({
    id: reg.id,
    registrationNumber: reg.registrationNumber,
    token: reg.token,
    name: reg.name,
    badgeName: reg.badgeName,
    email: reg.email,
    institution: reg.institution,
    profile: reg.profile,
    role: reg.role,
    phone: reg.phone,
    cityUf: reg.cityUf,
    accessibility: reg.accessibility,
    futureEventsOptIn: reg.futureEventsOptIn,
    status: reg.status,
    waitlistPosition: reg.waitlistPosition,
    qrCodeDataUrl: reg.qrCodeDataUrl,
    eventName: settings.eventName,
    eventDate: settings.eventDateFormatted,
    eventTime: settings.checkinStartTime,
    locationName: settings.locationName,
    locationAddress: settings.locationAddress,
    checkinAt: reg.checkinAt
  });
});

// PUT /api/public/registration/:token
router.get('/registration/:token/update', (req, res) => {
  res.status(405).json({ error: 'Utilize o método PUT para atualizar dados.' });
});

router.put('/registration/:token', async (req, res) => {
  const { token } = req.params;
  const reg = db.getRegistrationByToken(token);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (reg.status === 'CANCELADO') {
    return res.status(400).json({ error: 'Esta inscrição foi cancelada e não pode ser editada.' });
  }

  const { badgeName, role, phone, cityUf, accessibility, futureEventsOptIn } = req.body;

  const updates = {};
  if (badgeName !== undefined) updates.badgeName = badgeName.trim();
  if (role !== undefined) updates.role = role.trim();
  if (phone !== undefined) {
    updates.phone = phone.trim();
    updates.whatsapp = phone.trim();
  }
  if (cityUf !== undefined) updates.cityUf = cityUf.trim();
  if (accessibility !== undefined) updates.accessibility = accessibility.trim();
  if (futureEventsOptIn !== undefined) updates.futureEventsOptIn = Boolean(futureEventsOptIn);

  const updated = await db.updateRegistration(reg.id, updates);

  await db.addAuditLog({
    action: 'AUTOATENDIMENTO_ATUALIZACAO',
    details: `Dados atualizados pelo próprio participante (${reg.registrationNumber})`,
    user: `Participante (${reg.email})`
  });

  res.json({
    success: true,
    message: 'Dados atualizados com sucesso.',
    registration: {
      registrationNumber: updated.registrationNumber,
      badgeName: updated.badgeName,
      role: updated.role,
      phone: updated.phone,
      cityUf: updated.cityUf,
      accessibility: updated.accessibility
    }
  });
});

// POST /api/public/registration/:token/confirm (Confirmação de Presença pelo Convidado)
router.post('/registration/:token/confirm', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await registrationService.confirmAttendanceByToken(token);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro ao confirmar presença do participante:', err);
    res.status(500).json({ error: 'Erro interno ao processar confirmação de presença.' });
  }
});

// POST /api/public/registration/:token/cancel
router.post('/registration/:token/cancel', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await registrationService.cancelRegistrationByToken(token, 'Participante (Autoatendimento Web)');
    res.json(result);
  } catch (err) {
    if (err.status && err.responseBody) {
      return res.status(err.status).json(err.responseBody);
    }
    console.error('Erro ao cancelar inscrição:', err);
    res.status(500).json({ error: 'Erro interno ao processar cancelamento.' });
  }
});

// GET /api/public/calendar/:token (.ics download)
router.get('/calendar/:token', (req, res) => {
  const { token } = req.params;
  const reg = db.getRegistrationByToken(token);
  if (!reg) {
    return res.status(404).send('Inscrição não encontrada.');
  }

  const settings = db.getSettings();

  function escapeIcs(str) {
    if (!str) return '';
    return String(str).replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');
  }

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Banco do Nordeste//Hubine 10 Anos//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:hubine10anos-${reg.registrationNumber}@bnb.gov.br`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:20261104T160000Z`,
    `DTEND:20261104T210000Z`,
    `SUMMARY:${escapeIcs(settings.eventName)} — ${escapeIcs(settings.theme)}`,
    `DESCRIPTION:${escapeIcs('Comemoração dos 10 anos do Hub de Inovação do Banco do Nordeste. Seu número de inscrição: ' + reg.registrationNumber + '. Apresente seu comprovante no credenciamento.')}`,
    `LOCATION:${escapeIcs((settings.locationName || '') + ', ' + (settings.locationAddress || '') + ', ' + (settings.locationCity || ''))}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Hubine10Anos-${reg.registrationNumber}.ics"`);
  res.send(icsContent);
});

module.exports = router;
