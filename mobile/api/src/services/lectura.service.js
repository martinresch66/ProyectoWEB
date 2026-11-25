import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { conveniosService } from './convenios.service.js';
import { firmaService } from './firma.service.js';
import { generarPdfConvenio } from './pdfConvenio.service.js';

const require = createRequire(import.meta.url);
const carpetaPdfjs = path.dirname(require.resolve('pdfjs-dist/package.json'));
/** Fuentes estándar de PDF (Helvetica…): pdfjs las necesita para leer el texto en el servidor. */
const FUENTES = `${pathToFileURL(path.join(carpetaPdfjs, 'standard_fonts')).href}/`;

/** pdfjs se carga recién la primera vez que se usa (es pesado y solo lo usa esta función). */
let pdfjs = null;
const cargarPdfjs = async () => (pdfjs ??= await import('pdfjs-dist/legacy/build/pdf.mjs'));

const ORDINALES = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'UNDÉCIMA', 'DUODÉCIMA'];
const CLAUSULA = new RegExp(`^(${ORDINALES.join('|')}) - (.+)$`);

/** Líneas que no son parte del texto del convenio: pie de página, leyenda y sello de la firma. */
const RUIDO = [
  /· Página \d+ de \d+ ·/,
  /^Firmado digitalmente por .+ · latitud/,
  /^FIRMADO DIGITALMENTE$/,
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/,
  /^-?\d+\.\d+, -?\d+\.\d+$/,
];

/** "SEGUNDA" → "Segunda"; "OBJETO DEL CONVENIO" → "Objeto del convenio". */
const oracion = (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

/** Saca el texto del PDF, línea por línea, en el orden en que se lee. */
async function leerLineas(bytes) {
  const { getDocument } = await cargarPdfjs();
  const tarea = getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl: FUENTES,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });
  const lineas = [];
  try {
    const doc = await tarea.promise;
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const { items } = await pagina.getTextContent();
      let actual = '';
      for (const item of items) {
        actual += item.str ?? '';
        if (item.hasEOL) {
          lineas.push({ pagina: n, texto: actual.trim() });
          actual = '';
        }
      }
      if (actual.trim()) lineas.push({ pagina: n, texto: actual.trim() });
    }
  } finally {
    await tarea.destroy();
  }
  return lineas.filter((l) => l.texto && !RUIDO.some((r) => r.test(l.texto)));
}

/**
 * Texto adaptado para la voz del celular: las palabras en MAYÚSCULAS se pasan a minúsculas
 * (si no, algunas voces las deletrean) y se expanden abreviaturas y símbolos.
 */
function paraVoz(texto) {
  return texto
    .replace(/\b([A-Z]{2,})-(\d{4})-(\d{3})\b/g, (_, letras, anio, numero) => `${letras === 'CONV' ? 'convenio' : letras} ${anio} ${numero}`)
    .replace(/\bN[°º]\s?/g, 'número ')
    .replace(/±/g, 'más o menos ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/(\d) m\b/g, '$1 metros')
    // Palabras enteras en mayúsculas (con tildes): "LAS PARTES", "DE LA PAMPA", "CUIT".
    .replace(/(?<!\p{L})\p{Lu}{2,}(?!\p{L})/gu, (palabra) => palabra.toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

/** Junta las líneas en párrafos (el PDF corta las líneas por ancho, no por oración). */
const unir = (lineas) => lineas.map((l) => l.texto).join(' ').replace(/\s+/g, ' ').trim();

/** Para el encabezado y las firmas: cada línea es un dato suelto, así que se separan con punto (pausa al leer). */
function unirConPausas(lineas) {
  const datos = [];
  for (const { texto } of lineas) {
    const t = texto.trim();
    if (!t) continue;
    // Si empieza en minúscula, es la continuación de una oración que el PDF cortó en dos líneas.
    // También si la línea anterior quedó cortada en un guion o una coma.
    if (datos.length && (/^\p{Ll}/u.test(t) || /[-,]$/.test(datos[datos.length - 1]))) datos[datos.length - 1] += ` ${t}`;
    else datos.push(t);
  }
  return datos.map((t) => (/[.:;,)]$/.test(t) ? t : `${t}.`)).join(' ');
}

/**
 * Divide el texto en secciones para escucharlas de a una: encabezado, partes, cada cláusula y firmas.
 * Si el PDF no tiene el formato de los convenios del sistema (por ejemplo, uno subido desde la web),
 * se divide por página.
 */
function dividir(lineas) {
  const inicioPartes = lineas.findIndex((l) => l.texto.startsWith('Entre las partes'));
  const clausulas = lineas.map((l, i) => ({ i, m: l.texto.match(CLAUSULA) })).filter((x) => x.m);
  const inicioFirmas = lineas.findIndex((l) => l.texto.startsWith('En prueba de conformidad'));

  if (!clausulas.length) {
    const paginas = [...new Set(lineas.map((l) => l.pagina))];
    return paginas.map((n) => ({ titulo: `Página ${n}`, texto: unir(lineas.filter((l) => l.pagina === n)) }));
  }

  const secciones = [];
  const primera = clausulas[0].i;
  if (inicioPartes > 0) secciones.push({ titulo: 'Encabezado', texto: unirConPausas(lineas.slice(0, inicioPartes)) });
  secciones.push({ titulo: 'Las partes', texto: unir(lineas.slice(Math.max(inicioPartes, 0), primera)) });
  clausulas.forEach(({ i, m }, k) => {
    const fin = k + 1 < clausulas.length ? clausulas[k + 1].i : inicioFirmas > i ? inicioFirmas : lineas.length;
    secciones.push({ titulo: `${oracion(m[1])}: ${oracion(m[2])}`, texto: unir(lineas.slice(i + 1, fin)) });
  });
  if (inicioFirmas > 0) {
    const firmas = lineas.slice(inicioFirmas).map((l) => (l.texto === 'Firma y aclaración' ? { ...l, texto: '(firma pendiente).' } : l));
    secciones.push({ titulo: 'Firmas', texto: unirConPausas(firmas) });
  }
  return secciones.filter((s) => s.texto);
}

/**
 * "Escuchar el convenio" (innovación): el texto del mismo PDF que se lee y se firma
 * (el firmado, si existe; si no, el generado con la ficha), dividido en secciones y preparado para la voz.
 */
export const lecturaService = {
  async obtener(usuario, convenioId) {
    // 404 si no existe o no está en el alcance del usuario.
    const ficha = conveniosService.obtener(usuario, convenioId);
    const firmado = await firmaService.pdfGuardado(ficha.id);
    const bytes = firmado ?? Buffer.from(await generarPdfConvenio(ficha));
    const secciones = dividir(await leerLineas(bytes)).map((s, i) => ({
      id: i + 1,
      titulo: s.titulo,
      texto: s.texto,
      voz: paraVoz(`${s.titulo}. ${s.texto}`),
    }));
    const palabras = secciones.reduce((total, s) => total + s.voz.split(' ').length, 0);
    return {
      convenio: { id: ficha.id, codigo: ficha.codigo, titulo: ficha.titulo },
      documento: firmado ? 'firmado' : 'generado',
      secciones,
      palabras,
      // A velocidad normal, una voz lee unas 150 palabras por minuto.
      minutos: Math.max(1, Math.round(palabras / 150)),
    };
  },
};
