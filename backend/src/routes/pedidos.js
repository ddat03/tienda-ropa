const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { confirmarPedido, rechazarPedido, obtenerPedidosPendientes } = require('../orders/pedidos');
const { db, COLECCIONES } = require('../firebase');

// GET /pedidos/pendientes
router.get('/pendientes', requireAuth, async (req, res) => {
  try {
    const pedidos = await obtenerPedidosPendientes();
    res.json(pedidos.map(p => ({
      ...p,
      creadoEn: p.creadoEn?.toDate?.()?.toISOString() || p.creadoEn,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /pedidos/:id/confirmar
router.post('/:id/confirmar', requireAuth, async (req, res) => {
  try {
    await confirmarPedido(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /pedidos/:id/rechazar
router.post('/:id/rechazar', requireAuth, async (req, res) => {
  try {
    const { motivo } = req.body;
    await rechazarPedido(req.params.id, motivo);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /pedidos/historial
router.get('/historial', requireAuth, async (req, res) => {
  try {
    const { limite = 100, desde } = req.query;
    let query = db.collection(COLECCIONES.VENTAS).orderBy('ventaEn', 'desc').limit(Number(limite));
    if (desde) query = query.startAfter(new Date(desde));

    const snap = await query.get();
    const ventas = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      ventaEn: doc.data().ventaEn?.toDate?.()?.toISOString(),
    }));
    res.json(ventas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /pedidos/estadisticas
router.get('/estadisticas', requireAuth, async (req, res) => {
  try {
    const ventasSnap = await db.collection(COLECCIONES.VENTAS).get();
    const ventas = ventasSnap.docs.map(d => d.data());

    // Ventas por prenda
    const porPrenda = {};
    ventas.forEach(v => {
      const key = `${v.prenda} ${v.color} ${v.talla}`;
      porPrenda[key] = (porPrenda[key] || 0) + 1;
    });

    const ranking = Object.entries(porPrenda)
      .map(([prenda, total]) => ({ prenda, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const totalVentas = ventas.length;
    const ingresos = ventas.reduce((sum, v) => sum + (v.precio || 0), 0);

    res.json({ totalVentas, ingresos, rankingPrendas: ranking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
