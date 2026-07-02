const { db, COLECCIONES } = require('../firebase');
const { extraerCodigoPedido, parsearDetallePrenda } = require('../utils/parser');
const { crearPedido } = require('../orders/pedidos');
const { notificarDuena } = require('../notifications/alertas');

// Estado del módulo
let connection = null;
let abortController = null;  // para cancelar waitUntilLive
let sesionActual = null;     // { id, usuario, roomId, iniciadoEn }
let usuarioVigilado = null;  // usuario configurado para auto-watch
let enEspera = false;        // true = esperando que arranque el live

// ── API pública ───────────────────────────────────────────────────────────────

async function activarVigilancia(usuario) {
  const usuarioLimpio = usuario.replace(/^@/, '').trim();
  if (!usuarioLimpio) throw new Error('Usuario de TikTok requerido');
  if (usuarioVigilado) throw new Error('Ya hay una vigilancia activa. Desactívala primero.');

  usuarioVigilado = usuarioLimpio;
  _iniciarCiclo(usuarioLimpio); // no awaited: corre en background
  return { ok: true, usuario: usuarioLimpio };
}

async function desactivarVigilancia() {
  usuarioVigilado = null;
  enEspera = false;

  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  if (connection) {
    await connection.disconnect();
    connection = null;
  }

  if (sesionActual) {
    await db.collection(COLECCIONES.SESIONES_LIVE).doc(sesionActual.id)
      .update({ activa: false, finalizadoEn: new Date() })
      .catch(() => {});
    const u = sesionActual.usuario;
    sesionActual = null;
    await notificarDuena(`⏹️ Vigilancia TikTok desactivada: @${u}`);
  }

  return { ok: true };
}

function obtenerEstadoLive() {
  return {
    vigilando: !!usuarioVigilado,
    enLive: !!connection,
    enEspera,
    usuario: usuarioVigilado || null,
    sesion: sesionActual,
  };
}

// ── Ciclo interno (auto-watch + reconexión) ────────────────────────────────

async function _iniciarCiclo(usuario) {
  while (usuarioVigilado === usuario) {
    try {
      const { TikTokLiveConnection } = await import('tiktok-live-connector');

      // Fase 1: esperar a que empiece el live
      connection = new TikTokLiveConnection(usuario, {
        signApiKey: process.env.TIKTOK_SIGN_API_KEY || undefined,
        fetchRoomInfoOnConnect: true,
      });

      enEspera = true;
      console.log(`[TikTok] Esperando live de @${usuario}...`);

      abortController = new AbortController();
      await connection.waitUntilLive(30, abortController.signal);

      // Si se abortó (desactivarVigilancia llamado), salir
      if (usuarioVigilado !== usuario) break;

      // Fase 2: conectar al live
      enEspera = false;
      _registrarEventos(connection);
      const estado = await connection.connect();

      // Guardar sesión en Firestore
      const sesionRef = await db.collection(COLECCIONES.SESIONES_LIVE).add({
        usuario,
        roomId: estado.roomId,
        activa: true,
        iniciadoEn: new Date(),
      });
      sesionActual = { id: sesionRef.id, usuario, roomId: estado.roomId, iniciadoEn: new Date() };

      await notificarDuena(`🔴 Live detectado automáticamente: @${usuario}`);
      console.log(`[TikTok] Conectado al live de @${usuario} (room: ${estado.roomId})`);

      // Fase 3: esperar a que termine el live (streamEnd o disconnect)
      await new Promise(resolve => {
        connection.on('streamEnd', resolve);
        connection.on('disconnected', resolve);
      });

      // Live terminó
      console.log(`[TikTok] Live terminado: @${usuario}`);
      if (sesionActual) {
        await db.collection(COLECCIONES.SESIONES_LIVE).doc(sesionActual.id)
          .update({ activa: false, finalizadoEn: new Date() })
          .catch(() => {});
        sesionActual = null;
      }
      connection = null;

      // Pausa breve antes de volver a esperar el siguiente live
      await _sleep(10_000);

    } catch (err) {
      if (err.name === 'AbortError' || usuarioVigilado !== usuario) break;
      console.error(`[TikTok] Error en ciclo: ${err.message}`);
      connection = null;
      sesionActual = null;
      enEspera = false;
      await _sleep(30_000); // esperar antes de reintentar
    }
  }

  enEspera = false;
  connection = null;
  console.log(`[TikTok] Ciclo de vigilancia terminado para @${usuario}`);
}

function _registrarEventos(conn) {
  conn.on('chat', (data) => {
    procesarComentario(data).catch(err =>
      console.error('[TikTok] Error procesando comentario:', err.message)
    );
  });

  conn.on('error', (err) => {
    console.error('[TikTok] Error de conexión:', err?.message || err);
  });
}

// ── Procesamiento de comentarios ──────────────────────────────────────────────
// En el live confiamos en lo que se escribe — sin validar base de datos.
// La dueña revisa cada pedido en el panel y confirma o rechaza.

async function procesarComentario(data) {
  const texto = (data.comment || '').trim();
  const match = extraerCodigoPedido(texto);
  if (!match) return;

  const codigoCliente = match[1].toUpperCase();
  const detalle = match[2].trim();
  const tiktokUser = data.user?.uniqueId || 'desconocido';
  const nombreTiktok = data.user?.nickname || tiktokUser;

  const partes = parsearDetallePrenda(detalle);

  console.log(`[TikTok] Pedido detectado — @${tiktokUser} | código: ${codigoCliente} | ${partes.prenda} ${partes.color} ${partes.talla}`);

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

module.exports = { activarVigilancia, desactivarVigilancia, obtenerEstadoLive };
