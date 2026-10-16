const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const DEFAULT_JWT_SECRET = 'hubine-10-anos-chave-secreta-jwt-2026';

function getJwtSecret() {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;
  if (isProd) {
    if (!secret || secret === DEFAULT_JWT_SECRET || secret.length < 32) {
      throw new Error('ERRO CRÍTICO DE SEGURANÇA: O JWT_SECRET padrão não pode ser utilizado em ambiente de produção. Configure uma chave secreta forte com no mínimo 32 caracteres.');
    }
    return secret;
  }
  return secret || DEFAULT_JWT_SECRET;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Authentication middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  const user = db.getUserById(decoded.id);
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Usuário inativo ou não encontrado.' });
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  next();
}

// Role guard middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permissão insuficiente para esta operação.',
        requiredRoles: allowedRoles,
        currentRole: req.user.role
      });
    }

    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authMiddleware,
  requireRole,
  getJwtSecret,
  DEFAULT_JWT_SECRET
};

