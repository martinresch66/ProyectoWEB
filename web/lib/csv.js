// Generación de CSV con las celdas neutralizadas para que Excel no ejecute fórmulas.
// (El backend debe hacer lo mismo en su exportación; esto lo usa el modo simulado.)

const PELIGROSOS = ["=", "+", "-", "@", "\t", "\r"];

export function neutralizarCelda(valor) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return PELIGROSOS.some((c) => texto.startsWith(c)) ? `'${texto}` : texto;
}

export function generarCsv(columnas, filas) {
  const celda = (v) => `"${neutralizarCelda(v).replace(/"/g, '""')}"`;
  const lineas = [columnas.map((c) => celda(c.titulo)).join(";")];
  for (const fila of filas) {
    lineas.push(columnas.map((c) => celda(c.valor(fila))).join(";"));
  }
  // BOM para que Excel en español abra bien los acentos.
  return "﻿" + lineas.join("\r\n");
}
