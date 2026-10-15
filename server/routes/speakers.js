const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/speakers/invite/:token
router.get('/invite/:token', (req, res) => {
  const { token } = req.params;
  const speaker = db.getSpeakerByInviteToken(token);
  if (!speaker) {
    return res.status(404).json({ error: 'Convite não encontrado ou link inválido.' });
  }

  res.json({
    id: speaker.id,
    name: speaker.name,
    email: speaker.email,
    role: speaker.role || '',
    institution: speaker.institution || '',
    talkTitle: speaker.talkTitle || '',
    talkSummary: speaker.talkSummary || '',
    bio: speaker.bio || '',
    photoUrl: speaker.photoUrl || '',
    avNeeds: speaker.avNeeds || '',
    contact: speaker.contact || '',
    authorizedPublishing: Boolean(speaker.authorizedPublishing),
    status: speaker.status, // PENDENTE | AGUARDANDO_REVISAO | APROVADO
    isApproved: Boolean(speaker.isApproved)
  });
});

// POST /api/speakers/invite/:token/submit
router.post('/invite/:token/submit', async (req, res) => {
  const { token } = req.params;
  const speaker = db.getSpeakerByInviteToken(token);
  if (!speaker) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const {
    professionalName,
    role,
    institution,
    bio,
    talkTitle,
    talkSummary,
    photoUrl,
    avNeeds,
    contact,
    authorizedPublishing
  } = req.body;

  if (!professionalName || !professionalName.trim()) {
    return res.status(400).json({ error: 'O nome profissional para divulgação é obrigatório.' });
  }
  if (!role || !role.trim()) {
    return res.status(400).json({ error: 'O cargo é obrigatório.' });
  }
  if (!institution || !institution.trim()) {
    return res.status(400).json({ error: 'A instituição é obrigatória.' });
  }
  if (!talkTitle || !talkTitle.trim()) {
    return res.status(400).json({ error: 'O título da participação/palestra é obrigatório.' });
  }
  if (!authorizedPublishing) {
    return res.status(400).json({
      error: 'É necessária a autorização expressa para a publicação dos dados de divulgação na programação oficial.'
    });
  }

  // Max photo size check if base64 provided
  if (photoUrl && photoUrl.startsWith('data:image') && photoUrl.length > 3 * 1024 * 1024) {
    return res.status(400).json({ error: 'A foto enviada excede o limite máximo permitido (2MB).' });
  }

  const updated = await db.updateSpeaker(speaker.id, {
    name: professionalName.trim(),
    role: role.trim(),
    institution: institution.trim(),
    bio: (bio || '').trim(),
    talkTitle: talkTitle.trim(),
    talkSummary: (talkSummary || '').trim(),
    photoUrl: photoUrl || speaker.photoUrl || '',
    avNeeds: (avNeeds || '').trim(),
    contact: (contact || '').trim(),
    authorizedPublishing: true,
    status: 'AGUARDANDO_REVISAO', // Sent to organization review
    submittedAt: new Date().toISOString()
  });

  await db.addAuditLog({
    action: 'DADOS_PALESTRANTE_SUBMETIDOS',
    details: `Palestrante ${updated.name} preencheu formulário de convite. Aguardando revisão da organização.`,
    user: `Palestrante (${speaker.email})`
  });

  res.json({
    success: true,
    message: 'Dados enviados com sucesso! A organização irá revisar as informações antes da publicação na grade oficial.',
    status: 'AGUARDANDO_REVISAO'
  });
});

module.exports = router;
