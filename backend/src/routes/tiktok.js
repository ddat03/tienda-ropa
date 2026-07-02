const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { activarVigilancia, desactivarVigilancia, obtenerEstadoLive } = require('../tiktok/live');

// GET /tiktok/estado
router.get('/estado', requireAuth, (req, res) => {
  res.json(obtenerEstadoLive());
});

// POST /tiktok/iniciar — { usuario: "nombredeusuario" }
// Activa la vigilancia: espera automáticamente a que empiece el live
router.post('/iniciar', requireAuth, async (req, res) => {
  try {
    const { usuario } = req.body;
    if (!usuario) return res.status(400).json({ error: 'Usuario de TikTok requerido' });
    const resultado = await activarVigilancia(usuario);
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /tiktok/detener — desactiva la vigilancia y desconecta si hay live activo
router.post('/detener', requireAuth, async (req, res) => {
  try {
    const resultado = await desactivarVigilancia();
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /tiktok/ping?usuario=xxx — diagnóstico: intenta conectar y reporta el error exacto
router.get('/ping', async (req, res) => {
  const { usuario } = req.query;
  if (!usuario) return res.json({ error: 'Falta ?usuario=xxx' });
  try {
    const { TikTokLiveConnection } = await import('tiktok-live-connector');
    const conn = new TikTokLiveConnection(usuario, { fetchRoomInfoOnConnect: true });
    const estado = await Promise.race([
      conn.connect().then(s => ({ ok: true, roomId: s.roomId })),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 15s')), 15000)),
    ]);
    await conn.disconnect().catch(() => {});
    res.json(estado);
  } catch (err) {
    res.json({ ok: false, error: err.message, tipo: err.constructor.name });
  }
});

module.exports = router;
