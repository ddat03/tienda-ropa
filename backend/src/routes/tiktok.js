const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { iniciarLive, detenerLive, obtenerEstadoLive } = require('../tiktok/live');

// GET /tiktok/estado
router.get('/estado', requireAuth, (req, res) => {
  res.json(obtenerEstadoLive());
});

// POST /tiktok/iniciar — { usuario: "nombredeusuario" }
router.post('/iniciar', requireAuth, async (req, res) => {
  try {
    const { usuario } = req.body;
    if (!usuario) return res.status(400).json({ error: 'Usuario de TikTok requerido' });
    const sesion = await iniciarLive(usuario);
    res.json({ ok: true, sesion });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /tiktok/detener
router.post('/detener', requireAuth, async (req, res) => {
  try {
    const resultado = await detenerLive();
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
