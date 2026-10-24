// server/registrationService.js
// Serviço Centralizado de Inscrição, Capacidade, Fila de Espera e Promoção Automática

const crypto = require('crypto');
const db = require('./db');
const emailService = require('./emailService');

class AsyncMutex {
  constructor() {
    this.queue = Promise.resolve();
  }
  acquire(fn) {
    const next = this.queue.then(() => fn());
    this.queue = next.catch(() => {});
    return next;
  }
}

const registrationMutex = new AsyncMutex();

// Retorna indicadores consolidados de capacidade e vagas em tempo real
function getCapacityMetrics() {
  const settings = db.getSettings();
  const capacity = Number(settings.capacity) || 220;
  const allRegs = db.getRegistrations();

  const confirmedCount = allRegs.filter(r => r.status === 'CONFIRMADO').length;
  const presentCount = allRegs.filter(r => r.status === 'PRESENTE').length;
  const waitlistCount = allRegs.filter(r => r.status === 'LISTA_ESPERA').length;
  const pendingCount = allRegs.filter(r => r.status === 'PENDENTE').length;
  const cancelledCount = allRegs.filter(r => ['CANCELADO', 'DESISTIU', 'NAO_VEM'].includes(r.status)).length;
  const orgGuestsCount = allRegs.filter(r => r.origin === 'ORGANIZATION_INVITE').length;

  const totalOccupied = confirmedCount + presentCount;
  const remainingSpots = Math.max(0, capacity - totalOccupied);
  const isWaitlistActive = remainingSpots === 0;

  return {
    capacity,
    confirmedCount,
    presentCount,
    waitlistCount,
    pendingCount,
    cancelledCount,
    orgGuestsCount,
    totalOccupied,
    remainingSpots,
    isWaitlistActive,
    registrationsOpen: Boolean(settings.registrationsOpen)
  };
}

// Inscrição Pública via Web
async function registerPublicParticipant(data) {
  return registrationMutex.acquire(async () => {
    const settings = db.getSettings();
    if (!settings.registrationsOpen) {
      const err = new Error('As inscrições para este evento estão temporariamente encerradas.');
      err.status = 403;
      throw err;
    }

    const cleanEmail = data.email.trim().toLowerCase();

    // 1. Verificação de Duplicidade: apenas entre inscrições ATIVAS
    const activeReg = db.getActiveRegistrationByEmail(cleanEmail);
    if (activeReg) {
      const err = new Error('Este endereço de e-mail já possui uma inscrição ativa no evento.');
      err.status = 409;
      err.code = 'DUPLICATE_EMAIL';
      err.data = { error: 'DUPLICATE_EMAIL' };
      err.responseBody = { error: 'DUPLICATE_EMAIL', message: err.message };
      throw err;
    }

    // 2. Cálculo Atômico de Vagas e Fila
    const metrics = getCapacityMetrics();
    const isWaitlist = metrics.remainingSpots === 0;

    const registrationNumber = db.generateRegistrationNumber();
    const token = crypto.randomBytes(24).toString('hex');
    const qrToken = `urn:hubine:checkin:${crypto.randomUUID()}`;
    const qrCodeDataUrl = null;

    const newReg = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      registrationNumber,
      token,
      qrToken,
      qrCodeDataUrl,
      name: data.name,
      email: cleanEmail,
      institution: data.institution,
      profile: data.profile,
      badgeName: data.badgeName || data.name,
      role: data.role || '',
      phone: data.phone || '',
      cityUf: data.cityUf || 'Fortaleza / CE',
      accessibility: data.accessibility || '',
      futureEventsOptIn: Boolean(data.futureEventsOptIn),
      type: 'CONVIDADO',
      origin: 'PUBLIC_REGISTRATION',
      status: isWaitlist ? 'LISTA_ESPERA' : 'CONFIRMADO',
      waitlistPosition: isWaitlist ? metrics.waitlistCount + 1 : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.addRegistration(newReg);

    // Auditoria
    await db.addAuditLog({
      action: isWaitlist ? 'INSCRICAO_LISTA_ESPERA' : 'INSCRICAO_CONFIRMADA',
      details: `${newReg.name} (${newReg.email}) cadastrado via web com status ${newReg.status}. Vaga nº ${newReg.registrationNumber}`,
      user: 'Público (Web)'
    });

    // Envio de e-mail de confirmação ou espera
    try {
      if (newReg.status === 'CONFIRMADO') {
        await emailService.sendRegistrationConfirmation(newReg);
      } else {
        await emailService.sendWaitlistNotification(newReg);
      }
    } catch (e) {
      console.warn('⚠️ [RegistrationService] Falha ao enviar e-mail de confirmação:', e.message);
    }

    return { success: true, ...newReg, registration: newReg };
  });
}

// Cadastro de Convidado da Organização
async function createOrganizationGuest(data, user) {
  return registrationMutex.acquire(async () => {
    const cleanEmail = data.email.trim().toLowerCase();

    // Verificação de inscrição ativa com mesmo e-mail
    const activeReg = db.getActiveRegistrationByEmail(cleanEmail);
    if (activeReg) {
      const err = new Error('Já existe uma inscrição ativa para este e-mail no evento.');
      err.status = 409;
      err.code = 'DUPLICATE_EMAIL';
      err.responseBody = { error: 'DUPLICATE_EMAIL', message: err.message };
      throw err;
    }

    // Verificação de WhatsApp duplicado ativo
    if (data.whatsapp) {
      const activePhone = db.getActiveRegistrationByPhone(data.whatsapp);
      if (activePhone) {
        const err = new Error('Já existe um convidado ativo cadastrado com este número de WhatsApp.');
        err.status = 409;
        err.code = 'DUPLICATE_PHONE';
        err.responseBody = { error: 'DUPLICATE_PHONE', message: err.message };
        throw err;
      }
    }

    const registrationNumber = db.generateRegistrationNumber();
    const token = crypto.randomBytes(24).toString('hex');
    const qrToken = `urn:hubine:checkin:${crypto.randomUUID()}`;
    const qrCodeDataUrl = null;

    // Convidado da organização SEMPRE inicia como PENDENTE (não abata vagas)
    const newGuest = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      registrationNumber,
      token,
      qrToken,
      qrCodeDataUrl,
      name: data.name,
      email: cleanEmail,
      institution: data.institution,
      profile: data.profile || 'Convidado Institucional',
      badgeName: data.badgeName || data.name,
      role: data.role || '',
      phone: data.phone || data.whatsapp || '',
      whatsapp: data.whatsapp || data.phone || '',
      cityUf: data.cityUf || 'Fortaleza / CE',
      accessibility: data.accessibility || '',
      type: 'CONVIDADO_ESPECIAL',
      origin: 'ORGANIZATION_INVITE',
      status: 'PENDENTE',
      waitlistPosition: null,
      invitedBy: user ? user.name : 'Comissão Organizadora',
      invitedAt: new Date().toISOString(),
      invitationStatus: 'PENDENTE',
      internalNotes: data.internalNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.addRegistration(newGuest);

    await db.addAuditLog({
      action: 'CONVITE_ORGANIZACAO_CRIADO',
      details: `Convidado ${newGuest.name} (${newGuest.email}) cadastrado pela organização com status PENDENTE.`,
      user: user ? user.name : 'Comissão Organizadora'
    });

    return { success: true, guest: newGuest, registration: newGuest };
  });
}

// Alteração de Status com Regras de Capacidade e Promoção Automática
async function updateRegistrationStatus(id, newStatus, user, options = {}) {
  return registrationMutex.acquire(async () => {
    const validStatuses = ['CONFIRMADO', 'PENDENTE', 'PRESENTE', 'LISTA_ESPERA', 'DESISTIU', 'NAO_VEM', 'CANCELADO'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      const err = new Error('Status inválido. Status permitidos: ' + validStatuses.join(', '));
      err.status = 400;
      err.responseBody = { error: 'INVALID_STATUS', message: err.message };
      throw err;
    }

    const reg = db.getRegistrationById(id);
    if (!reg) {
      const err = new Error('Inscrição não encontrada.');
      err.status = 404;
      throw err;
    }

    const oldStatus = reg.status;
    if (oldStatus === newStatus) {
      return { registration: reg, promoted: null };
    }

    const metrics = getCapacityMetrics();
    const updates = { status: newStatus, updatedAt: new Date().toISOString() };

    // 1. Transição para CONFIRMADO: verifica capacidade máxima
    if (newStatus === 'CONFIRMADO') {
      const isCurrentlyOccupying = (oldStatus === 'CONFIRMADO' || oldStatus === 'PRESENTE');
      if (!isCurrentlyOccupying && metrics.remainingSpots <= 0 && !options.vipOverride) {
        const err = new Error('A capacidade máxima do auditório foi atingida. Não é possível confirmar sem liberação de vaga ou exceção.');
        err.status = 400;
        err.code = 'CAPACITY_REACHED';
        throw err;
      }
      updates.cancelledAt = null;
      updates.waitlistPosition = null;
    }

    // 2. Transição para CANCELADO / DESISTIU / NAO_VEM
    const isNowFreeingSlot = (oldStatus === 'CONFIRMADO' || oldStatus === 'PRESENTE') &&
      ['CANCELADO', 'DESISTIU', 'NAO_VEM'].includes(newStatus);

    if (['CANCELADO', 'DESISTIU', 'NAO_VEM'].includes(newStatus)) {
      updates.cancelledAt = new Date().toISOString();
      updates.waitlistPosition = null;
    }

    // 3. Transição para PRESENTE (Check-in)
    if (newStatus === 'PRESENTE') {
      updates.checkinAt = updates.checkinAt || new Date().toISOString();
      updates.checkinOperator = updates.checkinOperator || (user ? user.name : 'Credenciamento');
    }

    const updatedReg = await db.updateRegistration(id, updates);

    await db.addAuditLog({
      action: 'STATUS_INSCRICAO_ALTERADO',
      details: `Status de ${reg.name} (${reg.registrationNumber}) alterado de ${oldStatus} para ${newStatus}${options.vipOverride ? ' (Exceção VIP/Diretoria)' : ''}`,
      user: user ? user.name : 'Sistema'
    });

    // 4. Promoção Automática da Fila de Espera se liberou vaga
    let promoted = null;
    if (isNowFreeingSlot) {
      promoted = await autoPromoteNextWaitlistParticipant(user);
    }

    return { registration: updatedReg, promoted };
  });
}

// Promove automaticamente o próximo participante na fila de espera
async function autoPromoteNextWaitlistParticipant(user) {
  const allRegs = db.getRegistrations();
  const waitlist = allRegs
    .filter(r => r.status === 'LISTA_ESPERA')
    .sort((a, b) => {
      const posA = a.waitlistPosition || 999999;
      const posB = b.waitlistPosition || 999999;
      if (posA !== posB) return posA - posB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  if (waitlist.length === 0) return null;

  const candidate = waitlist[0];
  const promoted = await db.updateRegistration(candidate.id, {
    status: 'CONFIRMADO',
    waitlistPosition: null,
    updatedAt: new Date().toISOString()
  });

  // Re-indexar posições dos demais na fila
  const remainingWaitlist = waitlist.slice(1);
  for (let i = 0; i < remainingWaitlist.length; i++) {
    await db.updateRegistration(remainingWaitlist[i].id, {
      waitlistPosition: i + 1,
      updatedAt: new Date().toISOString()
    });
  }

  await db.addAuditLog({
    action: 'PROMOCAO_AUTOMATICA_FILA',
    details: `${promoted.name} (${promoted.registrationNumber}) promovido da fila de espera para CONFIRMADO após cancelamento.`,
    user: user ? user.name : 'Sistema Automático de Vagas'
  });

  try {
    await emailService.sendWaitlistPromotion(promoted);
  } catch (err) {
    console.warn('⚠️ [RegistrationService] Falha ao enviar e-mail de promoção da fila:', err.message);
  }

  return promoted;
}

// Cancelamento Voluntário (Autoatendimento)
async function cancelRegistrationByToken(token, reason = '') {
  return registrationMutex.acquire(async () => {
    const reg = db.getRegistrationByToken(token);
    if (!reg) {
      const err = new Error('Inscrição não encontrada ou link expirado.');
      err.status = 404;
      throw err;
    }

    if (reg.status === 'CANCELADO') {
      return { registration: reg, alreadyCancelled: true };
    }

    const wasOccupyingSlot = (reg.status === 'CONFIRMADO' || reg.status === 'PRESENTE');

    const updated = await db.updateRegistration(reg.id, {
      status: 'CANCELADO',
      cancelledAt: new Date().toISOString(),
      waitlistPosition: null,
      internalNotes: (reg.internalNotes ? reg.internalNotes + '\n' : '') + `Cancelado voluntariamente pelo titular${reason ? ': ' + reason : '.'}`,
      updatedAt: new Date().toISOString()
    });

    await db.addAuditLog({
      action: 'CANCELAMENTO_VOLUNTARIO_TITULAR',
      details: `${reg.name} (${reg.registrationNumber}) cancelou sua participação via autoatendimento.`,
      user: `${reg.name} (Autoatendimento)`
    });

    let promoted = null;
    if (wasOccupyingSlot) {
      promoted = await autoPromoteNextWaitlistParticipant({ name: 'Autoatendimento (Vaga Liberada)' });
    }

    return {
      success: true,
      message: 'Inscrição cancelada com sucesso.',
      registration: updated,
      promotedAnother: Boolean(promoted),
      promotedUser: promoted,
      alreadyCancelled: false
    };
  });
}

async function promoteWaitlistParticipant(id, operatorName) {
  return registrationMutex.acquire(async () => {
    const reg = db.getRegistrationById(id);
    if (!reg) {
      const err = new Error('Inscrição não encontrada.');
      err.status = 404;
      throw err;
    }
    if (reg.status !== 'LISTA_ESPERA') {
      const err = new Error('Esta inscrição não está na lista de espera.');
      err.status = 400;
      throw err;
    }
    const updated = await db.updateRegistration(reg.id, {
      status: 'CONFIRMADO',
      waitlistPosition: null,
      promotedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    try {
      await emailService.sendWaitlistPromotion(updated);
    } catch (e) {}
    await db.addAuditLog({
      action: 'PROMOCAO_MANUAL_LISTA_ESPERA',
      details: `Participante ${reg.name} (${reg.registrationNumber}) promovido manualmente para CONFIRMADO por ${operatorName}`,
      user: operatorName
    });
    return { success: true, message: 'Participante promovido para CONFIRMADO com sucesso.', registration: updated };
  });
}

async function cancelRegistration(id, operatorName) {
  return registrationMutex.acquire(async () => {
    const reg = db.getRegistrationById(id);
    if (!reg) {
      const err = new Error('Inscrição não encontrada.');
      err.status = 404;
      throw err;
    }
    const wasOccupyingSlot = (reg.status === 'CONFIRMADO' || reg.status === 'PRESENTE');
    const updated = await db.updateRegistration(reg.id, {
      status: 'CANCELADO',
      cancelledAt: new Date().toISOString(),
      waitlistPosition: null,
      updatedAt: new Date().toISOString()
    });
    await db.addAuditLog({
      action: 'CANCELAMENTO_ADMIN',
      details: `Inscrição ${reg.registrationNumber} (${reg.name}) cancelada pela organização (${operatorName})`,
      user: operatorName
    });
    let promoted = null;
    if (wasOccupyingSlot) {
      promoted = await autoPromoteNextWaitlistParticipant({ name: operatorName });
    }
    return { success: true, message: 'Inscrição cancelada com sucesso.', registration: updated, promotedAnother: Boolean(promoted), promotedUser: promoted };
  });
}

// Confirmação de Presença pelo Próprio Convidado (via Link do Comprovante)
async function confirmAttendanceByToken(token) {
  return registrationMutex.acquire(async () => {
    const reg = db.getRegistrationByToken(token);
    if (!reg) {
      const err = new Error('Inscrição não encontrada ou link expirado.');
      err.status = 404;
      throw err;
    }

    if (reg.status === 'CONFIRMADO') {
      return { success: true, message: 'Sua participação já está confirmada!', registration: reg, alreadyConfirmed: true };
    }

    if (reg.status === 'CANCELADO') {
      const err = new Error('Esta inscrição foi cancelada anteriormente.');
      err.status = 400;
      throw err;
    }

    const metrics = getCapacityMetrics();
    if (metrics.remainingSpots <= 0) {
      const err = new Error('A capacidade máxima do auditório foi atingida no momento. Entre em contato com a organização.');
      err.status = 409;
      throw err;
    }

    const updated = await db.updateRegistration(reg.id, {
      status: 'CONFIRMADO',
      confirmedAt: new Date().toISOString(),
      invitationStatus: 'CONFIRMADO',
      updatedAt: new Date().toISOString()
    });

    await db.addAuditLog({
      action: 'CONFIRMACAO_PRESENCA_CONVIDADO',
      details: `${reg.name} (${reg.registrationNumber}) confirmou presença via autoatendimento no comprovante. Status atualizado para CONFIRMADO.`,
      user: `${reg.name} (Convidado)`
    });

    try {
      if (updated.email) {
        await emailService.sendRegistrationConfirmation(updated);
      }
    } catch (e) {
      console.warn('⚠️ [RegistrationService] Falha ao enviar e-mail de confirmação ao convidado:', e.message);
    }

    return {
      success: true,
      message: 'Presença confirmada com sucesso! Sua vaga no auditório está garantida.',
      registration: updated
    };
  });
}

module.exports = {
  getCapacityMetrics,
  registerPublicParticipant,
  createOrganizationGuest,
  updateRegistrationStatus,
  autoPromoteNextWaitlistParticipant,
  cancelRegistrationByToken,
  confirmAttendanceByToken,
  promoteWaitlistParticipant,
  cancelRegistration
};
