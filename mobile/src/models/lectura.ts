/** Una parte del convenio para escuchar: encabezado, las partes, cada cláusula o las firmas. */
export interface SeccionLectura {
  id: number;
  titulo: string;
  /** Texto tal cual está en el PDF (se muestra en pantalla mientras se escucha). */
  texto: string;
  /** El mismo texto preparado para la voz (sin mayúsculas sostenidas, abreviaturas expandidas…). */
  voz: string;
}

/** GET /mobile/convenios/:id/lectura: el texto del PDF del convenio, dividido en secciones. */
export interface LecturaConvenio {
  convenio: { id: number; codigo: string; titulo: string };
  /** De qué PDF sale el texto: el firmado (si ya se firmó) o el generado con la ficha. */
  documento: 'firmado' | 'generado';
  secciones: SeccionLectura[];
  palabras: number;
  /** Duración aproximada a velocidad normal. */
  minutos: number;
}
