const express = require('express');
const router = express.Router();
const whatsappService = require('../whatsappService');

// POST /api/webhooks/evolution
router.post('/evolution', async (req, res) => {
  try {
    const result = await whatsappService.handleWebhook(req.body, req.headers);
    if (!result.success && result.error) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Erro no processamento de webhook da Evolution API:', err);
    res.status(500).json({ error: 'Erro interno no processamento do webhook.' });
  }
});

module.exports = router;
