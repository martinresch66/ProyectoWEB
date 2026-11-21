import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

import { env } from '@/config/env';

import { ApiError, tokenDeSesion } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Página del visor de PDF que sirve la API (mobile/api/public/visor). Está fuera de /api. */
export const URL_VISOR = `${env.apiUrl.replace(/\/api$/, '')}/visor/index.html`;

async function pedirPdf(path: string, token: string | null) {
  try {
    return await fetch(`${env.apiUrl}${path}`, {
      headers: { Accept: 'application/pdf', ...(token && { Authorization: `Bearer ${token}` }) },
    });
  } catch {
    throw new ApiError('No se pudo descargar el documento. Verificá la conexión con la API.', null);
  }
}

/**
 * Documentos de los convenios: descarga del PDF, compartir y enviar por mail.
 * El PDF se guarda en el caché de la app (el sistema lo puede borrar cuando necesita espacio).
 */
export const documentosService = {
  /** Descarga el PDF del convenio y devuelve el archivo local. */
  async descargarConvenio(convenio: { id: number; codigo: string }): Promise<File> {
    const ruta = ENDPOINTS.pdfConvenio(convenio.id);
    let res = await pedirPdf(ruta, await tokenDeSesion());
    // Token vencido: se renueva una vez y se reintenta, igual que apiRequest.
    if (res.status === 401) res = await pedirPdf(ruta, await tokenDeSesion(true));
    if (!res.ok) {
      const mensaje = res.status === 404 ? 'No encontramos este convenio.' : `No se pudo descargar el PDF (error ${res.status}).`;
      throw new ApiError(mensaje, res.status);
    }

    const archivo = new File(Paths.cache, `${convenio.codigo}.pdf`);
    if (archivo.exists) archivo.delete();
    archivo.create();
    // write es asíncrono: se espera a que termine antes de devolver el archivo.
    await archivo.write(new Uint8Array(await res.arrayBuffer()));
    return archivo;
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