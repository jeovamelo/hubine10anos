require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const publicRoutes = require('./routes/public');
const speakerRoutes = require('./routes/speakers');
const checkinRoutes = require('./routes/checkin');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy only if explicitly configured or running in standard container
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self'; frame-src 'self' data:;"
  );
  next();
});

// Security & Parsing Middlewares: Restrict CORS to authorized domains
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      'https://hubine10anos.bnb.gov.br',
      'https://eventos.hubine.org',
      'https://bnb.gov.br',
      'https://www.bnb.gov.br'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não autorizada pelas políticas de CORS.'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const clientPath = path.join(__dirname, '..', 'client');

// Mount API routes for both root and /dezanos
function mountApiRoutes(prefix = '') {
  app.use(prefix + '/api/public', publicRoutes);
  app.use(prefix + '/api/speakers', speakerRoutes);
  app.use(prefix + '/api/checkin', checkinRoutes);
  app.use(prefix + '/api/admin', adminRoutes);
  app.use(prefix + '/api/webhooks', webhookRoutes);
}

mountApiRoutes('/dezanos');
mountApiRoutes('');

// Static files for /dezanos and /
app.use('/dezanos', express.static(clientPath));
app.use(express.static(clientPath));

// Redirect /dezanos without trailing slash to /dezanos/
app.get('/dezanos', (req, res) => res.redirect('/dezanos/'));

// Universal SPA fallback for Express 5 without wildcard errors
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/dezanos/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado.' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Final Error Handling Middleware: No stack traces in production
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    console.error('Unhandled server error:', err);
  } else {
    console.error(`[SERVER ERROR] ${req.method} ${req.url} - Status ${status}: ${err.message}`);
  }

  res.status(status).json({
    error: isProd ? 'Ocorreu um erro interno no servidor.' : err.message,
    code: err.code || undefined
  });
});

if (require.main === module) {
  (async () => {
    try {
      await db.initPostgres();
    } catch (err) {
      console.error('Falha ao inicializar PostgreSQL:', err);
    }
    app.listen(PORT, '0.0.0.0', () => {
      console.log('====================================================');
      console.log('🎉 Servidor Hubine 10 Anos rodando em: http://0.0.0.0:' + PORT);
      console.log('   Rota base alternativa: http://0.0.0.0:' + PORT + '/dezanos/');
      console.log('====================================================');
      console.log('Painel Administrativo: http://localhost:' + PORT + '/#admin');
      console.log('Credenciamento Mobile:  http://localhost:' + PORT + '/#credenciamento');
      console.log('====================================================');
    });
  })();
}

module.exports = app;
