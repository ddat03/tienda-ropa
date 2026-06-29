require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Necesario para que req.protocol sea 'https' detrás del proxy de Render
app.set('trust proxy', 1);

// ── Seguridad ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tienda-ropa-8aa48.web.app',
    'https://tienda-ropa-8aa48.firebaseapp.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// Twilio necesita body urlencoded para el webhook
app.use('/webhook', express.urlencoded({ extended: false }));
app.use(express.json());

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Demasiadas solicitudes' }));

// ── Rutas ──────────────────────────────────────────────────────────────────────
app.use('/webhook', require('./routes/webhook'));
app.use('/clientes', require('./routes/clientes'));
app.use('/inventario', require('./routes/inventario'));
app.use('/pedidos', require('./routes/pedidos'));
app.use('/notificaciones', require('./routes/notificaciones'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Scheduler de vencimientos ──────────────────────────────────────────────────
require('./notifications/scheduler');

// ── Servidor ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
  console.log(`Firebase: ${process.env.FIREBASE_PROJECT_ID || '❌ NO CONFIGURADO'}`);
  console.log(`Twilio SID: ${process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.slice(0,8) + '...' : '❌ NO CONFIGURADO'}`);
  console.log(`Twilio WhatsApp: ${process.env.TWILIO_WHATSAPP_NUMBER || '❌ NO CONFIGURADO'}`);
});

module.exports = app;
