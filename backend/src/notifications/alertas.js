const { messaging } = require('../firebase');

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

  // WhatsApp directo a la dueña vía Meta Cloud API
  if (process.env.OWNER_WHATSAPP && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN) {
    const numero = process.env.OWNER_WHATSAPP.replace(/^whatsapp:/, '').replace(/^\+/, '').trim();
    promesas.push(
      fetch(
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
            text: { body: mensaje },
          }),
        }
      ).then(r => { if (!r.ok) r.text().then(t => console.error('WhatsApp notif error:', t)); })
       .catch(err => console.error('WhatsApp notif error:', err))
    );
  }

  console.log('[Notificación]', mensaje);
  await Promise.allSettled(promesas);
}

module.exports = { notificarDuena, setFcmTokenDuena };
