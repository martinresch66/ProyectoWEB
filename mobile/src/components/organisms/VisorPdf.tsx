import type { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { URL_VISOR } from '@/services/documentos.service';
import { useAppTheme } from '@/theme';

/** Mensajes que manda el visor (mobile/api/public/visor/index.html). */
type MensajeVisor =
  | { tipo: 'preparado' }
  | { tipo: 'listo'; total: number }
  | { tipo: 'pagina'; pagina: number; total: number }
  | { tipo: 'final' }
  | { tipo: 'error'; mensaje: string };

export interface VisorPdfProps {
  /** PDF ya descargado en el celular (null mientras se descarga). */
  archivo: File | null;
  /** Página que se está viendo y total de páginas. */
  onPaginas?: (actual: number, total: number) => void;
  onError?: (mensaje: string) => void;
}

/**
 * Organismo: visor de PDF con zoom de dos dedos (pdf.js dentro de un WebView, servido por la API).
 * Recibe el archivo ya descargado y se lo pasa al visor cuando avisa que está preparado.
 */
export function VisorPdf({ archivo, onPaginas, onError }: VisorPdfProps) {
  const { colors, isDark } = useAppTheme();
  const visor = useRef<WebView<unknown>>(null);
  const [preparado, setPreparado] = useState(false);

  useEffect(() => {
    if (!preparado || !archivo) return;
    archivo.base64().then(
      (base64) => {
        const opciones = JSON.stringify({ oscuro: isDark });
        visor.current?.injectJavaScript(`window.mostrarPdf(${JSON.stringify(base64)}, ${opciones}); true;`);
      },
      () => onError?.('No se pudo leer el PDF descargado.'),
    );
  }, [preparado, archivo, isDark, onError]);

  function alRecibirMensaje(evento: WebViewMessageEvent) {
    const m = JSON.parse(evento.nativeEvent.data) as MensajeVisor;
    if (m.tipo === 'preparado') setPreparado(true);
    else if (m.tipo === 'listo') onPaginas?.(1, m.total);
    else if (m.tipo === 'pagina') onPaginas?.(m.pagina, m.total);
    else if (m.tipo === 'error') onError?.(`El visor no pudo abrir el PDF: ${m.mensaje}`);
  }

  return (
    <WebView<unknown>
      ref={visor}
      source={{ uri: URL_VISOR }}
      originWhitelist={['*']}
      onMessage={alRecibirMensaje}
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      onError={() => onError?.(`No se pudo abrir el visor (${URL_VISOR}). Verificá que la API esté corriendo.`)}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}