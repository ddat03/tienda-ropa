const express = require('express');
const router = express.Router();
const { requireTwilioSignature } = require('../middleware/auth');
const { procesarMensaje } = require('../bot/whatsapp');

// POST /webhook/whatsapp — Twilio envía aquí cada mensaje entrante
router.post('/whatsapp', requireTwilioSignature, async (req, res) => {
  const { From, Body, ProfileName } = req.body;

  // Respuesta vacía — evita que Twilio reenvíe el body como mensaje de WhatsApp
  res.status(200).end();

  const texto = (Body || '').trim();
  console.log(`[Webhook] De: ${From} | Texto: "${texto}"`);

  procesarMensaje(From, texto, ProfileName || '').catch(err => {
    console.error('[Webhook] Error procesando mensaje:', err.message);
  });
});

module.exports = router;
