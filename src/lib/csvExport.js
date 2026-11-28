export const descargarCSV = (nombreArchivo, encabezados, filas) => {
  const escaparCelda = (valor) => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const contenido = [
    encabezados.map(escaparCelda).join(','),
    ...filas.map((fila) => fila.map(escaparCelda).join(',')),
  ].join('\n');

  // BOM UTF-8 para que Excel muestre tildes y caracteres especiales correctamente
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${nombreArchivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
