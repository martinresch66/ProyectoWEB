import type { File } from 'expo-file-system';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText, Button, IconButton } from '@/components/atoms';
import { EmptyState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ROLES_QUE_FIRMAN } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import type { ConvenioFicha } from '@/models';
import { conveniosService } from '@/services/convenios.service';
import { documentosService, URL_VISOR } from '@/services/documentos.service';
import { useAppTheme } from '@/theme';

/** Mensajes que manda el visor (mobile/api/public/visor/index.html). */
type MensajeVisor =
  | { tipo: 'preparado' }
  | { tipo: 'listo'; total: number }
  | { tipo: 'pagina'; pagina: number; total: number }
  | { tipo: 'final' }
  | { tipo: 'error'; mensaje: string };

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado.');

/**
 * Lectura del documento del convenio (PDF), con zoom, compartir y, si corresponde, "Firmar" al final.
 * 1. Se descarga el PDF con el token (documentosService) al caché del celular.
 * 2. El WebView abre el visor de la API y, cuando avisa que está preparado, se le pasa el PDF.
 * 3. El zoom es el de dos dedos. "Firmar" se habilita recién cuando el visor avisa que se llegó al final.
 */
export default function DocumentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, isDark } = useAppTheme();
  const { usuario } = useAuth();
  const margenes = useSafeAreaInsets();
   const visor = useRef<WebView<unknown>>(null);

  const ficha = useAsync(() => conveniosService.obtener(id), [id]);
  const convenio = ficha.data;
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visorPreparado, setVisorPreparado] = useState(false);
  const [paginas, setPaginas] = useState({ actual: 1, total: 0 });
  const [leyoTodo, setLeyoTodo] = useState(false);

  const puedeFirmar = convenio?.estado === 'aprobado' && !!usuario && ROLES_QUE_FIRMAN.includes(usuario.rol);

  // 1) Con los datos del convenio, se descarga el PDF.
  useEffect(() => {
    if (!convenio) return;
    let vigente = true;
    documentosService.descargarConvenio(convenio).then(
      (a) => vigente && setArchivo(a),
      (e) => vigente && setError(mensajeDe(e)),
    );
    return () => {
      vigente = false;
    };
  }, [convenio]);

  // 2) Visor preparado + PDF descargado → se lo pasamos (y de nuevo si cambia el modo claro/oscuro).
  useEffect(() => {
    if (!visorPreparado || !archivo) return;
    archivo.base64().then(
      (base64) => {
        const opciones = JSON.stringify({ oscuro: isDark });
        visor.current?.injectJavaScript(`window.mostrarPdf(${JSON.stringify(base64)}, ${opciones}); true;`);
      },
      (e) => setError(mensajeDe(e)),
    );
  }, [visorPreparado, archivo, isDark]);

  function alRecibirMensaje(evento: WebViewMessageEvent) {
    const m = JSON.parse(evento.nativeEvent.data) as MensajeVisor;
    if (m.tipo === 'preparado') setVisorPreparado(true);
    else if (m.tipo === 'listo') setPaginas({ actual: 1, total: m.total });
    else if (m.tipo === 'pagina') setPaginas({ actual: m.pagina, total: m.total });
    else if (m.tipo === 'final') setLeyoTodo(true);
    else if (m.tipo === 'error') setError(`El visor no pudo abrir el PDF: ${m.mensaje}`);
  }

  async function compartirCon(accion: (a: File, c: ConvenioFicha) => Promise<void>) {
    if (!archivo || !convenio) return; // todavía se está descargando
    try {
      await accion(archivo, convenio);
    } catch (e) {
      Alert.alert('No se pudo compartir', mensajeDe(e));
    }
  }

  function firmar() {
    // Punto 3: firma con huella, firma manuscrita y ubicación.
    Alert.alert('Firmar convenio', 'La firma con huella y firma manuscrita se agrega en el próximo paso.');
  }

  function reintentar() {
    setError(null);
    setArchivo(null);
    setVisorPreparado(false);
    ficha.reload();
  }

  const problema = ficha.error ?? error;
  if (problema) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="No se pudo abrir el documento"
          message={problema}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={reintentar} />}
        />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: convenio?.codigo ?? 'Documento',
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="share-social-outline"
                label="Compartir el PDF (WhatsApp, Drive…)"
                color="primary"
                onPress={() => compartirCon(documentosService.compartir)}
              />
              <IconButton
                icon="mail-outline"
                label="Enviar el PDF por mail"
                color="primary"
                onPress={() => compartirCon(documentosService.enviarPorMail)}
              />
            </View>
          ),
        }}
      />

      <WebView<unknown>
        ref={visor}
        source={{ uri: URL_VISOR }}
        originWhitelist={['*']}
        onMessage={alRecibirMensaje}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        onError={() => setError(`No se pudo abrir el visor (${URL_VISOR}). Verificá que la API esté corriendo.`)}
        style={{ flex: 1, backgroundColor: colors.background }}
      />

      <View
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: margenes.bottom + spacing.md,
          gap: spacing.sm,
        }}>
        <AppText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
          {paginas.total ? `Página ${paginas.actual} de ${paginas.total} · Pellizcá para hacer zoom` : 'Cargando el documento…'}
        </AppText>
        {puedeFirmar && (
          <>
            {!leyoTodo && (
              <AppText variant="caption" color="textMuted">
                Leé el convenio hasta el final para poder firmarlo.
              </AppText>
            )}
            <Button title="Firmar convenio" icon="create-outline" onPress={firmar} disabled={!leyoTodo} fullWidth />
          </>
        )}
      </View>
    </View>
  );
}