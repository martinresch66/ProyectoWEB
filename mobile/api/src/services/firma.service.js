import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { CONVENIO_CAMBIADO, firmasRepository } from '../repositories/firmas.repository.js';
import { HttpError } from '../utils/HttpError.js';
import { randomToken } from '../utils/crypto.js';
import { conveniosService } from './convenios.service.js';
import { generarPdfConvenio } from './pdfConvenio.service.js';
import { ROLES_QUE_FIRMAN } from './resumen.service.js';

/** Cómo se confirmó la identidad en el celular antes de firmar. */
const VERIFICACIONES = ['huella', 'rostro', 'biometria'];
/** Límites de la firma manuscrita (evitan pedidos gigantes). */
const MAX_TRAZOS = 60;
const MAX_PUNTOS = 4000;
const MIN_PUNTOS = 10;

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

/** Valida el cuerpo del pedido. Si algo no sirve, 422 con los errores por campo (formato de Laravel). */
function validar(cuerpo) {
  const { version, verificacion, firma, ubicacion } = cuerpo ?? {};
  const errores = {};

  if (!Number.isInteger(version)) errores.version = ['Falta la versión del convenio que leíste.'];
  if (!VERIFICACIONES.includes(verificacion)) {
    errores.verificacion = ['La firma se tiene que confirmar con la huella (o la biometría) del celular.'];
  }

  // Firma manuscrita: trazos de puntos [x, y] dibujados en un recuadro de ancho x alto.
  let trazado = null;
  const { ancho, alto, trazos } = firma ?? {};
  const totalPuntos = Array.isArray(trazos) ? trazos.reduce((n, t) => n + (Array.isArray(t) ? t.length : 0), 0) : 0;
  if (!esNumero(ancho) || !esNumero(alto) || ancho < 50 || alto < 50 || ancho > 4000 || alto > 4000 || !Array.isArray(trazos)) {
    errores.firma = ['La firma manuscrita no tiene un formato válido.'];
  } else if (trazos.length > MAX_TRAZOS || totalPuntos > MAX_PUNTOS) {
    errores.firma = ['La firma tiene demasiados trazos. Borrala y volvé a firmar.'];
  } else {
    const limpios = trazos
      .filter(Array.isArray)
      .map((t) =>
        t
          .filter((p) => Array.isArray(p) && esNumero(p[0]) && esNumero(p[1]))
          .map(([x, y]) => [Math.round(acotar(x, 0, ancho) * 10) / 10, Math.round(acotar(y, 0, alto) * 10) / 10]),
      )
      .filter((t) => t.length > 0);
    if (limpios.reduce((n, t) => n + t.length, 0) < MIN_PUNTOS) errores.firma = ['Dibujá tu firma en el recuadro.'];
    else trazado = { ancho, alto, trazos: limpios };
  }

  // Ubicación del acto de firma (la pide el T2: fecha, hora, lat y long).
  const { latitud, longitud, precision_m } = ubicacion ?? {};
  if (!esNumero(latitud) || !esNumero(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
    errores.ubicacion = ['Falta la ubicación donde firmás (latitud y longitud).'];
  }

  if (Object.keys(errores).length) throw new HttpError(422, 'Revisá los datos de la firma.', errores);
  return {
    version,
    verificacion,
    trazado,
    ubicacion: {
      latitud: Math.round(latitud * 1e6) / 1e6,
      longitud: Math.round(longitud * 1e6) / 1e6,
      precision_m: esNumero(precision_m) && precision_m >= 0 ? Math.round(precision_m) : null,
    },
  };
}

/** Ruta absoluta de un documento, sin dejar salir de la carpeta de documentos (bloquea rutas con "../"). */
function rutaSegura(rutaArchivo) {
  const base = path.resolve(env.documentosDir);
  const absoluta = path.resolve(base, rutaArchivo);
  if (!absoluta.startsWith(base + path.sep)) throw new HttpError(400, 'Ruta de documento inválida.');
  return absoluta;
}

/** Lo que se le muestra a la app de una firma (sin el trazo, que solo hace falta para el PDF). */
function aRespuesta(d) {
  return {
    fecha: d.fecha,
    firmante: d.firmante,
    latitud: d.latitud,
    longitud: d.longitud,
    precision_m: d.precision_m ?? null,
    verificacion: d.verificacion,
    documento_id: d.documento_id ?? null,
    hash_sha256: d.hash_sha256 ?? null,
  };
}

/**
 * Firma de convenios desde la app (Firmador del T2): huella + firma manuscrita + ubicación.
 * La huella se valida en el celular (nunca sale del dispositivo); acá se controla quién firma,
 * qué firma (estado y versión) y se guarda el PDF firmado con la fecha, la hora, la latitud y la longitud.
 */
export const firmaService = {
  async firmar(usuario, convenioId, cuerpo, { ip = null, agente = null } = {}) {
    if (!ROLES_QUE_FIRMAN.includes(usuario.rol)) {
      throw new HttpError(403, 'Tu rol no puede firmar convenios. Solo administración y gestión registran firmas.');
    }
    // 404 si no existe o si no está en el alcance del usuario (gestión solo firma los de su unidad).
    const ficha = conveniosService.obtener(usuario, convenioId);
    if (ficha.estado !== 'aprobado') throw new HttpError(422, `Este convenio no está esperando firma (estado: ${ficha.estado}).`);

    const datos = validar(cuerpo);
    // Se firma exactamente la versión que se leyó: si cambió en el medio, hay que volver a leerla.
    if (datos.version !== Number(ficha.version)) throw new HttpError(409, CONVENIO_CAMBIADO);

    const fecha = new Date();
    const detalles = {
      fecha: fecha.toISOString(),
      firmante: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      ...datos.ubicacion,
      verificacion: datos.verificacion,
      trazado: datos.trazado,
    };

    // PDF del convenio con la firma estampada, y su hash para verificar después que nadie lo cambió.
    const bytes = Buffer.from(await generarPdfConvenio({ ...ficha, estado: 'firmado' }, { firma: detalles }));
    const hash = sha256(bytes);

    // Se guarda como lo hace Laravel: documentos/AAAA/MM/<nombre aleatorio>.pdf
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const rutaArchivo = `documentos/${fecha.getFullYear()}/${mes}/${randomToken(24)}.pdf`;
    const absoluta = rutaSegura(rutaArchivo);
    await mkdir(path.dirname(absoluta), { recursive: true });
    await writeFile(absoluta, bytes);

    try {
      const { documento_id } = await firmasRepository.registrar({
        convenioId: ficha.id,
        versionLeida: datos.version,
        usuario,
        documento: {
          nombre_original: `${ficha.codigo}-firmado.pdf`,
          ruta_archivo: rutaArchivo,
          tamano_bytes: bytes.length,
          hash_sha256: hash,
        },
        detalles: { ...detalles, hash_sha256: hash },
        ip,
        agente,
      });
      return { message: 'Convenio firmado.', firma: aRespuesta({ ...detalles, documento_id, hash_sha256: hash }) };
    } catch (error) {
      // Si no se pudo registrar en la base, no queda un PDF suelto en la carpeta.
      await rm(absoluta, { force: true });
      throw error;
    }
  },

  /** Datos de la firma hecha desde la app ({ firma: null } si todavía no se firmó así). */
  obtener(usuario, convenioId) {
    const ficha = conveniosService.obtener(usuario, convenioId);
    const registro = firmasRepository.deConvenio(ficha.id);
    return { firma: registro ? aRespuesta(registro.detalles) : null };
  },

  /**
   * PDF firmado guardado (el firmado en la app o el subido desde la web), o null si no hay.
   * Antes de entregarlo se verifica que el archivo sea exactamente el registrado (mismo hash SHA-256).
   */
  async pdfGuardado(convenioId) {
    const documento = firmasRepository.documentoFirmado(convenioId);
    if (!documento?.ruta_archivo) return null;
    let bytes;
    try {
      bytes = await readFile(rutaSegura(documento.ruta_archivo));
    } catch {
      return null; // el archivo no está en esta PC: se muestra el PDF generado
    }
    if (documento.hash_sha256 && sha256(bytes) !== documento.hash_sha256) {
      throw new HttpError(409, 'El PDF firmado no coincide con el registrado (hash SHA-256): pudo haber sido modificado.');
    }
    return bytes;
  },
};