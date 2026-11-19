export const formatearMoneda = (monto) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(monto || 0);
};

export const formatearFechaHora = (fechaISO) => {
  return new Date(fechaISO).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};
