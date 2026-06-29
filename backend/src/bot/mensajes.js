// Plantillas de mensajes del bot
const MENSAJES = {
  bienvenida: (nombre = '') =>
    `👗 *Hola${nombre ? ' ' + nombre : ''}! Bienvenida/o a nuestra tienda.*\n\n` +
    `Para reservar tus prendas en el live necesitas un abono de *$20*.\n\n` +
    `Escribe *ABONAR* para continuar 💳`,

  instruccionesAbono: () =>
    `💳 *Proceso de abono - $20*\n\n` +
    `Puedes pagar por:\n` +
    `• 📱 Transferencia bancaria\n` +
    `• 💸 Depósito en efectivo\n\n` +
    `Una vez pagado, envía el *comprobante de pago* aquí y activamos tu código.\n\n` +
    `_El código te permite reservar prendas durante el live por 15 días._`,

  codigoAsignado: (codigo, fechaVencimiento) =>
    `✅ *¡Abono confirmado!*\n\n` +
    `🎫 *Tu código de cliente:* \`${codigo}\`\n` +
    `📅 *Válido hasta:* ${fechaVencimiento}\n\n` +
    `*¿Cómo usarlo en el live?*\n` +
    `Escribe en el chat de TikTok:\n` +
    `\`${codigo} [prenda] [color] [talla]\`\n\n` +
    `Ejemplo: \`${codigo} blusa rosada M\`\n\n` +
    `¡Te esperamos en el próximo live! 🎥`,

  recordatorio3dias: (codigo, fechaVencimiento) =>
    `⚠️ *Recuerda usar tu código*\n\n` +
    `Tu código *${codigo}* vence el *${fechaVencimiento}*.\n` +
    `Solo te quedan *3 días* para usarlo en nuestros lives.\n\n` +
    `Síguenos en TikTok para estar al tanto de los próximos lives 🎥`,

  codigoVencido: (codigo) =>
    `❌ *Tu código ha vencido*\n\n` +
    `El código *${codigo}* ya no está activo.\n\n` +
    `Si deseas seguir comprando, escribe *ABONAR* para obtener un nuevo código 💳`,

  pedidoConfirmado: (codigo, prenda, color, talla) =>
    `✅ *¡Pedido confirmado!*\n\n` +
    `🧾 *Detalle:*\n` +
    `• Prenda: ${prenda}\n` +
    `• Color: ${color}\n` +
    `• Talla: ${talla}\n\n` +
    `Tu prenda está apartada. La dueña la marcará con tu código *${codigo}*.\n` +
    `Coordinaremos el pago y envío al finalizar el live 📦`,

  pedidoRechazado: (prenda, color, talla, motivo) =>
    `😔 *Pedido no disponible*\n\n` +
    `La prenda *${prenda} ${color} talla ${talla}* ${motivo}.\n\n` +
    `¡Pero tenemos más opciones! Escríbenos para ver alternativas 👗`,

  sinStock: (prenda, color, talla, alternativas) => {
    let msg = `😔 *Sin stock disponible*\n\n` +
      `La prenda *${prenda} ${color} talla ${talla}* está agotada.\n\n`;

    if (alternativas && alternativas.length > 0) {
      msg += `*Alternativas disponibles:*\n`;
      alternativas.forEach(alt => {
        msg += `• ${alt.color} talla ${alt.talla} - ${alt.cantidad} und.\n`;
      });
      msg += `\n¿Quieres alguna de estas? Escríbenos 💬`;
    } else {
      msg += `No hay otras tallas o colores disponibles en este momento.`;
    }
    return msg;
  },

  codigoNoValido: () =>
    `❌ *Código no encontrado*\n\n` +
    `El código ingresado no existe o ya no está activo.\n\n` +
    `¿Necesitas un código? Escribe *ABONAR* 💳`,

  errorGeneral: () =>
    `⚠️ Hubo un problema procesando tu solicitud. Por favor intenta de nuevo o contáctanos directamente.`,
};

module.exports = { MENSAJES };
