require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const cron = require('node-cron');
const { db, COLECCIONES } = require('../firebase');
const { diasRestantes, estaVencido, formatearFecha } = require('../utils/fechas');
const { enviarMensaje } = require('../bot/whatsapp');
const { MENSAJES } = require('../bot/mensajes');

const DIAS_RECORDATORIO = Number(process.env.DIAS_RECORDATORIO) || 3;

// Corre todos los días a las 10:00 AM (hora Ecuador, UTC-5 → 15:00 UTC)
cron.schedule('0 15 * * *', async () => {
  console.log('[Scheduler] Revisando vencimientos...');
  await revisarVencimientos();
});

async function revisarVencimientos() {
  const snap = await db.collection(COLECCIONES.CLIENTES)
    .where('activo', '==', true)
    .get();

  const batch = db.batch();
  const notificaciones = [];

  for (const doc of snap.docs) {
    const cliente = doc.data();
    const dias = diasRestantes(cliente.fechaVencimiento);
    const vencido = estaVencido(cliente.fechaVencimiento);

    if (vencido) {
      // Desactivar y notificar
      batch.update(doc.ref, { activo: false, desactivadoEn: new Date() });
      notificaciones.push(
        enviarMensaje(cliente.telefono, MENSAJES.codigoVencido(cliente.codigo))
          .catch(e => console.error('Error notif vencido:', e))
      );
    } else if (dias === DIAS_RECORDATORIO) {
      notificaciones.push(
        enviarMensaje(
          cliente.telefono,
          MENSAJES.recordatorio3dias(cliente.codigo, formatearFecha(cliente.fechaVencimiento))
        ).catch(e => console.error('Error notif recordatorio:', e))
      );
    }
  }

  await batch.commit();
  await Promise.allSettled(notificaciones);
  console.log(`[Scheduler] Procesados ${snap.docs.length} clientes`);
}

module.exports = { revisarVencimientos };
