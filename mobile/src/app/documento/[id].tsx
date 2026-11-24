import type { File } from 'expo-file-system';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText, Button, IconButton } from '@/components/atoms';
import { Banner, EmptyState } from '@/components/molecules';
import { FirmaModal, type DatosFirma } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ROLES_QUE_FIRMAN } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import type { ConvenioFicha } from '@/models';

import { documentosService, URL_VISOR } from '@/services/documentos.service';
import { firmaService } from '@/services/firma.service';
import { identidadService } from '@/services/identidad.service';
import { useConexion } from '@/services/conexion.store';
import { offlineService } from '@/services/offline.service';  
import { useAppTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';

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
 * 4. Firmar abre el FirmaModal (firma manuscrita + ubicación + huella). Al terminar se recarga la ficha:
 *    el convenio pasa a "firmado" y se descarga el PDF firmado, con la fecha, la hora, la latitud y la longitud.
 */
export default function DocumentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, isDark } = useAppTheme();
  const { usuario } = useAuth();
  const margenes = useSafeAreaInsets();
  const visor = useRef<WebView<unknown>>(null);

  // Sin conexión: la ficha y el PDF guardados en el celular (modo offline). Firmar necesita conexión.
  const { sinConexion } = useConexion();
  const ficha = useAsync(() => offlineService.obtenerFicha(usuario?.id, id), [id]);
  // Firma guardada en "Registrar mi identidad", para usarla con un toque al firmar.
  const identidad = useAsync(() => identidadService.obtener(usuario?.id ?? 0), [usuario?.id]);
  const convenio = ficha.data;
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visorPreparado, setVisorPreparado] = useState(false);
  const [paginas, setPaginas] = useState({ actual: 1, total: 0 });
  const [leyoTodo, setLeyoTodo] = useState(false);
  const [firmando, setFirmando] = useState(false);

  const puedeFirmar = convenio?.estado === 'aprobado' && !!usuario && ROLES_QUE_FIRMAN.includes(usuario.rol);
  // Si ya está firmado, quién, cuándo y dónde (solo si se firmó desde la app).
  const firmado = convenio?.estado === 'firmado';
  const firma = useAsync(() => (firmado ? firmaService.obtener(Number(id)) : Promise.resolve(null)), [id, firmado]);

  // 1) Con los datos del convenio, se descarga el PDF.
  useEffect(() => {
    if (!convenio) return;
    let vigente = true;
      offlineService.pdfConvenio(usuario?.id, convenio).then(
      (a) => vigente && setArchivo(a),
      (e) => vigente && setError(mensajeDe(e)),
    );
    return () => {
      vigente = false;
    };
  }, [convenio, usuario?.id]);

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

  /** La manda el FirmaModal con la firma, la ubicación y la huella ya confirmada. */
  async function enviarFirma(datos: DatosFirma) {
    if (!convenio) return;
    // Se manda la versión que se leyó: si alguien cambió el convenio en el medio, la API responde 409.
    await firmaService.firmar(convenio.id, { ...datos, version: convenio.version });
    setFirmando(false);
    // Se recarga la ficha: pasa a "firmado" y el efecto 1 descarga el PDF firmado.
    ficha.reload();
    Alert.alert('Convenio firmado', 'El documento ya muestra tu firma con la fecha, la hora y el lugar.');
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
          action={
            <View style={{ gap: spacing.sm }}>
              {/* Sin conexión el visor puede no estar disponible: el PDF guardado se abre con otra app. */}
              {sinConexion && archivo && (
                <Button title="Abrir con otra app" icon="open-outline" onPress={() => compartirCon(documentosService.compartir)} />
              )}
              <Button title="Reintentar" icon="refresh" variant="secondary" onPress={reintentar} />
            </View>
          }
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
        // Sin conexión, el visor se abre desde lo que el WebView guardó la última vez.
        cacheMode={sinConexion ? 'LOAD_CACHE_ELSE_NETWORK' : 'LOAD_DEFAULT'}
        onMessage={alRecibirMensaje}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        onError={() =>
          setError(
            sinConexion
              ? 'Sin conexión no se pudo abrir el visor. Podés abrir el PDF guardado con otra app.'
              : `No se pudo abrir el visor (${URL_VISOR}). Verificá que la API esté corriendo.`,
          )
        }
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
        {firma.data && (
          <Banner
            tone="success"
            title={`Firmado por ${firma.data.firmante.nombre}`}
            message={`${formatDateTime(firma.data.fecha)} · Lat ${firma.data.latitud.toFixed(5)}, Long ${firma.data.longitud.toFixed(5)}`}
          />
        )}
        {puedeFirmar && (
          <>
            {sinConexion && (
              <AppText variant="caption" color="warning">
                Sin conexión: vas a poder firmar cuando vuelva la conexión.
              </AppText>
            )}

            {!leyoTodo && (
              <AppText variant="caption" color="textMuted">
                Leé el convenio hasta el final para poder firmarlo.
              </AppText>
            )}
            <Button title="Firmar convenio" icon="create-outline" onPress={() => setFirmando(true)} disabled={!leyoTodo || sinConexion} fullWidth />
          </>
        )}
      </View>

      {firmando && convenio && (
        <FirmaModal
          convenio={convenio}
          firmante={usuario?.nombre ?? ''}
          firmaGuardada={identidad.data?.firma ?? null}
          onCancel={() => setFirmando(false)}
          onConfirm={enviarFirma}
        />
      )}
    </View>
  );
}