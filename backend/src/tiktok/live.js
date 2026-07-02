const { db, COLECCIONES } = require('../firebase');
const { extraerCodigoPedido, parsearDetallePrenda } = require('../utils/parser');
const { crearPedido } = require('../orders/pedidos');
const { notificarDuena } = require('../notifications/alertas');

let connection = null;
let sesionActual = null;
let usuarioVigilado = null;
let enLiveConectado = false;
let prendaActiva = null; // prenda que está mostrando la dueña en cámara ahora mismo

const CONFIG_DOC = () => db.collection('config').doc('tiktok');

// ── Arranque: restaurar vigilancia si el backend se reinició ─────────────────
async function restaurarVigilancia() {
  try {
    const doc = await CONFIG_DOC().get();
    if (doc.exists && doc.data().usuarioVigilado) {
      const usuario = doc.data().usuarioVigilado;
      console.log(`[TikTok] Restaurando vigilancia de @${usuario} tras reinicio`);
      usuarioVigilado = usuario;
      _iniciarCiclo(usuario);
    }
  } catch (err) {
    console.error('[TikTok] Error restaurando vigilancia:', err.message);
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

async function activarVigilancia(usuario) {
  const usuarioLimpio = usuario.replace(/^@/, '').trim();
  if (!usuarioLimpio) throw new Error('Usuario de TikTok requerido');
  if (usuarioVigilado) throw new Error('Ya hay una vigilancia activa. Desactívala primero.');

  usuarioVigilado = usuarioLimpio;
  await CONFIG_DOC().set({ usuarioVigilado: usuarioLimpio, activadoEn: new Date() });
  _iniciarCiclo(usuarioLimpio);
  return { ok: true, usuario: usuarioLimpio };
}

async function desactivarVigilancia() {
  const u = usuarioVigilado;
  usuarioVigilado = null;
  enLiveConectado = false;

  await CONFIG_DOC().delete().catch(() => {});

  if (connection) {
    try { await connection.disconnect(); } catch (_) {}
    connection = null;
  }

  if (sesionActual) {
    await db.collection(COLECCIONES.SESIONES_LIVE).doc(sesionActual.id)
      .update({ activa: false, finalizadoEn: new Date() }).catch(() => {});
    sesionActual = null;
  }

  if (u) await notificarDuena(`⏹️ TikTok desconectado: @${u}`);
  return { ok: true };
}

function obtenerEstadoLive() {
  return {
    vigilando: !!usuarioVigilado,
    enLive: enLiveConectado,
    enEspera: !!usuarioVigilado && !enLiveConectado,
    usuario: usuarioVigilado || null,
    sesion: sesionActual,
    prendaActiva,
  };
}

function setPrendaActiva(prenda) {
  prendaActiva = prenda || null;
  console.log(`[TikTok] Prenda activa: ${prendaActiva || '(ninguna)'}`);
}

// ── Ciclo: conectar directo, reintentar si falla ──────────────────────────────

async function _iniciarCiclo(usuario) {
  while (usuarioVigilado === usuario) {
    try {
      const { TikTokLiveConnection } = await import('tiktok-live-connector');

      connection = new TikTokLiveConnection(usuario, {
        signApiKey: process.env.TIKTOK_SIGN_API_KEY || undefined,
        fetchRoomInfoOnConnect: true,
      });

      _registrarEventos(connection);

      console.log(`[TikTok] Conectando a @${usuario}...`);
      const estado = await connection.connect();

      enLiveConectado = true;

      const sesionRef = await db.collection(COLECCIONES.SESIONES_LIVE).add({
        usuario,
        roomId: estado.roomId || null,
        activa: true,
        iniciadoEn: new Date(),
      });
      sesionActual = { id: sesionRef.id, usuario, iniciadoEn: new Date() };

      await notificarDuena(`🔴 Chat TikTok conectado: @${usuario}`);
      console.log(`[TikTok] ✅ Escuchando chat de @${usuario}`);

      // Esperar a que termine el live
      await new Promise(resolve => {
        connection.on('streamEnd', () => { console.log('[TikTok] Stream terminó'); resolve(); });
        connection.on('disconnected', () => { console.log('[TikTok] Desconectado'); resolve(); });
      });

    } catch (err) {
      if (usuarioVigilado !== usuario) break;
      console.log(`[TikTok] No conectado (${err.message}) — reintentando en 20s`);
    }

    // Limpiar estado y reintentar
    enLiveConectado = false;
    if (sesionActual) {
      await db.collection(COLECCIONES.SESIONES_LIVE).doc(sesionActual.id)
        .update({ activa: false, finalizadoEn: new Date() }).catch(() => {});
      sesionActual = null;
    }
    connection = null;

    if (usuarioVigilado === usuario) await _sleep(20_000);
  }

  enLiveConectado = false;
  connection = null;
  console.log(`[TikTok] Ciclo terminado para @${usuario}`);
}

function _registrarEventos(conn) {
  conn.on('chat', (data) => {
    // v2.x usa data.content (no data.comment)
    const texto = (data.content || '').trim();
    console.log(`[TikTok] 💬 chat recibido: "${texto}"`);
    procesarComentario(data).catch(err =>
      console.error('[TikTok] Error procesando comentario:', err.message)
    );
  });
  conn.on('error', (err) => {
    console.error('[TikTok] Error:', err?.message || err);
  });
}

// ── Procesamiento de comentarios ──────────────────────────────────────────────

async function procesarComentario(data) {
  // v2.x: texto en data.content, usuario en data.user.displayId / data.user.nickname
  const texto = (data.content || '').trim();
  const match = extraerCodigoPedido(texto);
  if (!match) return;

  const codigoCliente = match[1].toUpperCase();
  const detalle = match[2].trim();
  const tiktokUser = data.user?.displayId || data.user?.uniqueId || 'desconocido';
  const nombreTiktok = data.user?.nickname || tiktokUser;

  const partes = parsearDetallePrenda(detalle);

  // Usar prenda activa si el usuario no especificó una
  if (partes.prenda === 'prenda' && prendaActiva) {
    partes.prenda = prendaActiva;
  }

  console.log(`[TikTok] 📦 Pedido — @${tiktokUser} | ${codigoCliente} | ${partes.prenda} ${partes.color} ${partes.talla}`);

  await crearPedido({
    codigoCliente,
    clienteId: null,
    telefono: null,
    nombre: nombreTiktok,
    prenda: partes.prenda,
    color: partes.color,
    talla: partes.talla,
    textoOriginal: texto,
    origen: 'tiktok',
    tiktokUser,
    sesionLiveId: sesionActual?.id || null,
  });
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { activarVigilancia, desactivarVigilancia, obtenerEstadoLive, restaurarVigilancia, setPrendaActiva };
