const { db, COLECCIONES } = require('../firebase');

// Genera código único tipo "ROC-A7X2" — memorable y corto para escribir en live
function generarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I, O para evitar confusión
  const numeros = '23456789';
  const parte1 = Array.from({ length: 2 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  const parte2 = Array.from({ length: 2 }, () => numeros[Math.floor(Math.random() * numeros.length)]).join('');
  return `ROC-${parte1}${parte2}`;
}

async function generarCodigoUnico() {
  let codigo;
  let existe = true;
  let intentos = 0;

  while (existe && intentos < 20) {
    codigo = generarCodigo();
    const snap = await db.collection(COLECCIONES.CLIENTES)
      .where('codigo', '==', codigo)
      .where('activo', '==', true)
      .get();
    existe = !snap.empty;
    intentos++;
  }

  if (intentos >= 20) throw new Error('No se pudo generar código único');
  return codigo;
}

module.exports = { generarCodigoUnico };
