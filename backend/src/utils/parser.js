// Acepta todos los formatos reales del live:
//   Na906 gris            → código=NA906, resto=gris
//   #Ib811 celeste        → código=IB811, resto=celeste
//   Código #Es384 vino    → código=ES384, resto=vino
//   ROC-AB23 blusa M      → código=ROC-AB23, resto=blusa M
const REGEX_CODIGO_PEDIDO = /(?:c[oó]digo\s+)?#?(ROC[-\s]?[A-Z0-9]{4}|[A-Z]{1,4}[0-9]{2,5})\s+(.+)/i;

function extraerCodigoPedido(texto) {
  const match = texto.trim().match(REGEX_CODIGO_PEDIDO);
  if (!match) return null;
  const codigo = match[1].replace(/[-\s]/g, '').toUpperCase();
  return [match[0], codigo, match[2]];
}

const TALLAS_ES = {
  'XS': 'XS', 'EXTRA PEQUEÑO': 'XS', 'EXTRA PEQUEÑA': 'XS', 'EXTRAPEQUEÑO': 'XS',
  'S': 'S', 'PEQUEÑO': 'S', 'PEQUEÑA': 'S', 'CHICO': 'S', 'CHICA': 'S', 'SMALL': 'S', 'PEQ': 'S',
  'M': 'M', 'MEDIANO': 'M', 'MEDIANA': 'M', 'MEDIO': 'M', 'MEDIA': 'M', 'MEDIUM': 'M', 'MED': 'M',
  'L': 'L', 'GRANDE': 'L', 'LARGE': 'L',
  'XL': 'XL', 'EXTRA GRANDE': 'XL', 'EXTRAGRANDE': 'XL', 'XLARGE': 'XL', 'EXTRA LARGE': 'XL',
  'XXL': 'XXL', 'DOBLE GRANDE': 'XXL', 'DOBLE XL': 'XXL', 'XXLARGE': 'XXL',
  'XXXL': 'XXXL', 'TRIPLE GRANDE': 'XXXL', 'TRIPLE XL': 'XXXL',
  'UNICA': 'UNICA', 'ÚNICA': 'UNICA', 'UNICO': 'UNICA', 'ÚNICO': 'UNICA',
  'UNITALLA': 'UNICA', 'UNI': 'UNICA',
};

const TALLAS_VALIDAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'UNICA', 'ÚNICA'];

function parsearDetallePrenda(texto) {
  const palabras = texto.trim().split(/\s+/);
  let talla = 'M';
  const resto = [];

  // Primero buscar frases de dos palabras (ej: "extra grande")
  let i = 0;
  while (i < palabras.length) {
    const dosPalabras = `${palabras[i]} ${palabras[i + 1] || ''}`.trim().toUpperCase();
    const unaPalabra = palabras[i].toUpperCase();

    if (TALLAS_ES[dosPalabras]) {
      talla = TALLAS_ES[dosPalabras];
      i += 2;
    } else if (TALLAS_ES[unaPalabra] || TALLAS_VALIDAS.includes(unaPalabra)) {
      talla = TALLAS_ES[unaPalabra] || unaPalabra;
      i += 1;
    } else {
      resto.push(palabras[i]);
      i += 1;
    }
  }

  // En el live la gente escribe solo "color" o "prenda color"
  // Si hay una sola palabra no-talla, asumimos que es el color
  let prenda, color;
  if (resto.length === 0) {
    prenda = 'prenda'; color = 'sin color';
  } else if (resto.length === 1) {
    prenda = 'prenda'; color = resto[0]; // solo dieron color
  } else {
    prenda = resto[0]; color = resto.slice(1).join(' ');
  }

  return { prenda, color, talla };
}

module.exports = { extraerCodigoPedido, parsearDetallePrenda };
