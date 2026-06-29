// Acepta: ROC-AB23, ROCAB23, ROC AB23 (case-insensitive)
const REGEX_CODIGO_PEDIDO = /^ROC[-\s]?([A-Z0-9]{4})\s+(.+)$/i;

function extraerCodigoPedido(texto) {
  const match = texto.trim().match(REGEX_CODIGO_PEDIDO);
  if (!match) return null;
  // Normaliza siempre a ROC-XXXX en mayúsculas
  return [match[0], `ROC-${match[1].toUpperCase()}`, match[2]];
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

  const prenda = resto[0] || 'prenda';
  const color = resto.slice(1).join(' ') || 'sin color';

  return { prenda, color, talla };
}

module.exports = { extraerCodigoPedido, parsearDetallePrenda };
