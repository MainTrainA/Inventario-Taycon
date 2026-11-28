export const descargarCSV = (nombreArchivo, encabezados, filas) => {
  const separador = ';';

  const escaparCelda = (valor) => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    if (texto.includes(separador) || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const contenido = [
    encabezados.map(escaparCelda).join(separador),
    ...filas.map((fila) => fila.map(escaparCelda).join(separador)),
  ].join('\r\n');

  // BOM UTF-8 para que Excel en español reconozca tildes y separe las columnas automáticamente
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
