// Reconoce "ROC-AB34 blusa rosada M" desde WhatsApp o el chat de TikTok
const REGEX_CODIGO_PEDIDO = /^(ROC-[A-Z0-9]{4})\s+(.+)$/i;

function extraerCodigoPedido(texto) {
  return texto.trim().match(REGEX_CODIGO_PEDIDO);
}

function parsearDetallePrenda(texto) {
  const tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'UNICA', 'ÚNICA'];
  const palabras = texto.trim().split(/\s+/);

  let talla = 'M';
  let resto = [];

  for (const pal of palabras) {
    if (tallas.includes(pal.toUpperCase())) {
      talla = pal.toUpperCase();
    } else {
      resto.push(pal);
    }
  }

  // Heurística: la primera palabra es la prenda, el resto el color
  const prenda = resto[0] || 'prenda';
  const color = resto.slice(1).join(' ') || 'sin color';

  return { prenda, color, talla };
}

module.exports = { extraerCodigoPedido, parsearDetallePrenda };
