const { db, COLECCIONES } = require('../firebase');
const { estaVencido } = require('../utils/fechas');
const { extraerCodigoPedido, parsearDetallePrenda } = require('../utils/parser');
const { verificarStock } = require('../inventory/inventario');
const { crearPedido } = require('../orders/pedidos');
const { notificarDuena } = require('../notifications/alertas');

let connection = null;
let sesionActual = null; // { id, usuario, roomId, iniciadoEn }

async function iniciarLive(usuario) {
  if (connection) {
    throw new Error('Ya hay una sesión de TikTok Live activa. Detenla primero.');
  }

  const usuarioLimpio = usuario.replace(/^@/, '').trim();
  if (!usuarioLimpio) throw new Error('Usuario de TikTok requerido');

  // tiktok-live-connector es ESM-only, se importa dinámicamente desde CommonJS
  const { TikTokLiveConnection } = await import('tiktok-live-connector');

  connection = new TikTokLiveConnection(usuarioLimpio, {
    signApiKey: process.env.TIKTOK_SIGN_API_KEY || undefined,
  });

  connection.on('chat', (data) => {
    procesarComentario(data).catch(err => console.error('[TikTok] Error procesando comentario:', err.message));
  });

  connection.on('disconnected', () => {
    console.log('[TikTok] Desconectado del live');
  });

  connection.on('error', (err) => {
    console.error('[TikTok] Error de conexión:', err?.message || err);
  });

  const estado = await connection.connect();

  const sesionRef = await db.collection(COLECCIONES.SESIONES_LIVE).add({
    usuario: usuarioLimpio,
    roomId: estado.roomId,
    activa: true,
    iniciadoEn: new Date(),
  });

  sesionActual = { id: sesionRef.id, usuario: usuarioLimpio, roomId: estado.roomId, iniciadoEn: new Date() };

  await notificarDuena(`🔴 Live de TikTok conectado: @${usuarioLimpio}`);

  return sesionActual;
}

async function detenerLive() {
  if (!connection) return { ok: true, mensaje: 'No había sesión activa' };

  await connection.disconnect();
  connection = null;

  if (sesionActual) {
    await db.collection(COLECCIONES.SESIONES_LIVE).doc(sesionActual.id).update({
      activa: false,
      finalizadoEn: new Date(),
    });
  }

  const usuario = sesionActual?.usuario;
  sesionActual = null;

  if (usuario) await notificarDuena(`⏹️ Live de TikTok finalizado: @${usuario}`);

  return { ok: true };
}

function obtenerEstadoLive() {
  return {
    activo: !!connection,
    ...(sesionActual || {}),
  };
}

async function procesarComentario(data) {
  const texto = (data.comment || '').trim();
  const match = extraerCodigoPedido(texto);
  if (!match) return;

  const codigoCliente = match[1].toUpperCase();
  const detalle = match[2].trim();
  const tiktokUser = data.user?.uniqueId || 'desconocido';

  const clienteSnap = await db.collection(COLECCIONES.CLIENTES)
    .where('codigo', '==', codigoCliente)
    .where('activo', '==', true)
    .get();

  if (clienteSnap.empty) {
    console.log(`[TikTok] @${tiktokUser} escribió código inválido: ${codigoCliente}`);
    return;
  }

  const clienteDoc = clienteSnap.docs[0];
  const clienteData = clienteDoc.data();

  if (estaVencido(clienteData.fechaVencimiento)) {
    await clienteDoc.ref.update({ activo: false });
    console.log(`[TikTok] @${tiktokUser} usó código vencido: ${codigoCliente}`);
    return;
  }

  const partes = parsearDetallePrenda(detalle);
  const stockInfo = await verificarStock(partes.prenda, partes.color, partes.talla);

  if (!stockInfo.disponible) {
    console.log(`[TikTok] Sin stock para ${codigoCliente}: ${partes.prenda} ${partes.color} ${partes.talla}`);
    return;
  }

  await crearPedido({
    codigoCliente,
    clienteId: clienteDoc.id,
    telefono: clienteData.telefono,
    nombre: clienteData.nombre || tiktokUser,
    prenda: partes.prenda,
    color: partes.color,
    talla: partes.talla,
    textoOriginal: texto,
    origen: 'tiktok',
    tiktokUser,
    sesionLiveId: sesionActual?.id || null,
  });
}

module.exports = { iniciarLive, detenerLive, obtenerEstadoLive };
