const express = require('express');
const router = express.Router();
const { procesarMensaje } = require('../bot/whatsapp');

// GET /webhook/whatsapp — Meta verifica el endpoint con este challenge
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[Webhook] Meta verificó el webhook ✅');
    return res.status(200).send(challenge);
  }
  res.status(403).end();
});

// POST /webhook/whatsapp — Meta envía aquí cada mensaje entrante
router.post('/whatsapp', async (req, res) => {
  // Responder 200 inmediatamente para que Meta no reintente
  res.status(200).end();

  try {
    const change  = req.body?.entry?.[0]?.changes?.[0]?.value;
    const mensaje = change?.messages?.[0];

    // Solo procesar mensajes de texto (ignorar imágenes, reacciones, etc.)
    if (!mensaje || mensaje.type !== 'text') return;

    const from   = mensaje.from;            // "593XXXXXXXXX"
    const texto  = mensaje.text?.body || '';
    const nombre = change?.contacts?.[0]?.profile?.name || '';

    console.log(`[Webhook] De: ${from} | Texto: "${texto}"`);

    await procesarMensaje(from, texto, nombre);
  } catch (err) {
    console.error('[Webhook] Error procesando mensaje:', err.message);
  }
});

module.exports = router;
