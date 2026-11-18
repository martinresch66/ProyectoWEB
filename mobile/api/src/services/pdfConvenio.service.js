import { LineCapStyle, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Arma el PDF con el texto del convenio (el documento que se lee y se firma en la app).
 * Los datos de prueba no traen archivos reales, así que el PDF se genera a partir de la ficha:
 * partes, objeto, vigencia, responsables, cláusulas y el espacio para las firmas.
 * Si recibe una firma, la estampa: trazo manuscrito sobre la línea de la universidad, fecha, hora,
 * latitud y longitud, un sello en la primera hoja y una leyenda al pie de todas las hojas.
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
const VERDE = rgb(0.09, 0.4, 0.2);
const TINTA = rgb(0.08, 0.16, 0.45);

const ROLES = { admin: 'Administración', gestion: 'Gestión', revision: 'Revisión', consulta: 'Consulta' };
const VERIFICACION = { huella: 'huella digital', rostro: 'reconocimiento facial', biometria: 'biometría' };

/** "2026-12-02" → "2 de diciembre de 2026". */
function fechaLarga(valor) {
  if (!valor) return null;
  const [a, m, d] = valor.slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** Fecha y hora de Argentina de un instante ISO: { fecha: "18/11/2026", hora: "14:32:10" }. */
function fechaHora(iso) {
  const partes = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return { fecha: `${p.day}/${p.month}/${p.year}`, hora: `${p.hour}:${p.minute}:${p.second}` };
}

/** "latitud -36.616200, longitud -64.283900 (precisión ±12 m)" */
function textoUbicacion(f) {
  const precision = f.precision_m !== null && f.precision_m !== undefined ? ` (precisión ±${f.precision_m} m)` : '';
  return `latitud ${f.latitud.toFixed(6)}, longitud ${f.longitud.toFixed(6)}${precision}`;
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

/**
 * Dibuja la firma manuscrita (los trazos que se hicieron en el celular) dentro de una caja,
 * sin deformarla: se escala para que entre y queda apoyada sobre la línea de firma.
 */
function dibujarTrazado(pagina, { trazos }, caja) {
  const puntos = trazos.flat();
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const ancho = Math.max(Math.max(...xs) - minX, 1);
  const alto = Math.max(Math.max(...ys) - minY, 1);
  const escala = Math.min(caja.ancho / ancho, caja.alto / alto);
  const abajo = caja.alto - alto * escala; // apoyada sobre la línea

  const punto = ([x, y]) => `${((x - minX) * escala).toFixed(2)} ${((y - minY) * escala + abajo).toFixed(2)}`;
  const camino = trazos
    .map((t) => (t.length === 1 ? `M ${punto(t[0])} l 0.6 0` : `M ${punto(t[0])} L ${t.slice(1).map(punto).join(' L ')}`))
    .join(' ');
  // En drawSvgPath, (x, y) es la esquina superior izquierda y el eje y va hacia abajo, como en el celular.
  pagina.drawSvgPath(camino, {
    x: caja.x,
    y: caja.y + caja.alto,
    borderColor: TINTA,
    borderWidth: 1.4,
    borderLineCap: LineCapStyle.Round,
  });
}

/** Bloque de firma de la universidad ya firmado: trazo, línea, firmante, fecha, hora y lugar. */
function bloqueFirmado(e, parte, firma) {
  const { fecha, hora } = fechaHora(firma.fecha);
  const dato = { tam: 8.5, color: GRIS, despues: 0 };
  e.espacio(150);
  e.y -= 70;
  dibujarTrazado(e.pagina, firma.trazado, { x: MARGEN + 8, y: e.y + 3, ancho: 200, alto: 60 });
  e.pagina.drawLine({ start: { x: MARGEN, y: e.y }, end: { x: MARGEN + 220, y: e.y }, thickness: 0.8, color: NEGRO });
  e.y -= 14;
  e.parrafo(parte.nombre, { fuente: e.f.negrita, tam: 10, despues: 0 });
  e.parrafo(`${firma.firmante.nombre} · ${ROLES[firma.firmante.rol] ?? firma.firmante.rol}`, { tam: 9, despues: 2 });
  e.parrafo(`Firmado digitalmente el ${fecha} a las ${hora} (hora de Argentina).`, dato);
  e.parrafo(`Lugar de la firma: ${textoUbicacion(firma)}.`, dato);
  e.parrafo(
    `Identidad verificada con ${VERIFICACION[firma.verificacion] ?? firma.verificacion} en el celular. Firma manuscrita hecha en la pantalla.`,
    { ...dato, despues: 10 },
  );
}

/** Sello "FIRMADO DIGITALMENTE" arriba a la derecha de la primera hoja. */
function sello(pagina, fuentes, firma) {
  const { fecha, hora } = fechaHora(firma.fecha);
  const ancho = 136;
  const alto = 38;
  const x = ANCHO - MARGEN - ancho;
  const y = ALTO - MARGEN - 26;
  pagina.drawRectangle({ x, y, width: ancho, height: alto, color: rgb(0.94, 0.99, 0.95), borderColor: VERDE, borderWidth: 1.2 });
  const lineas = [
    { texto: 'FIRMADO DIGITALMENTE', fuente: fuentes.negrita, tam: 8.5, dy: 13 },
    { texto: `${fecha} ${hora.slice(0, 5)}`, fuente: fuentes.normal, tam: 8, dy: 24 },
    { texto: `${firma.latitud.toFixed(5)}, ${firma.longitud.toFixed(5)}`, fuente: fuentes.normal, tam: 7, dy: 34 },
  ];
  for (const l of lineas) {
    const anchoTexto = l.fuente.widthOfTextAtSize(l.texto, l.tam);
    pagina.drawText(l.texto, { x: x + (ancho - anchoTexto) / 2, y: y + alto - l.dy, size: l.tam, font: l.fuente, color: VERDE });
  }
}

/**
 * Genera el PDF del convenio. Recibe la ficha completa (conveniosService.obtener). Devuelve los bytes.
 * Opcional: `firma` = { fecha, firmante, latitud, longitud, precision_m, verificacion, trazado } para estamparla.
 */
export async function generarPdfConvenio(c, { firma = null } = {}) {
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
  doc.setKeywords([c.codigo, c.tipo, c.estado, ...(firma ? ['firmado digitalmente'] : [])]);

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
  const firmantes = partes.length ? partes : [{ nombre: 'Universidad Nacional de La Pampa' }];
  // La firma de la app es la de la universidad: va sobre su línea (o sobre la primera, si no figura como parte).
  const firmaDe = firma ? (firmantes.find((p) => /universidad nacional de la pampa/i.test(p.nombre)) ?? firmantes[0]) : null;
  for (const p of firmantes) {
    if (p === firmaDe) {
      bloqueFirmado(e, p, firma);
      continue;
    }
    e.espacio(80);
    e.y -= 40;
    e.pagina.drawLine({ start: { x: MARGEN, y: e.y }, end: { x: MARGEN + 220, y: e.y }, thickness: 0.8, color: NEGRO });
    e.y -= 14;
    e.parrafo(p.nombre, { fuente: fuentes.negrita, tam: 10, despues: 0 });
    e.parrafo('Firma y aclaración', { fuente: fuentes.cursiva, tam: 9, color: GRIS, despues: 10 });
  }

  // Pie de página en todas las hojas (y, si está firmado, la leyenda de la firma arriba del pie)
  const paginas = doc.getPages();
  const centrado = (pagina, texto, y, tam, color) => {
    let tamano = tam;
    while (fuentes.normal.widthOfTextAtSize(texto, tamano) > ANCHO - 2 * MARGEN && tamano > 5) tamano -= 0.5;
    const ancho = fuentes.normal.widthOfTextAtSize(texto, tamano);
    pagina.drawText(texto, { x: (ANCHO - ancho) / 2, y, size: tamano, font: fuentes.normal, color });
  };
  const leyenda = firma
    ? seguro(
        `Firmado digitalmente por ${firma.firmante.nombre} el ${fechaHora(firma.fecha).fecha} a las ${fechaHora(firma.fecha).hora} · ${textoUbicacion(firma)}`,
      )
    : null;
  paginas.forEach((pagina, i) => {
    centrado(pagina, seguro(`${c.codigo} · Página ${i + 1} de ${paginas.length} · Sistema de Gestión de Convenios UNLPam`), MARGEN / 2, 8, GRIS);
    if (leyenda) centrado(pagina, leyenda, MARGEN / 2 + 11, 7.5, VERDE);
  });
  if (firma) sello(paginas[0], fuentes, firma);

  return doc.save();
}