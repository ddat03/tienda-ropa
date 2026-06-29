const { messaging } = require('../firebase');
const twilio = require('twilio');

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

  // WhatsApp directo a la dueña — usa Twilio directo para evitar dependencia circular
  if (process.env.OWNER_WHATSAPP) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    promesas.push(
      client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: process.env.OWNER_WHATSAPP,
        body: mensaje,
      }).catch(err => console.error('WhatsApp notif error:', err))
    );
  }

  console.log('[Notificación]', mensaje);
  await Promise.allSettled(promesas);
}

module.exports = { notificarDuena, setFcmTokenDuena };
