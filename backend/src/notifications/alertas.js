const { messaging } = require('../firebase');
const { enviarMensaje } = require('../bot/whatsapp');

// Token FCM del dispositivo de la dueña (guardado en Firestore/config)
let fcmTokenDuena = null;

function setFcmTokenDuena(token) {
  fcmTokenDuena = token;
}

async function notificarDuena(mensaje) {
  const promesas = [];

  // Push notification vía FCM
  if (fcmTokenDuena) {
    promesas.push(
      messaging.send({
        token: fcmTokenDuena,
        notification: { title: '🛍️ Tienda Ropa', body: mensaje },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      }).catch(err => console.error('FCM error:', err))
    );
  }

  // WhatsApp directo a la dueña como respaldo
  if (process.env.OWNER_WHATSAPP) {
    promesas.push(
      enviarMensaje(process.env.OWNER_WHATSAPP, mensaje)
        .catch(err => console.error('WhatsApp notif error:', err))
    );
  }

  console.log('[Notificación]', mensaje);
  await Promise.allSettled(promesas);
}

module.exports = { notificarDuena, setFcmTokenDuena };
