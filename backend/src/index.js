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

app.use(express.json());

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Demasiadas solicitudes' }));

// ── Rutas ──────────────────────────────────────────────────────────────────────
app.use('/webhook', require('./routes/webhook'));
app.use('/clientes', require('./routes/clientes'));
app.use('/inventario', require('./routes/inventario'));
app.use('/pedidos', require('./routes/pedidos'));
app.use('/notificaciones', require('./routes/notificaciones'));
app.use('/tiktok', require('./routes/tiktok'));

// Restaurar vigilancia TikTok si el backend se reinició
require('./tiktok/live').restaurarVigilancia();

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Scheduler de vencimientos ──────────────────────────────────────────────────
require('./notifications/scheduler');

// ── Servidor ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
  console.log(`Firebase: ${process.env.FIREBASE_PROJECT_ID || '❌ NO CONFIGURADO'}`);
  console.log(`WhatsApp Phone ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID || '❌ NO CONFIGURADO'}`);
  console.log(`WhatsApp Token: ${process.env.WHATSAPP_TOKEN ? '✅ configurado' : '❌ NO CONFIGURADO'}`);
});

module.exports = app;
