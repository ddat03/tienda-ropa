const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

// Colecciones
const COLECCIONES = {
  CLIENTES: 'clientes',
  PEDIDOS: 'pedidos',
  INVENTARIO: 'inventario',
  VENTAS: 'ventas',
  SESIONES_LIVE: 'sesiones_live',
};

module.exports = { db, messaging, admin, COLECCIONES };
