const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { setFcmTokenDuena } = require('../notifications/alertas');

// POST /notificaciones/fcm-token — guarda token del dispositivo de la dueña
router.post('/fcm-token', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requerido' });
    setFcmTokenDuena(token);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
