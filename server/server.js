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

// Mount API routes for both root and /dezanos
function mountApiRoutes(prefix = '') {
  app.use(prefix + '/api/public', publicRoutes);
  app.use(prefix + '/api/speakers', speakerRoutes);
  app.use(prefix + '/api/checkin', checkinRoutes);
  app.use(prefix + '/api/admin', adminRoutes);
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

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('🎉 Servidor Hubine 10 Anos rodando em: http://0.0.0.0:' + PORT);
    console.log('   Rota base alternativa: http://0.0.0.0:' + PORT + '/dezanos/');
    console.log('====================================================');
    console.log('Painel Administrativo: http://localhost:' + PORT + '/#admin');
    console.log('Credenciamento Mobile:  http://localhost:' + PORT + '/#credenciamento');
    console.log('====================================================');
  });
}

module.exports = app;
