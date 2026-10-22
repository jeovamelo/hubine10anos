// server/middleware/validation.js
// Validações rigorosas de entrada, tipagem, sanitização e prevenção de injeção

const ALLOWED_PROFILES = [
  'Estudante / Pesquisador',
  'Startup',
  'Empresário / Corporativo',
  'Empresa',
  'Investidor',
  'Governo / Ecossistema',
  'Governo / Financiamento',
  'Funcionário do BNB',
  'Convidado Institucional',
  'Convidado Especial',
  'Outros',
  'Outro'
];

const ALLOWED_STATUSES = [
  'CONFIRMADO',
  'PENDENTE',
  'PRESENTE',
  'LISTA_ESPERA',
  'DESISTIU',
  'NAO_VEM',
  'CANCELADO'
];

const ALLOWED_ROLES = ['administrador', 'organizacao', 'credenciamento'];

const ALLOWED_CHANNELS = ['EMAIL', 'WHATSAPP'];

// Regex para validação de e-mail estrita
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Normalização de e-mail (lowercase e trim)
function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

// Normalização de telefone (apenas dígitos)
function normalizeDigits(phone) {
  if (typeof phone !== 'string' && typeof phone !== 'number') return '';
  return String(phone).replace(/\D/g, '');
}

// Formatação amigável de telefone brasileiro (DDD + número)
function formatBrazilianPhone(phone) {
  const digits = normalizeDigits(phone);
  if (!digits) return '';
  const clean = digits.startsWith('55') && digits.length >= 12 ? digits.substring(2) : digits;
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  }
  return digits;
}

// Conversor estrito de booleano (rejeita "false", "0", strings vazias)
function strictBoolean(val) {
  if (val === true || val === 1 || val === 'true') return true;
  if (val === false || val === 0 || val === 'false' || val === null || val === undefined) return false;
  return false;
}

// Validação segura de photoUrl contra injeção de HTML/JS (XSS)
function validatePhotoUrl(url) {
  if (!url || typeof url !== 'string') return { valid: true, value: '' };
  const trimmed = url.trim();
  if (trimmed === '') return { valid: true, value: '' };

  const lower = trimmed.toLowerCase();

  // Rejeição direta de esquemas de execução
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:image/svg+xml') ||
    lower.includes('<script') ||
    lower.includes('<img') ||
    lower.includes('"') ||
    lower.includes("'")
  ) {
    return { valid: false, error: 'URL da foto contém caracteres ou esquema não permitido por motivos de segurança.' };
  }

  // Se for Data URI, aceitar apenas formatos raster permitidos (JPEG, PNG, WebP, GIF)
  if (lower.startsWith('data:image/')) {
    const isAllowedDataUri = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
    if (!isAllowedDataUri) {
      return { valid: false, error: 'Data URI da imagem deve estar em formato raster seguro (JPEG, PNG, WebP ou GIF) em base64.' };
    }
    // Limite máximo de 2.5MB em base64
    if (trimmed.length > 2.8 * 1024 * 1024) {
      return { valid: false, error: 'A foto enviada excede o limite máximo permitido (2MB).' };
    }
    return { valid: true, value: trimmed };
  }

  // Se for URL HTTP/HTTPS
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    if (lower.includes(';')) {
      return { valid: false, error: 'URL HTTP/HTTPS não deve conter ponto-e-vírgula.' };
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'Protocolo de URL inválido. Utilize HTTPS ou HTTP.' };
      }
      if (trimmed.length > 2000) {
        return { valid: false, error: 'URL da foto excede o comprimento máximo permitido.' };
      }
      return { valid: true, value: trimmed };
    } catch (e) {
      return { valid: false, error: 'URL da foto é inválida.' };
    }
  }

  return { valid: false, error: 'URL da foto deve iniciar com http://, https:// ou ser imagem raster em base64.' };
}

// Middleware de validação do formulário público de inscrição
function validatePublicRegistration(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Payload de requisição inválido.' });
  }

  const { name, email, institution, profile } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'O nome completo é obrigatório.' });
  }
  if (name.trim().length > 150) {
    return res.status(400).json({ error: 'O nome completo não pode exceder 150 caracteres.' });
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 150) {
    return res.status(400).json({ error: 'Informe um e-mail válido com formato correto.' });
  }

  if (!institution || typeof institution !== 'string' || !institution.trim()) {
    return res.status(400).json({ error: 'A instituição ou empresa é obrigatória.' });
  }
  if (institution.trim().length > 150) {
    return res.status(400).json({ error: 'A instituição não pode exceder 150 caracteres.' });
  }

  if (!profile || typeof profile !== 'string' || !profile.trim()) {
    return res.status(400).json({ error: 'Selecione seu perfil de participação.' });
  }
  if (!ALLOWED_PROFILES.includes(profile.trim())) {
    return res.status(400).json({ error: 'Perfil de participação selecionado é inválido.' });
  }

  if (!strictBoolean(body.privacyAccepted)) {
    return res.status(400).json({ error: 'É necessário manifestar ciência sobre o aviso de privacidade.' });
  }

  // Sanitização de campos opcionais
  req.sanitizedBody = {
    name: name.trim(),
    email: cleanEmail,
    institution: institution.trim(),
    profile: profile.trim(),
    badgeName: (typeof body.badgeName === 'string' ? body.badgeName.trim() : '') || name.trim(),
    role: typeof body.role === 'string' ? body.role.trim() : '',
    phone: formatBrazilianPhone(body.phone),
    cityUf: typeof body.cityUf === 'string' ? body.cityUf.trim() : 'Fortaleza / CE',
    accessibility: typeof body.accessibility === 'string' ? body.accessibility.trim() : '',
    futureEventsOptIn: strictBoolean(body.futureEventsOptIn)
  };

  next();
}

// Middleware de validação para cadastro interno de convidado da organização
function validateGuestCreation(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Payload de requisição inválido.' });
  }

  const { name, email, institution, profile } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'O nome do convidado é obrigatório.' });
  }
  if (name.trim().length > 150) {
    return res.status(400).json({ error: 'O nome não pode exceder 150 caracteres.' });
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 150) {
    return res.status(400).json({ error: 'Informe um e-mail válido para o convidado.' });
  }

  if (!institution || typeof institution !== 'string' || !institution.trim()) {
    return res.status(400).json({ error: 'A instituição do convidado é obrigatória.' });
  }

  const finalProfile = (profile && typeof profile === 'string' ? profile.trim() : 'Convidado Institucional');
  if (!ALLOWED_PROFILES.includes(finalProfile)) {
    return res.status(400).json({ error: 'Perfil de convidado inválido.' });
  }

  req.sanitizedBody = {
    name: name.trim(),
    email: cleanEmail,
    institution: institution.trim(),
    profile: finalProfile,
    badgeName: (typeof body.badgeName === 'string' ? body.badgeName.trim() : '') || name.trim(),
    role: typeof body.role === 'string' ? body.role.trim() : '',
    phone: formatBrazilianPhone(body.phone || body.whatsapp),
    whatsapp: formatBrazilianPhone(body.whatsapp || body.phone),
    cityUf: typeof body.cityUf === 'string' ? body.cityUf.trim() : 'Fortaleza / CE',
    accessibility: typeof body.accessibility === 'string' ? body.accessibility.trim() : '',
    internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes.trim() : ''
  };

  next();
}

// Middleware de validação para palestrantes (com photoUrl seguro)
function validateSpeakerInput(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Payload de requisição inválido.' });
  }

  const name = body.name || body.professionalName;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'O nome do palestrante é obrigatório.' });
  }

  const institution = body.institution;
  if (!institution || typeof institution !== 'string' || !institution.trim()) {
    return res.status(400).json({ error: 'A instituição ou empresa do palestrante é obrigatória.' });
  }

  // Validação estrita de photoUrl
  const photoCheck = validatePhotoUrl(body.photoUrl);
  if (!photoCheck.valid) {
    return res.status(400).json({ error: photoCheck.error });
  }

  // E-mail é opcional no fluxo direto de palestrantes
  let cleanEmail = '';
  if (body.email && typeof body.email === 'string' && body.email.trim()) {
    cleanEmail = normalizeEmail(body.email);
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'E-mail do palestrante inválido.' });
    }
  }

  req.sanitizedSpeaker = {
    name: name.trim(),
    institution: institution.trim(),
    role: typeof body.role === 'string' ? body.role.trim() : '',
    email: cleanEmail,
    talkTitle: typeof body.talkTitle === 'string' ? body.talkTitle.trim() : '',
    talkSummary: typeof body.talkSummary === 'string' ? body.talkSummary.trim() : '',
    bio: typeof body.bio === 'string' ? body.bio.trim() : '',
    photoUrl: photoCheck.value,
    avNeeds: typeof body.avNeeds === 'string' ? body.avNeeds.trim() : '',
    contact: typeof body.contact === 'string' ? body.contact.trim() : ''
  };

  next();
}

// Sanitização de dados por perfil de acesso (RBAC Data Minimization)
function sanitizeRegistrationForRole(reg, role) {
  if (!reg) return null;
  if (role === 'credenciamento') {
    return {
      id: reg.id,
      registrationNumber: reg.registrationNumber,
      name: reg.name,
      badgeName: reg.badgeName,
      institution: reg.institution,
      profile: reg.profile,
      role: reg.role,
      status: reg.status,
      type: reg.type,
      origin: reg.origin,
      waitlistPosition: reg.waitlistPosition,
      accessibility: reg.accessibility ? reg.accessibility : undefined,
      checkinAt: reg.checkinAt,
      checkinOperator: reg.checkinOperator,
      createdAt: reg.createdAt
    };
  }
  return reg;
}

module.exports = {
  sanitizeRegistrationForRole,
  ALLOWED_PROFILES,
  ALLOWED_STATUSES,
  ALLOWED_ROLES,
  ALLOWED_CHANNELS,
  EMAIL_REGEX,
  normalizeEmail,
  normalizeDigits,
  formatBrazilianPhone,
  strictBoolean,
  validatePhotoUrl,
  validatePublicRegistration,
  validateGuestCreation,
  validateSpeakerInput
};
