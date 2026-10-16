const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const qrcode = require('qrcode');
const db = require('../db');
const emailService = require('../emailService');

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
router.post('/register', async (req, res) => {
  try {
    const settings = db.getSettings();
    if (!settings.registrationsOpen) {
      return res.status(403).json({ error: 'As inscrições para este evento estão temporariamente encerradas.' });
    }

    const {
      name,
      email,
      institution,
      profile,
      badgeName,
      role,
      phone,
      cityUf,
      accessibility,
      futureEventsOptIn,
      privacyAccepted
    } = req.body;

    // Required field validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome completo é obrigatório.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    if (!institution || !institution.trim()) {
      return res.status(400).json({ error: 'A instituição ou empresa é obrigatória.' });
    }
    if (!profile || !profile.trim()) {
      return res.status(400).json({ error: 'Selecione seu perfil de participação.' });
    }
    if (!privacyAccepted) {
      return res.status(400).json({ error: 'É necessário manifestar ciência sobre o aviso de privacidade.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Atomic execution for duplicate check, capacity check, and sequence assignment
    const newReg = await db.runLocked(async () => {
      // Check duplicate
      const existing = db.getRegistrationByEmail(cleanEmail);
      if (existing && existing.status !== 'CANCELADO') {
        const error = new Error('DUPLICATE_EMAIL');
        error.status = 409;
        error.customResponse = {
          error: 'DUPLICATE_EMAIL',
          message: 'Este e-mail já possui uma inscrição registrada para este evento.'
        };
        throw error;
      }

      // Check capacity and determine status
      const confirmedCount = db.getConfirmedCount();
      const isCapacityFull = confirmedCount >= settings.capacity;
      const status = isCapacityFull ? 'LISTA_ESPERA' : 'CONFIRMADO';

      let waitlistPosition = null;
      if (isCapacityFull) {
        waitlistPosition = db.getWaitlistCount() + 1;
      }

      // Generate random secure tokens
      const token = crypto.randomBytes(24).toString('hex');
      const qrToken = 'urn:hubine:checkin:' + crypto.randomUUID();

      // Generate readable sequential registration number HUB10-XXXX
      const registrationNumber = db.getNextRegistrationNumber();

      // Generate QR Code data URL
      const qrCodeDataUrl = await qrcode.toDataURL(qrToken, {
        width: 320,
        margin: 2,
        color: {
          dark: '#6B1D2F',
          light: '#FFFFFF'
        }
      });

      const regItem = {
        id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        registrationNumber,
        token,
        qrToken,
        qrCodeDataUrl,
        name: name.trim(),
        email: cleanEmail,
        institution: institution.trim(),
        profile: profile.trim(),
        badgeName: (badgeName || name).trim(),
        role: (role || '').trim(),
        phone: (phone || '').trim(),
        whatsapp: (phone || '').trim(),
        cityUf: (cityUf || '').trim(),
        accessibility: (accessibility || '').trim(),
        futureEventsOptIn: Boolean(futureEventsOptIn),
        origin: 'PUBLIC_REGISTRATION',
        invitedBy: null,
        invitedAt: null,
        invitationSentAt: null,
        invitationChannel: null,
        invitationStatus: null,
        internalNotes: '',
        type: 'CONVIDADO',
        status, // CONFIRMADO | LISTA_ESPERA
        waitlistPosition,
        checkinAt: null,
        checkinOperator: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.addRegistration(regItem);

      // Audit log
      await db.addAuditLog({
        action: 'NOVA_INSCRICAO',
        details: `Inscrição pública criada: ${registrationNumber} (${regItem.name}) - Status: ${status}`,
        user: 'Público (Inscrição Web)'
      });

      return regItem;
    });

    // Send confirmation email
    await emailService.sendRegistrationConfirmation(newReg);

    res.status(201).json({
      success: true,
      registrationNumber: newReg.registrationNumber,
      token: newReg.token,
      status: newReg.status,
      waitlistPosition: newReg.waitlistPosition,
      message: newReg.status === 'LISTA_ESPERA'
        ? 'Inscrição registrada na Lista de Espera! Enviamos os detalhes para seu e-mail.'
        : 'Inscrição confirmada com sucesso! Seu comprovante e QR Code foram gerados.'
    });
  } catch (err) {
    if (err.status && err.customResponse) {
      return res.status(err.status).json(err.customResponse);
    }
    console.error('Erro ao processar inscrição:', err);
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

// POST /api/public/registration/:token/cancel
router.post('/registration/:token/cancel', async (req, res) => {
  const { token } = req.params;
  const reg = db.getRegistrationByToken(token);
  if (!reg) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (reg.status === 'CANCELADO') {
    return res.status(400).json({ error: 'Esta inscrição já está cancelada.' });
  }

  const previousStatus = reg.status;
  await db.updateRegistration(reg.id, {
    status: 'CANCELADO',
    cancelledAt: new Date().toISOString()
  });

  await db.addAuditLog({
    action: 'INSCRICAO_CANCELADA',
    details: `Cancelamento voluntário pelo participante: ${reg.registrationNumber} (${reg.name})`,
    user: `Participante (${reg.email})`
  });

  // If a CONFIRMED spot was freed, automatically promote the first person on waitlist!
  let promotedUser = null;
  if (previousStatus === 'CONFIRMADO') {
    const all = db.getRegistrations();
    const waitlistUser = all
      .filter(r => r.status === 'LISTA_ESPERA')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

    if (waitlistUser) {
      promotedUser = await db.updateRegistration(waitlistUser.id, {
        status: 'CONFIRMADO',
        waitlistPosition: null,
        promotedAt: new Date().toISOString()
      });

      await db.addAuditLog({
        action: 'PROMOCAO_LISTA_ESPERA',
        details: `Vaga liberada por ${reg.registrationNumber}. Promovido: ${promotedUser.registrationNumber} (${promotedUser.name})`,
        user: 'Sistema Automático'
      });

      // Dispatch promotion email
      await emailService.sendWaitlistPromotion(promotedUser);
    }
  }

  res.json({
    success: true,
    message: 'Sua inscrição foi cancelada com sucesso.',
    promotedAnother: Boolean(promotedUser)
  });
});

// GET /api/public/calendar/:token (.ics download)
router.get('/calendar/:token', (req, res) => {
  const { token } = req.params;
  const reg = db.getRegistrationByToken(token);
  if (!reg) {
    return res.status(404).send('Inscrição não encontrada.');
  }

  const settings = db.getSettings();

  // 4 de novembro de 2026, 13h às 18h em Fortaleza (-03:00) -> UTC: 16:00 às 21:00
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Banco do Nordeste//Hubine 10 Anos//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:hubine10anos-${reg.registrationNumber}@bnb.gov.br`,
    `DTSTAMP:20261104T120000Z`,
    `DTSTART:20261104T160000Z`,
    `DTEND:20261104T210000Z`,
    `SUMMARY:${settings.eventName} — ${settings.theme}`,
    `DESCRIPTION:Comemoração dos 10 anos do Hub de Inovação do Banco do Nordeste. Seu número de inscrição: ${reg.registrationNumber}. Apresente seu comprovante no credenciamento.`,
    `LOCATION:${settings.locationName}, ${settings.locationAddress}, ${settings.locationCity}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Hubine10Anos-${reg.registrationNumber}.ics"`);
  res.send(icsContent);
});

module.exports = router;
