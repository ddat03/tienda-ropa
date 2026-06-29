const { db, messaging, COLECCIONES } = require('../firebase');
const { notificarDuena } = require('../notifications/alertas');

const UMBRAL_BAJO = 3; // 🟡 últimas N unidades

async function obtenerInventario() {
  const snap = await db.collection(COLECCIONES.INVENTARIO).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function obtenerPrenda(prendaId) {
  const doc = await db.collection(COLECCIONES.INVENTARIO).doc(prendaId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Busca variantes de una prenda por nombre, color y talla
async function verificarStock(prenda, color, talla) {
  const snap = await db.collection(COLECCIONES.INVENTARIO)
    .where('nombreNormalizado', '==', normalizar(prenda))
    .where('colorNormalizado', '==', normalizar(color))
    .where('talla', '==', talla.toUpperCase())
    .get();

  if (snap.empty) return { disponible: false, cantidad: 0, doc: null };

  const doc = snap.docs[0];
  const data = doc.data();
  return {
    disponible: data.cantidad > 0,
    cantidad: data.cantidad,
    doc: { id: doc.id, ...data },
  };
}

async function obtenerAlternativas(prenda, colorExcluido, tallaExcluida) {
  const snap = await db.collection(COLECCIONES.INVENTARIO)
    .where('nombreNormalizado', '==', normalizar(prenda))
    .where('cantidad', '>', 0)
    .get();

  return snap.docs
    .map(doc => doc.data())
    .filter(d => !(normalizar(d.color) === normalizar(colorExcluido) && d.talla === tallaExcluida.toUpperCase()))
    .slice(0, 3); // máximo 3 sugerencias
}

async function descontarStock(inventarioId, cantidad = 1) {
  const ref = db.collection(COLECCIONES.INVENTARIO).doc(inventarioId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error('Prenda no encontrada');

    const actual = doc.data().cantidad;
    if (actual < cantidad) throw new Error('Stock insuficiente');

    const nuevaCantidad = actual - cantidad;
    const estado = calcularEstado(nuevaCantidad);

    tx.update(ref, {
      cantidad: nuevaCantidad,
      estado,
      ultimaActualizacion: new Date(),
    });

    // Notificar si se agotó
    if (nuevaCantidad === 0) {
      const data = doc.data();
      await notificarDuena(`🔴 AGOTADO: ${data.nombre} ${data.color} talla ${data.talla}`);
    } else if (nuevaCantidad <= UMBRAL_BAJO) {
      const data = doc.data();
      await notificarDuena(`🟡 POCAS UNIDADES (${nuevaCantidad}): ${data.nombre} ${data.color} talla ${data.talla}`);
    }

    return { cantidad: nuevaCantidad, estado };
  });
}

async function agregarStock(inventarioId, cantidad) {
  const ref = db.collection(COLECCIONES.INVENTARIO).doc(inventarioId);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error('Prenda no encontrada');
    const nueva = doc.data().cantidad + cantidad;
    tx.update(ref, { cantidad: nueva, estado: calcularEstado(nueva), ultimaActualizacion: new Date() });
    return nueva;
  });
}

async function crearPrenda(datos) {
  const { nombre, color, talla, cantidad, precio, categoria, imagen } = datos;
  const estado = calcularEstado(cantidad);

  return db.collection(COLECCIONES.INVENTARIO).add({
    nombre,
    nombreNormalizado: normalizar(nombre),
    color,
    colorNormalizado: normalizar(color),
    talla: talla.toUpperCase(),
    cantidad,
    precio: Number(precio),
    categoria: categoria || 'general',
    imagen: imagen || '',
    estado,
    creadoEn: new Date(),
    ultimaActualizacion: new Date(),
  });
}

async function actualizarPrenda(prendaId, datos) {
  const update = { ...datos, ultimaActualizacion: new Date() };
  if (datos.nombre) update.nombreNormalizado = normalizar(datos.nombre);
  if (datos.color) update.colorNormalizado = normalizar(datos.color);
  if (datos.cantidad !== undefined) update.estado = calcularEstado(datos.cantidad);
  return db.collection(COLECCIONES.INVENTARIO).doc(prendaId).update(update);
}

async function eliminarPrenda(prendaId) {
  return db.collection(COLECCIONES.INVENTARIO).doc(prendaId).delete();
}

// Búsqueda aproximada cuando el nombre exacto no coincide con el inventario.
// Usa Fuse.js (ESM) via dynamic import para evitar errores de módulo.
async function buscarFuzzy(prenda, color, talla) {
  const snap = await db.collection(COLECCIONES.INVENTARIO)
    .where('cantidad', '>', 0)
    .get();

  if (snap.empty) return null;

  const items = snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      // Campo combinado para búsqueda fuzzy
      _busqueda: `${d.nombreNormalizado} ${d.colorNormalizado}`,
    };
  });

  const { default: Fuse } = await import('fuse.js');

  const fuse = new Fuse(items, {
    keys: ['_busqueda'],
    threshold: 0.5,   // 0 = exacto, 1 = cualquier cosa — 0.5 es bastante permisivo
    includeScore: true,
    minMatchCharLength: 2,
  });

  const query = `${normalizar(prenda)} ${normalizar(color)}`;
  const resultados = fuse.search(query);

  if (!resultados.length) return null;

  // Preferir resultado con la talla correcta
  const conTalla = resultados.filter(r => r.item.talla === talla.toUpperCase());
  const mejor = conTalla[0] || resultados[0];

  // Rechazar si la confianza es muy baja (score > 0.45)
  if ((mejor.score || 1) > 0.45) return null;

  return {
    disponible: mejor.item.cantidad > 0,
    cantidad: mejor.item.cantidad,
    doc: mejor.item,
    score: mejor.score,
    aproximado: true,
    prendaCorregida: mejor.item.nombre,
    colorCorregido: mejor.item.color,
    tallaCorregida: mejor.item.talla,
  };
}

function calcularEstado(cantidad) {
  if (cantidad === 0) return 'agotado';
  if (cantidad <= UMBRAL_BAJO) return 'bajo';
  return 'disponible';
}

function normalizar(texto) {
  return texto.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

module.exports = {
  obtenerInventario,
  obtenerPrenda,
  verificarStock,
  buscarFuzzy,
  obtenerAlternativas,
  descontarStock,
  agregarStock,
  crearPrenda,
  actualizarPrenda,
  eliminarPrenda,
  calcularEstado,
};
