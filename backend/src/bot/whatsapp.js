const { db, COLECCIONES } = require('../firebase');
const { estaVencido } = require('../utils/fechas');
const { MENSAJES } = require('./mensajes');
const { verificarStock, buscarFuzzy, obtenerAlternativas } = require('../inventory/inventario');
const { crearPedido } = require('../orders/pedidos');
const { notificarDuena } = require('../notifications/alertas');
const { extraerCodigoPedido, parsearDetallePrenda } = require('../utils/parser');

// Normaliza cualquier formato de teléfono al que acepta Meta: "593XXXXXXXXX"
function normalizarNumero(tel) {
  return tel.replace(/^whatsapp:/, '').replace(/^\+/, '').trim();
}

async function enviarMensaje(para, cuerpo) {
  const numero = normalizarNumero(para);
  const resp = await fetch(
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
        text: { body: cuerpo },
      }),
    }
  );
  const body = await resp.json();
  if (!resp.ok) {
    console.error(`[WhatsApp] Error enviando a ${numero}:`, JSON.stringify(body));
    throw new Error(`WhatsApp API error ${resp.status}`);
  }
  console.log(`[WhatsApp] Mensaje enviado a ${numero} — id: ${body?.messages?.[0]?.id}`);
  return body;
}

// Estado de conversación persistido en Firestore (sobrevive reinicios)
function telefonoId(telefono) {
  return telefono.replace(/[^a-zA-Z0-9]/g, '_');
}

async function getEstado(telefono) {
  const doc = await db.collection('conversaciones').doc(telefonoId(telefono)).get();
  return doc.exists ? doc.data() : { paso: 'inicio' };
}

async function setEstado(telefono, estado) {
  await db.collection('conversaciones').doc(telefonoId(telefono)).set({ ...estado, updatedAt: new Date() });
}

async function deleteEstado(telefono) {
  await db.collection('conversaciones').doc(telefonoId(telefono)).delete();
}

async function procesarMensaje(de, cuerpo, nombreContacto = '') {
  const telefono = de; // "593XXXXXXXXX" — formato Meta sin + ni whatsapp:
  const texto = cuerpo.trim().toUpperCase();
  const estado = await getEstado(telefono);

  try {
    // ── Flujo: inicio / bienvenida ────────────────────────────────────────────
    if (texto === 'HOLA' || texto === 'BUENAS' || texto === 'HI') {
      await enviarMensaje(de, MENSAJES.bienvenida(nombreContacto));
      await deleteEstado(telefono);
      return;
    }

    // ── Flujo: intención de abonar ────────────────────────────────────────────
    if (texto === 'ABONAR' || texto === 'QUIERO ABONAR' || texto.includes('ABONO')) {
      await enviarMensaje(de, MENSAJES.instruccionesAbono());
      await setEstado(telefono, { paso: 'esperando_comprobante' });
      return;
    }

    // ── Flujo: comprobante enviado (imagen/texto de pago) ─────────────────────
    if (estado.paso === 'esperando_comprobante') {
      await db.collection(COLECCIONES.CLIENTES).add({
        telefono: de,
        nombre: nombreContacto,
        estado: 'pendiente_confirmacion',
        creadoEn: new Date(),
        montoAbono: Number(process.env.ABONO_MONTO) || 20,
      });

      await notificarDuena(`💬 Nuevo comprobante de ${nombreContacto || de} — Revisar panel admin para confirmar abono`);
      await enviarMensaje(de, '📋 *Recibimos tu comprobante.* La dueña lo revisará en breve y activará tu código. ¡Gracias por tu paciencia! ⏳');
      await deleteEstado(telefono);
      return;
    }

    // ── Flujo: código de cliente → pedido del live ────────────────────────────
    const matchPedido = extraerCodigoPedido(cuerpo);
    if (matchPedido) {
      const codigoCliente = matchPedido[1].toUpperCase();
      const detallePedido = matchPedido[2].trim();

      // Verificar cliente activo
      const clienteSnap = await db.collection(COLECCIONES.CLIENTES)
        .where('codigo', '==', codigoCliente)
        .where('activo', '==', true)
        .get();

      if (clienteSnap.empty) {
        await enviarMensaje(de, MENSAJES.codigoNoValido());
        return;
      }

      const clienteDoc = clienteSnap.docs[0];
      const clienteData = clienteDoc.data();

      if (estaVencido(clienteData.fechaVencimiento)) {
        await enviarMensaje(de, MENSAJES.codigoVencido(codigoCliente));
        await clienteDoc.ref.update({ activo: false });
        return;
      }

      // Parsear prenda, color, talla del texto (ej: "blusa rosada M")
      const partes = parsearDetallePrenda(detallePedido);

      // Verificar stock exacto; si no hay, intentar fuzzy matching
      let stockInfo = await verificarStock(partes.prenda, partes.color, partes.talla);

      if (!stockInfo.disponible) {
        const fuzzy = await buscarFuzzy(partes.prenda, partes.color, partes.talla);
        if (fuzzy?.disponible) {
          stockInfo = fuzzy;
          partes.prenda = fuzzy.prendaCorregida;
          partes.color = fuzzy.colorCorregido;
          partes.talla = fuzzy.tallaCorregida;
        }
      }

      if (!stockInfo.disponible) {
        const alternativas = await obtenerAlternativas(partes.prenda, partes.color, partes.talla);
        await enviarMensaje(de, MENSAJES.sinStock(partes.prenda, partes.color, partes.talla, alternativas));
        return;
      }

      // Crear pedido pendiente (queda en panel del live para confirmar)
      await crearPedido({
        codigoCliente,
        clienteId: clienteDoc.id,
        telefono: de,
        nombre: clienteData.nombre || '',
        prenda: partes.prenda,
        color: partes.color,
        talla: partes.talla,
        textoOriginal: cuerpo,
        aproximado: stockInfo.aproximado || false,
      });

      await enviarMensaje(de,
        `🔔 *Pedido recibido* - Tu solicitud de *${partes.prenda} ${partes.color} talla ${partes.talla}* está siendo verificada. ` +
        `Te confirmaremos en un momento 📦`
      );
      return;
    }

    // ── Mensaje no reconocido ─────────────────────────────────────────────────
    await deleteEstado(telefono);
    await enviarMensaje(de, MENSAJES.bienvenida(nombreContacto));

  } catch (err) {
    console.error('Error procesando mensaje:', err);
    await enviarMensaje(de, MENSAJES.errorGeneral());
  }
}

module.exports = { procesarMensaje, enviarMensaje };
