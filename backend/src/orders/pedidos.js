const { db, COLECCIONES } = require('../firebase');
const { descontarStock, verificarStock } = require('../inventory/inventario');
const { MENSAJES } = require('../bot/mensajes');
const { notificarDuena } = require('../notifications/alertas');
function normalizarNumero(tel) {
  return tel.replace(/^whatsapp:/, '').replace(/^\+/, '').trim();
}

async function enviarMensaje(para, cuerpo) {
  const numero = normalizarNumero(para);
  const resp = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: numero,
        type: 'text',
        text: { body: cuerpo },
      }),
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`WhatsApp API error ${resp.status}: ${err}`);
  }
  return resp.json();
}

const ESTADOS = {
  PENDIENTE: 'pendiente',
  CONFIRMADO: 'confirmado',
  RECHAZADO: 'rechazado',
  ENTREGADO: 'entregado',
};

async function crearPedido(datos) {
  const {
    codigoCliente, clienteId, telefono, nombre, prenda, color, talla, textoOriginal,
    origen = 'whatsapp', tiktokUser = null, sesionLiveId = null,
  } = datos;

  const pedidoRef = await db.collection(COLECCIONES.PEDIDOS).add({
    codigoCliente,
    clienteId,
    telefono,
    nombre,
    prenda,
    color,
    talla,
    textoOriginal,
    origen,
    tiktokUser,
    sesionLiveId,
    estado: ESTADOS.PENDIENTE,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  });

  await notificarDuena(`📦 Nuevo pedido: ${codigoCliente} → ${prenda} ${color} talla ${talla}`);

  return pedidoRef;
}

async function confirmarPedido(pedidoId) {
  const pedidoRef = db.collection(COLECCIONES.PEDIDOS).doc(pedidoId);
  const pedidoDoc = await pedidoRef.get();

  if (!pedidoDoc.exists) throw new Error('Pedido no encontrado');
  const pedido = pedidoDoc.data();

  if (pedido.estado !== ESTADOS.PENDIENTE) {
    throw new Error(`No se puede confirmar un pedido en estado: ${pedido.estado}`);
  }

  // Verificar y descontar stock
  const stockInfo = await verificarStock(pedido.prenda, pedido.color, pedido.talla);
  if (!stockInfo.disponible) {
    throw new Error('Sin stock al intentar confirmar');
  }

  await descontarStock(stockInfo.doc.id);

  // Registrar venta
  await db.collection(COLECCIONES.VENTAS).add({
    pedidoId,
    codigoCliente: pedido.codigoCliente,
    clienteId: pedido.clienteId,
    telefono: pedido.telefono,
    nombre: pedido.nombre,
    prenda: pedido.prenda,
    color: pedido.color,
    talla: pedido.talla,
    precio: stockInfo.doc.precio || 0,
    ventaEn: new Date(),
  });

  await pedidoRef.update({
    estado: ESTADOS.CONFIRMADO,
    actualizadoEn: new Date(),
    inventarioId: stockInfo.doc.id,
  });

  // Notificar al cliente (solo si tiene teléfono — pedidos TikTok no lo tienen)
  if (pedido.telefono) {
    await enviarMensaje(
      pedido.telefono,
      MENSAJES.pedidoConfirmado(pedido.codigoCliente, pedido.prenda, pedido.color, pedido.talla)
    );
  }

  return { ok: true };
}

async function rechazarPedido(pedidoId, motivo = 'no está disponible en este momento') {
  const pedidoRef = db.collection(COLECCIONES.PEDIDOS).doc(pedidoId);
  const pedidoDoc = await pedidoRef.get();

  if (!pedidoDoc.exists) throw new Error('Pedido no encontrado');
  const pedido = pedidoDoc.data();

  await pedidoRef.update({
    estado: ESTADOS.RECHAZADO,
    motivoRechazo: motivo,
    actualizadoEn: new Date(),
  });

  if (pedido.telefono) {
    await enviarMensaje(
      pedido.telefono,
      MENSAJES.pedidoRechazado(pedido.prenda, pedido.color, pedido.talla, motivo)
    );
  }

  return { ok: true };
}

async function obtenerPedidosPendientes(limite = 50) {
  const snap = await db.collection(COLECCIONES.PEDIDOS)
    .where('estado', '==', ESTADOS.PENDIENTE)
    .orderBy('creadoEn', 'asc')
    .limit(limite)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function obtenerPedidosDeLive(sesionLiveId) {
  const snap = await db.collection(COLECCIONES.PEDIDOS)
    .where('sesionLiveId', '==', sesionLiveId)
    .orderBy('creadoEn', 'asc')
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  crearPedido,
  confirmarPedido,
  rechazarPedido,
  obtenerPedidosPendientes,
  obtenerPedidosDeLive,
  ESTADOS,
};
