require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const publicRoutes = require('./routes/public');
const speakerRoutes = require('./routes/speakers');
const checkinRoutes = require('./routes/checkin');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const clientPath = path.join(__dirname, '..', 'client');

// Mount helper for serving under root '/' or subpath '/dezanos'
function registerApp(prefix) {
  const p = prefix || '';

  // API Routes
  app.use(p + '/api/public', publicRoutes);
  app.use(p + '/api/speakers', speakerRoutes);
  app.use(p + '/api/checkin', checkinRoutes);
  app.use(p + '/api/admin', adminRoutes);

  // Static files
  if (p) {
    app.use(p, express.static(clientPath));
    app.get(p, (req, res) => res.redirect(p + '/'));
    app.get(p + '/*', (req, res, next) => {
      if (req.path.startsWith(p + '/api/')) return next();
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  } else {
    app.use(express.static(clientPath));
  }
}

// Support both /dezanos and /
registerApp('/dezanos');
registerApp('');

// SPA fallback for root
app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/dezanos/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado.' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log('🎉 Servidor Hubine 10 Anos rodando em: http://localhost:' + PORT);
    console.log('   Rota base alternativa: http://localhost:' + PORT + '/dezanos/');
    console.log('====================================================');
    console.log('Painel Administrativo: http://localhost:' + PORT + '/#admin');
    console.log('Credenciamento Mobile:  http://localhost:' + PORT + '/#credenciamento');
    console.log('====================================================');
  });
}

module.exports = app;
