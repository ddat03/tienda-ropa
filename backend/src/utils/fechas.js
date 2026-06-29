const { addDays, differenceInDays, isAfter, format } = require('date-fns');

function calcularFechaVencimiento(diasVigencia = 15) {
  return addDays(new Date(), diasVigencia);
}

function diasRestantes(fechaVencimiento) {
  const hoy = new Date();
  const vence = fechaVencimiento instanceof Date
    ? fechaVencimiento
    : fechaVencimiento.toDate(); // Firestore Timestamp
  return differenceInDays(vence, hoy);
}

function estaVencido(fechaVencimiento) {
  const vence = fechaVencimiento instanceof Date
    ? fechaVencimiento
    : fechaVencimiento.toDate();
  return isAfter(new Date(), vence);
}

function formatearFecha(fecha) {
  const d = fecha instanceof Date ? fecha : fecha.toDate();
  return format(d, 'dd/MM/yyyy');
}

module.exports = { calcularFechaVencimiento, diasRestantes, estaVencido, formatearFecha };
