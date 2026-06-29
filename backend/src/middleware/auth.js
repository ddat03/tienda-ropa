const { admin } = require('../firebase');

// Middleware: verifica token Firebase del panel web
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Twilio signature validation para el webhook
const twilio = require('twilio');
function requireTwilioSignature(req, res, next) {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );

  if (!valid && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Firma inválida' });
  }
  next();
}

module.exports = { requireAuth, requireTwilioSignature };
