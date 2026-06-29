const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  obtenerInventario, crearPrenda, actualizarPrenda,
  eliminarPrenda, agregarStock, obtenerPrenda
} = require('../inventory/inventario');

// GET /inventario
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await obtenerInventario();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /inventario
router.post('/', requireAuth, async (req, res) => {
  try {
    const ref = await crearPrenda(req.body);
    const doc = await ref.get();
    res.status(201).json({ id: ref.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /inventario/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    await actualizarPrenda(req.params.id, req.body);
    const item = await obtenerPrenda(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /inventario/:id/agregar-stock
router.post('/:id/agregar-stock', requireAuth, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (!cantidad || cantidad < 1) return res.status(400).json({ error: 'Cantidad inválida' });
    const nueva = await agregarStock(req.params.id, Number(cantidad));
    res.json({ cantidad: nueva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /inventario/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await eliminarPrenda(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
