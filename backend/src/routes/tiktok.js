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


module.exports = router;
