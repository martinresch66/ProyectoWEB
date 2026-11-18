import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Arma el PDF con el texto del convenio (el documento que se lee y se firma en la app).
 * Los datos de prueba no traen archivos reales, así que el PDF se genera a partir de la ficha:
 * partes, objeto, vigencia, responsables, cláusulas y el espacio para las firmas.
 */

const TIPOS = {
  marco: 'Convenio marco',
  especifico: 'Convenio específico',
  adenda: 'Adenda',
  pasantia: 'Convenio de pasantía',
};

/** Cómo se nombra el convenio padre según el tipo de vínculo. */
const VINCULOS = {
  especifico_de: 'Convenio específico de',
  adenda_de: 'Adenda de',
  renovacion_de: 'Renovación de',
  sustitucion_de: 'Sustituye a',
};

const NUMEROS = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'UNDÉCIMA', 'DUODÉCIMA'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Página A4 en puntos y márgenes.
const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 56;
const AZUL = rgb(0.11, 0.31, 0.85);
const GRIS = rgb(0.4, 0.42, 0.46);
const NEGRO = rgb(0.07, 0.09, 0.15);

/** "2026-12-02" → "2 de diciembre de 2026". */
function fechaLarga(valor) {
  if (!valor) return null;
  const [a, m, d] = valor.slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** Las fuentes estándar de PDF solo tienen caracteres latinos: el resto se reemplaza para que no falle. */
function seguro(texto) {
  return String(texto ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

/** Escribe en el PDF con salto de línea y de página automáticos. */
class Escritor {
  constructor(doc, fuentes) {
    this.doc = doc;
    this.f = fuentes;
    this.nuevaPagina();
  }

  nuevaPagina() {
    this.pagina = this.doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }

  espacio(alto) {
    if (this.y - alto < MARGEN + 30) this.nuevaPagina();
  }

  /** Párrafo con ajuste de línea. */
  parrafo(texto, { fuente = this.f.normal, tam = 10.5, color = NEGRO, interlineado = 1.45, sangria = 0, despues = 8 } = {}) {
    const ancho = ANCHO - 2 * MARGEN - sangria;
    const lineas = [];
    let actual = '';
    for (const palabra of seguro(texto).split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tam) > ancho && actual) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    if (actual) lineas.push(actual);

    for (const linea of lineas) {
      this.espacio(tam * interlineado);
      this.pagina.drawText(linea, { x: MARGEN + sangria, y: this.y - tam, size: tam, font: fuente, color });
      this.y -= tam * interlineado;
    }
    this.y -= despues;
  }

  /** Cláusula: título en negrita y texto. */
  clausula(numero, titulo, texto) {
    this.espacio(40);
    this.parrafo(`${NUMEROS[numero] ?? numero + 1} - ${titulo.toUpperCase()}`, { fuente: this.f.negrita, tam: 10.5, despues: 2 });
    this.parrafo(texto);
  }

  linea() {
    this.espacio(12);
    this.pagina.drawLine({
      start: { x: MARGEN, y: this.y },
      end: { x: ANCHO - MARGEN, y: this.y },
      thickness: 0.6,
      color: rgb(0.8, 0.82, 0.86),
    });
    this.y -= 14;
  }
}

/** Genera el PDF del convenio. Recibe la ficha completa (conveniosService.obtener). Devuelve los bytes. */
export async function generarPdfConvenio(c) {
  const doc = await PDFDocument.create();
  const fuentes = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    cursiva: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const tipo = TIPOS[c.tipo] ?? 'Convenio';
  const unidad = c.unidad?.nombre ?? 'la unidad académica correspondiente';

  doc.setTitle(`${c.codigo} - ${seguro(c.titulo)}`);
  doc.setSubject(tipo);
  doc.setAuthor('Universidad Nacional de La Pampa');
  doc.setCreator('Sistema de Gestión de Convenios UNLPam');
  doc.setKeywords([c.codigo, c.tipo, c.estado]);

  const e = new Escritor(doc, fuentes);

  // Encabezado
  e.parrafo('UNIVERSIDAD NACIONAL DE LA PAMPA', { fuente: fuentes.negrita, tam: 10, color: GRIS, despues: 0 });
  e.parrafo(unidad, { tam: 9, color: GRIS, despues: 4 });
  e.linea();
  e.parrafo(tipo.toUpperCase(), { fuente: fuentes.negrita, tam: 10, color: AZUL, despues: 2 });
  e.parrafo(c.titulo, { fuente: fuentes.negrita, tam: 16, interlineado: 1.3, despues: 4 });
  e.parrafo(`Código ${c.codigo} · Versión ${c.version ?? 1}`, { tam: 9.5, color: GRIS, despues: 2 });
  for (const v of c.vinculos_origen ?? []) {
    if (!v.convenio_destino) continue;
    const etiqueta = VINCULOS[v.tipo_vinculo] ?? 'Relacionado con';
    e.parrafo(`${etiqueta}: ${v.convenio_destino.codigo} - ${v.convenio_destino.titulo}`, { tam: 9.5, color: GRIS, despues: 2 });
  }
  e.y -= 10;

  // Partes
  const partes = c.partes ?? [];
  e.parrafo(
    `Entre las partes que se detallan a continuación, en adelante "LAS PARTES", se celebra el presente ${tipo.toLowerCase()}, sujeto a las cláusulas que siguen:`,
  );
  partes.forEach((p, i) => {
    const datos = [
      p.cuit_cuil && `CUIT ${p.cuit_cuil}`,
      p.direccion && `con domicilio en ${p.direccion}`,
      p.pivot?.rol_en_convenio && `en carácter de ${p.pivot.rol_en_convenio}`,
    ].filter(Boolean);
    e.parrafo(`${i + 1}. ${p.nombre}${datos.length ? `, ${datos.join(', ')}` : ''}.`, { sangria: 14, despues: 4 });
  });
  e.y -= 6;

  // Cláusulas
  const responsables = (c.personas ?? []).map((p) => `${p.nombre} ${p.apellido} (${p.pivot?.rol ?? 'responsable'})`);
  const desde = fechaLarga(c.fecha_inicio);
  const hasta = fechaLarga(c.fecha_fin);
  const clausulas = [
    ['Objeto', `${c.resumen ?? 'El objeto del presente es establecer un marco de cooperación entre LAS PARTES.'} LAS PARTES se comprometen a colaborar de buena fe para cumplir este objeto, con los recursos y en los plazos que se acuerden.`],
    [
      'Vigencia',
      `El presente tendrá vigencia ${desde ? `desde el ${desde}` : 'desde la fecha de su firma'}${hasta ? ` hasta el ${hasta}` : ' por tiempo indeterminado'}. Podrá renovarse por acuerdo expreso de LAS PARTES, formalizado por escrito antes de su vencimiento.`,
    ],
    [
      'Unidad responsable',
      `La ejecución y el seguimiento del presente estarán a cargo de ${unidad}${responsables.length ? `, que designa como responsables a ${responsables.join(' y ')}` : ''}.`,
    ],
  ];
  if (c.detalle_pasantia) {
    const p = c.detalle_pasantia;
    const persona = (x) => (x ? `${x.nombre} ${x.apellido}` : 'a designar');
    clausulas.push([
      'Pasantía',
      `La pasantía será realizada por ${persona(p.estudiante)}, con la tutoría académica de ${persona(p.tutor_academico)} y la tutoría institucional de ${persona(p.tutor_institucion)}, conforme a la Ley N° 26.427 y a la reglamentación de la Universidad.`,
    ]);
  }
  clausulas.push(
    ['Obligaciones de las partes', 'Cada una de LAS PARTES aportará los recursos humanos, técnicos y materiales necesarios para cumplir las actividades acordadas, y mantendrá informada a la otra sobre el avance de los trabajos mediante informes periódicos.'],
    ['Confidencialidad', 'LAS PARTES se obligan a mantener la confidencialidad de la información a la que accedan con motivo del presente, y a no utilizarla para fines distintos de los aquí previstos, aun después de su finalización.'],
    ['Propiedad intelectual', 'Los resultados que se obtengan en el marco del presente serán de propiedad común de LAS PARTES, en proporción a sus aportes, y podrán ser publicados de común acuerdo citando a ambas instituciones.'],
    [
      'Rescisión',
      `Cualquiera de LAS PARTES podrá rescindir el presente sin expresión de causa, comunicándolo a la otra por escrito con una anticipación mínima de ${c.dias_preaviso ?? 30} días. La rescisión no afectará las actividades en curso, que continuarán hasta su finalización.`,
    ],
    ['Responsabilidad', 'Cada una de LAS PARTES será responsable de su personal y de los daños que este pudiera ocasionar en el cumplimiento del presente, sin que exista relación laboral entre el personal de una parte y la otra.'],
    ['Solución de controversias', 'LAS PARTES resolverán de común acuerdo las diferencias que pudieran surgir. De no ser posible, se someterán a la jurisdicción de los Tribunales Federales de la ciudad de Santa Rosa, La Pampa.'],
    ['Domicilios', 'LAS PARTES constituyen domicilio en los indicados al comienzo, donde serán válidas todas las notificaciones que se cursen con motivo del presente.'],
  );
  clausulas.forEach(([titulo, texto], i) => e.clausula(i, titulo, texto));

  // Cierre y firmas
  e.y -= 6;
  e.parrafo(
    `En prueba de conformidad, se firman ${Math.max(partes.length, 2)} ejemplares de un mismo tenor y a un solo efecto, en la ciudad de Santa Rosa, La Pampa.`,
  );
  e.y -= 30;
  for (const p of partes.length ? partes : [{ nombre: 'Universidad Nacional de La Pampa' }]) {
    e.espacio(80);
    e.y -= 40;
    e.pagina.drawLine({ start: { x: MARGEN, y: e.y }, end: { x: MARGEN + 220, y: e.y }, thickness: 0.8, color: NEGRO });
    e.y -= 14;
    e.parrafo(p.nombre, { fuente: fuentes.negrita, tam: 10, despues: 0 });
    e.parrafo('Firma y aclaración', { fuente: fuentes.cursiva, tam: 9, color: GRIS, despues: 10 });
  }

  // Pie de página en todas las hojas
  const paginas = doc.getPages();
  paginas.forEach((pagina, i) => {
    const texto = seguro(`${c.codigo} · Página ${i + 1} de ${paginas.length} · Sistema de Gestión de Convenios UNLPam`);
    const tam = 8;
    const ancho = fuentes.normal.widthOfTextAtSize(texto, tam);
    pagina.drawText(texto, { x: (ANCHO - ancho) / 2, y: MARGEN / 2, size: tam, font: fuentes.normal, color: GRIS });
  });

  return doc.save();
}