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

// Static client assets
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// API Routes
app.use('/api/public', publicRoutes);
app.use('/api/speakers', speakerRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/admin', adminRoutes);

// SPA Fallback for client routing (Express 5 compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado.' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log('🎉 Servidor Hubine 10 Anos rodando em: http://localhost:' + PORT);
    console.log('====================================================');
    console.log('Painel Administrativo: http://localhost:' + PORT + '/#admin');
    console.log('Credenciamento Mobile:  http://localhost:' + PORT + '/#credenciamento');
    console.log('====================================================');
  });
}

module.exports = app;
