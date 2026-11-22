import { fetch } from 'expo/fetch';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

import { env } from '@/config/env';
import type { DetalleDocumento, ResultadoSubida, TipoDocumento } from '@/models';

import { ApiError, apiRequest, tokenDeSesion } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Página del visor de PDF que sirve la API (mobile/api/public/visor). Está fuera de /api. */
export const URL_VISOR = `${env.apiUrl.replace(/\/api$/, '')}/visor/index.html`;

/** Máximo que acepta la API (20 MB). Se controla antes de subir para no esperar en vano. */
export const MAX_BYTES_PDF = 20 * 1024 * 1024;

/** PDF elegido en el celular, todavía sin subir. */
export interface PdfElegido {
  uri: string;
  nombre: string;
  tamano: number | null;
}

/** Lo que acepta fetch como cuerpo del pedido (se toma del propio fetch, así coincide siempre). */
type CuerpoFetch = NonNullable<Parameters<typeof fetch>[1]>['body'];

/** Pedido a la API con el token. Si el token venció, se renueva una vez y se reintenta, igual que apiRequest. */
async function pedirConToken(path: string, init: { method?: string; headers?: Record<string, string>; body?: CuerpoFetch } = {}) {
  const enviar = async (token: string | null) => {
    try {
      return await fetch(`${env.apiUrl}${path}`, {
        ...init,
        headers: { ...init.headers, ...(token && { Authorization: `Bearer ${token}` }) },
      });
    } catch {
      throw new ApiError('No se pudo conectar con la API. Verificá la conexión.', null);
    }
  };
  const res = await enviar(await tokenDeSesion());
  return res.status === 401 ? enviar(await tokenDeSesion(true)) : res;
}

type CuerpoDeError = { message?: string; errors?: Record<string, string[]> };

/** Mensaje de error que mandó la API ({ message }) o uno por defecto. */
async function errorDe(res: { status: number; json(): Promise<unknown> }, porDefecto: string): Promise<ApiError> {
  let cuerpo: CuerpoDeError | null = null;
  try {
    cuerpo = (await res.json()) as CuerpoDeError;
  } catch {
    cuerpo = null;
  }
  return new ApiError(cuerpo?.message ?? porDefecto, res.status, cuerpo?.errors ?? {});
}

/** Descarga un PDF de la API al caché del celular y devuelve el archivo. */
async function descargarPdf(path: string, nombreArchivo: string): Promise<File> {
  const res = await pedirConToken(path, { headers: { Accept: 'application/pdf' } });
  if (!res.ok) throw await errorDe(res, `No se pudo descargar el PDF (error ${res.status}).`);
  const archivo = new File(Paths.cache, nombreArchivo);
  if (archivo.exists) archivo.delete();
  archivo.create();
  // write es asíncrono: se espera a que termine antes de devolver el archivo.
  await archivo.write(new Uint8Array(await res.arrayBuffer()));
  return archivo;
}

/**
 * Documentos de los convenios: descarga, subida de PDFs (con la marca que pone la API), compartir y mail.
 * Los PDF descargados se guardan en el caché de la app (el sistema los puede borrar cuando necesita espacio).
 */
export const documentosService = {
  /** El PDF del convenio (el firmado, si ya se firmó). */
  descargarConvenio(convenio: { id: number; codigo: string }): Promise<File> {
    return descargarPdf(ENDPOINTS.pdfConvenio(convenio.id), `${convenio.codigo}.pdf`);
  },

  /** Un documento subido (anexo, dictamen…). Si el archivo cambió desde que se subió, la API no lo entrega. */
  descargarDocumento(documento: { id: number }): Promise<File> {
    return descargarPdf(ENDPOINTS.pdfDocumento(documento.id), `documento-${documento.id}.pdf`);
  },

  /** Datos del documento, la marca (leída del propio archivo) y si el archivo está íntegro. */
  detalle(documentoId: number): Promise<DetalleDocumento> {
    return apiRequest<DetalleDocumento>(ENDPOINTS.documento(documentoId));
  },

  /** Abre el selector de archivos del celular, solo con PDFs. Devuelve null si la persona canceló. */
  async elegirPdf(): Promise<PdfElegido | null> {
    const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
    if (resultado.canceled) return null;
    const asset = resultado.assets[0];
    if (!asset) return null;
    return { uri: asset.uri, nombre: asset.name, tamano: asset.size ?? null };
  },

  /**
   * Sube el PDF a la API. El archivo va "crudo" en el cuerpo (Content-Type: application/pdf);
   * el tipo y el nombre, en la URL. La marca en los metadatos la pone la API, no la app.
   */
    async subir(convenioId: number, pdf: PdfElegido, tipo: TipoDocumento): Promise<ResultadoSubida> {
    if (pdf.tamano !== null && pdf.tamano > MAX_BYTES_PDF) {
      throw new ApiError('El archivo supera el máximo permitido (20 MB).', null);
    }
    // El PDF elegido se lee con el fetch de React Native (globalThis.fetch): lee archivos del celular
    // (file:// y content://) sin pedir permisos extra, y lo deja como Blob, sin cargarlo entero en JavaScript.
    let archivo: Blob;
    try {
      archivo = await (await globalThis.fetch(pdf.uri)).blob();
    } catch {
      throw new ApiError('No se pudo leer el PDF elegido. Probá elegirlo de nuevo.', null);
    }

    const consulta = `?tipo=${encodeURIComponent(tipo)}&nombre=${encodeURIComponent(pdf.nombre)}`;
    const url = `${env.apiUrl}${ENDPOINTS.documentosConvenio(convenioId)}${consulta}`;
    // El archivo va "crudo" en el cuerpo. Si el token venció, se renueva una vez y se reintenta.
    const enviar = async (token: string | null) => {
      try {
        return await globalThis.fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/pdf', Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
          body: archivo,
        });
      } catch {
        throw new ApiError('No se pudo conectar con la API. Verificá la conexión.', null);
      }
    };
    let res = await enviar(await tokenDeSesion());
    if (res.status === 401) res = await enviar(await tokenDeSesion(true));
    if (!res.ok) throw await errorDe(res, `No se pudo subir el documento (error ${res.status}).`);
    return (await res.json()) as ResultadoSubida;
  },

  /** Menú para compartir de Android: WhatsApp, Gmail, Drive, etc. */
  async compartir(archivo: File, convenio: { codigo: string }): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
    await Sharing.shareAsync(archivo.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Compartir ${convenio.codigo}`,
    });
  },

  /** Abre la app de correo con el PDF adjunto. Si no hay ninguna configurada, usa el menú de compartir. */
  async enviarPorMail(archivo: File, convenio: { codigo: string; titulo: string }): Promise<void> {
    if (!(await MailComposer.isAvailableAsync())) return documentosService.compartir(archivo, convenio);
    await MailComposer.composeAsync({
      subject: `Convenio ${convenio.codigo}`,
      body: `Te comparto el convenio ${convenio.codigo}: ${convenio.titulo}.`,
      attachments: [archivo.uri],
    });
  },
};