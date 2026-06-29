const express = require('express');
const router = express.Router();
const { db, COLECCIONES } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { generarCodigoUnico } = require('../utils/codigos');
const { calcularFechaVencimiento, diasRestantes, formatearFecha } = require('../utils/fechas');
const { enviarMensaje } = require('../bot/whatsapp');
const { MENSAJES } = require('../bot/mensajes');

// GET /clientes — lista todos los clientes activos
router.get('/', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection(COLECCIONES.CLIENTES)
      .orderBy('creadoEn', 'desc')
      .get();

    const clientes = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        diasRestantes: data.fechaVencimiento ? diasRestantes(data.fechaVencimiento) : null,
        fechaVencimientoFormateada: data.fechaVencimiento ? formatearFecha(data.fechaVencimiento) : null,
        creadoEn: data.creadoEn?.toDate?.()?.toISOString(),
      };
    });

    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /clientes/confirmar-abono/:clienteId — dueña confirma el abono manualmente
router.post('/confirmar-abono/:clienteId', requireAuth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const clienteRef = db.collection(COLECCIONES.CLIENTES).doc(clienteId);
    const clienteDoc = await clienteRef.get();

    if (!clienteDoc.exists) return res.status(404).json({ error: 'Cliente no encontrado' });

    const cliente = clienteDoc.data();
    if (cliente.activo) return res.status(400).json({ error: 'Cliente ya tiene código activo' });

    const codigo = await generarCodigoUnico();
    const fechaVencimiento = calcularFechaVencimiento(Number(process.env.DIAS_VIGENCIA) || 15);

    await clienteRef.update({
      codigo,
      activo: true,
      estado: 'activo',
      fechaVencimiento,
      abonoConfirmadoEn: new Date(),
    });

    // Notificar al cliente
    await enviarMensaje(
      cliente.telefono,
      MENSAJES.codigoAsignado(codigo, formatearFecha(fechaVencimiento))
    );

    res.json({ ok: true, codigo, fechaVencimiento });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clientes/:clienteId — desactivar cliente
router.delete('/:clienteId', requireAuth, async (req, res) => {
  try {
    await db.collection(COLECCIONES.CLIENTES).doc(req.params.clienteId)
      .update({ activo: false, desactivadoEn: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /clientes/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [activos, pendientes, total] = await Promise.all([
      db.collection(COLECCIONES.CLIENTES).where('activo', '==', true).count().get(),
      db.collection(COLECCIONES.CLIENTES).where('estado', '==', 'pendiente_confirmacion').count().get(),
      db.collection(COLECCIONES.CLIENTES).count().get(),
    ]);

    res.json({
      activos: activos.data().count,
      pendientes: pendientes.data().count,
      total: total.data().count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
