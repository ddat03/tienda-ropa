const express = require('express');
const router = express.Router();
const { requireTwilioSignature } = require('../middleware/auth');
const { procesarMensaje } = require('../bot/whatsapp');

// POST /webhook/whatsapp — Twilio envía aquí cada mensaje entrante
router.post('/whatsapp', requireTwilioSignature, async (req, res) => {
  const { From, Body, ProfileName } = req.body;

  // Responder a Twilio inmediatamente (evitar timeout)
  res.sendStatus(200);

  // Procesar en background
  procesarMensaje(From, Body || '', ProfileName || '').catch(err => {
    console.error('Error procesando webhook:', err);
  });
});

module.exports = router;
