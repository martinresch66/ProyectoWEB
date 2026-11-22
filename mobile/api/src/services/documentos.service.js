import { EncryptedPDFError, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { documentosRepository } from '../repositories/documentos.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { guardarPdf, leerArchivo, sha256 } from '../utils/archivos.js';
import { HttpError } from '../utils/HttpError.js';
import { randomToken } from '../utils/crypto.js';
import { conveniosService } from './convenios.service.js';

/** Roles que pueden subir documentos (igual que DocumentoController de Laravel). Gestión, solo de su unidad. */
export const ROLES_QUE_SUBEN = ['admin', 'gestion', 'revision'];
/** Tipos que se pueden subir desde la app (el convenio firmado lo genera la firma, no se sube). */
export const TIPOS_SUBIDA = ['anexo', 'dictamen', 'resolucion', 'acta_pasantia', 'otro'];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB, como pide el TPI y valida Laravel

const PRODUCTOR = 'Sistema de Gestión de Convenios UNLPam (API de la app móvil)';
const PALABRA_CLAVE = 'subido-desde-app-unlpam';

/**
 * Campos de la marca, como quedan en los metadatos del PDF (diccionario Info).
 * Se pueden ver en cualquier lector de PDF: Propiedades del documento > Personalizado.
 */
const CAMPOS = {
  marca: 'UNLPam-Marca',
  id_marca: 'UNLPam-MarcaId',
  usuario: 'UNLPam-Usuario',
  usuario_id: 'UNLPam-UsuarioId',
  usuario_email: 'UNLPam-UsuarioEmail',
  usuario_rol: 'UNLPam-UsuarioRol',
  convenio: 'UNLPam-Convenio',
  convenio_id: 'UNLPam-ConvenioId',
  tipo_documento: 'UNLPam-TipoDocumento',
  nombre_original: 'UNLPam-NombreOriginal',
  fecha: 'UNLPam-FechaHora',
  fecha_local: 'UNLPam-FechaHoraArgentina',
  paginas: 'UNLPam-Paginas',
  hash_original: 'UNLPam-HashOriginal',
  dispositivo: 'UNLPam-Dispositivo',
};

/** "22/11/2026, 18:05:12" en hora de Argentina. */
function fechaLocal(fecha) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(fecha);
}

/** Nombre de archivo seguro: sin carpetas ni caracteres raros, terminado en .pdf. */
function limpiarNombre(nombre, porDefecto) {
  const base = String(nombre ?? '')
    .split(/[\\/]/)
    .pop()
    .replace(/[^\p{L}\p{N} ._()-]/gu, '')
    .trim()
    .slice(0, 180);
  const conExtension = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  return base ? conExtension : porDefecto;
}

/** Valida que sea un PDF de verdad (por su contenido, no por el nombre) y de hasta 20 MB. */
function validarArchivo(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new HttpError(422, 'Elegí un archivo PDF para subir.', { archivo: ['Falta el archivo.'] });
  }
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'El archivo supera el máximo permitido (20 MB).');
  // Los PDF empiezan con "%PDF-" (en los primeros bytes): así no se acepta otro archivo renombrado a .pdf.
  if (!bytes.subarray(0, 1024).includes('%PDF-')) {
    throw new HttpError(422, 'El archivo no es un PDF válido.', { archivo: ['Solo se pueden subir archivos PDF.'] });
  }
}

/** Escribe la marca en los metadatos del PDF. */
function escribirMarca(pdf, marca, convenio) {
  pdf.setProducer(PRODUCTOR);
  pdf.setModificationDate(new Date(marca.fecha));
  const claves = (pdf.getKeywords() ?? '').split(/[\s,;]+/).filter(Boolean);
  pdf.setKeywords([...new Set([...claves, PALABRA_CLAVE, convenio.codigo, marca.tipo_documento])]);
  // Campos propios en el diccionario Info del PDF. PDFHexString guarda bien tildes y eñes.
  const info = pdf.getInfoDict();
  for (const [campo, clave] of Object.entries(CAMPOS)) {
    info.set(PDFName.of(clave), PDFHexString.fromText(String(marca[campo] ?? '')));
  }
}

/** Lee la marca de los metadatos de un PDF. Devuelve null si el PDF no tiene marca de la app. */
async function leerMarca(bytes) {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const info = pdf.getInfoDict();
    const leer = (clave) => info.lookup(PDFName.of(clave))?.decodeText?.() ?? null;
    if (!leer(CAMPOS.marca)) return null;
    const marca = Object.fromEntries(Object.entries(CAMPOS).map(([campo, clave]) => [campo, leer(clave)]));
    return { ...marca, productor: pdf.getProducer() ?? null };
  } catch {
    return null;
  }
}

/** Lo que ve la app de un documento (nunca la ruta del archivo en el servidor). */
function aRespuesta(d) {
  return {
    id: d.id,
    convenio_id: d.convenio_id,
    tipo_documento: d.tipo_documento,
    nombre_original: d.nombre_original,
    tamano_bytes: Number(d.tamano_bytes),
    hash_sha256: d.hash_sha256,
    version: Number(d.version),
    creado_en: d.creado_en,
    usuario: usuariosRepository.resumen(d.subido_por),
  };
}

/** Busca el documento y controla que el usuario pueda ver su convenio (si no, 404). */
function documentoVisible(usuario, documentoId) {
  const documento = documentosRepository.findById(documentoId);
  if (!documento) throw new HttpError(404, 'No encontramos este documento.');
  conveniosService.obtener(usuario, documento.convenio_id);
  return documento;
}

/**
 * Subir documentación (T2): PDFs anexos a un convenio. La app manda el archivo y la API
 * le pone la marca en los metadatos (usuario, convenio, fecha y hora…), lo guarda y lo registra.
 */
export const documentosService = {
  async subir(usuario, convenioId, bytes, { tipo, nombre, ip = null, agente = null } = {}) {
    if (!ROLES_QUE_SUBEN.includes(usuario.rol)) {
      throw new HttpError(403, 'Tu rol no puede subir documentos.');
    }
    // 404 si el convenio no existe o no está en su alcance (gestión solo sube a los de su unidad).
    const convenio = conveniosService.obtener(usuario, convenioId);
    const tipoDocumento = tipo ?? 'anexo';
    if (!TIPOS_SUBIDA.includes(tipoDocumento)) {
      throw new HttpError(422, 'Tipo de documento inválido.', { tipo: [`Opciones: ${TIPOS_SUBIDA.join(', ')}.`] });
    }
    validarArchivo(bytes);

    let pdf;
    let paginas;
    try {
      pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      paginas = pdf.getPageCount(); // si el PDF está roto, falla acá
    } catch (error) {
      if (error instanceof EncryptedPDFError) throw new HttpError(422, 'El PDF está protegido con contraseña: subilo sin protección.');
      throw new HttpError(422, 'El PDF está dañado y no se puede abrir.');
    }

    const ahora = new Date();
    const nombreOriginal = limpiarNombre(nombre, `${convenio.codigo}-${tipoDocumento}.pdf`);
    const marca = {
      marca: 'Subido desde la app móvil',
      id_marca: randomToken(12),
      usuario: usuario.nombre,
      usuario_id: usuario.id,
      usuario_email: usuario.email,
      usuario_rol: usuario.rol,
      convenio: `${convenio.codigo} - ${convenio.titulo}`,
      convenio_id: convenio.id,
      tipo_documento: tipoDocumento,
      nombre_original: nombreOriginal,
      fecha: ahora.toISOString(),
      fecha_local: fechaLocal(ahora),
      paginas,
      hash_original: sha256(bytes),
      dispositivo: agente ?? 'desconocido',
    };

    // La marca la pone la API (no la app): así no se puede falsificar desde el celular.
    escribirMarca(pdf, marca, convenio);
    const marcado = Buffer.from(await pdf.save());

    const archivo = await guardarPdf(marcado, ahora);
    try {
      const fila = await documentosRepository.registrar({
        convenioId: convenio.id,
        tipo: tipoDocumento,
        usuario,
        documento: { nombre_original: nombreOriginal, ruta_archivo: archivo.ruta, tamano_bytes: marcado.length, hash_sha256: sha256(marcado) },
        marca,
        ip,
        agente,
      });
      return { message: 'Documento subido y marcado.', documento: aRespuesta(fila), marca };
    } catch (error) {
      await archivo.borrar(); // si no se pudo registrar en la base, no queda un archivo suelto
      throw error;
    }
  },

  /**
   * Detalle de un documento: la marca se lee de los metadatos del propio archivo y se verifica
   * la integridad (que el archivo sea exactamente el registrado, por su hash SHA-256).
   */
  async detalle(usuario, documentoId) {
    const documento = documentoVisible(usuario, documentoId);
    const bytes = await leerArchivo(documento.ruta_archivo);
    if (!bytes) return { documento: aRespuesta(documento), integridad: 'sin_archivo', marca: null };
    return {
      documento: aRespuesta(documento),
      integridad: sha256(bytes) === documento.hash_sha256 ? 'ok' : 'modificado',
      marca: await leerMarca(bytes),
    };
  },

  /** El PDF guardado, para verlo en la app. Si cambió desde que se subió, no se entrega. */
  async pdf(usuario, documentoId) {
    const documento = documentoVisible(usuario, documentoId);
    const bytes = await leerArchivo(documento.ruta_archivo);
    if (!bytes) throw new HttpError(404, 'El archivo de este documento no está en el servidor.');
    if (sha256(bytes) !== documento.hash_sha256) {
      throw new HttpError(409, 'El PDF no coincide con el registrado (hash SHA-256): pudo haber sido modificado.');
    }
    return { bytes, nombre: documento.nombre_original };
  },
};