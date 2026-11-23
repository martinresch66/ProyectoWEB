import type { File } from 'expo-file-system';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, Button, IconButton } from '@/components/atoms';
import { Banner, EmptyState } from '@/components/molecules';
import { VisorPdf } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { TIPOS_DOCUMENTO } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import type { Integridad, MarcaDocumento, TipoDocumento } from '@/models';
import { documentosService } from '@/services/documentos.service';
import { useAppTheme, type Tone } from '@/theme';
import { mensajeDeError } from '@/utils/confirm';
import { formatDateTime } from '@/utils/format';

const INTEGRIDAD: Record<Integridad, { label: string; tone: Tone; aviso: string | null }> = {
  ok: { label: 'Íntegro', tone: 'success', aviso: null },
  modificado: {
    label: 'Modificado',
    tone: 'danger',
    aviso: 'El archivo cambió desde que se subió (su hash SHA-256 no coincide). Por seguridad, no se muestra.',
  },
  sin_archivo: {
    label: 'Sin archivo',
    tone: 'warning',
    aviso: 'El archivo de este documento no está en este servidor (por ejemplo, se cargó en otra PC).',
  },
};

/** Filas de la marca completa, en el orden en que se muestran. */
function filasDeMarca(m: MarcaDocumento): [string, string][] {
  return [
    ['Marca', m.marca],
    ['Subido por', `${m.usuario} (${m.usuario_rol})`],
    ['Email', m.usuario_email],
    ['Convenio', m.convenio],
    ['Fecha y hora', `${m.fecha_local} (hora de Argentina)`],
    ['Tipo', TIPOS_DOCUMENTO[m.tipo_documento as TipoDocumento] ?? m.tipo_documento],
    ['Nombre original', m.nombre_original],
    ['Páginas', String(m.paginas)],
    ['Dispositivo', m.dispositivo],
    ['Id de la marca', m.id_marca],
    ['SHA-256 del original', m.hash_original],
    ['Generado por', m.productor ?? '—'],
  ];
}

/**
 * Documento subido (anexo, dictamen…): muestra la marca que la API escribió en los metadatos del PDF
 * (leída del propio archivo), si el archivo está íntegro y el PDF con zoom.
 */
export default function ArchivoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useAppTheme();
  const margenes = useSafeAreaInsets();
  const detalle = useAsync(() => documentosService.detalle(Number(id)), [id]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paginas, setPaginas] = useState({ actual: 1, total: 0 });
  const [verMarca, setVerMarca] = useState(false);

  const d = detalle.data;
  const integridad = d ? INTEGRIDAD[d.integridad] : null;
  const alCambiarPagina = useCallback((actual: number, total: number) => setPaginas({ actual, total }), []);

  // Solo se descarga el PDF si el archivo está íntegro.
  useEffect(() => {
    if (!d || d.integridad !== 'ok') return;
    let vigente = true;
    documentosService.descargarDocumento(d.documento).then(
      (a) => vigente && setArchivo(a),
      (e) => vigente && setError(mensajeDeError(e)),
    );
    return () => {
      vigente = false;
    };
  }, [d]);

  async function compartir() {
    if (!archivo || !d) return;
    try {
      await documentosService.compartir(archivo, { codigo: d.documento.nombre_original });
    } catch (e) {
      Alert.alert('No se pudo compartir', mensajeDeError(e));
    }
  }

  const problema = detalle.error ?? error;
  if (problema && !archivo) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="No se pudo abrir el documento"
          message={problema}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={detalle.reload} />}
        />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: d?.documento.nombre_original ?? 'Documento',
          headerRight: archivo
            ? () => <IconButton icon="share-social-outline" label="Compartir el PDF" color="primary" onPress={compartir} />
            : undefined,
        }}
      />

      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        }}>
        {d && integridad && (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={integridad.label} tone={integridad.tone} icon={d.integridad === 'ok' ? 'shield-checkmark' : 'warning-outline'} />
              <Badge
                label={d.marca ? 'Marca de la app' : 'Sin marca de la app'}
                tone={d.marca ? 'primary' : 'neutral'}
                icon={d.marca ? 'ribbon-outline' : undefined}
              />
            </View>
            <AppText variant="caption" color="textSecondary">
              {d.marca
                ? `Subido desde la app por ${d.marca.usuario} el ${d.marca.fecha_local}`
                : `Subido por ${d.documento.usuario?.nombre ?? '—'} el ${formatDateTime(d.documento.creado_en)}`}
            </AppText>
            {d.marca && (
              <Button
                title={verMarca ? 'Ocultar la marca' : 'Ver la marca completa'}
                icon={verMarca ? 'chevron-up' : 'chevron-down'}
                variant="ghost"
                onPress={() => setVerMarca((v) => !v)}
              />
            )}
            {d.marca && verMarca && (
              <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ gap: spacing.xs }}>
                {filasDeMarca(d.marca).map(([label, valor]) => (
                  <AppText key={label} variant="caption" color="textSecondary">
                    <AppText variant="caption">{label}: </AppText>
                    {valor}
                  </AppText>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {integridad?.aviso ? (
        <View style={{ padding: spacing.lg }}>
          <Banner tone={integridad.tone} message={integridad.aviso} />
        </View>
      ) : (
        <>
          <VisorPdf archivo={archivo} onPaginas={alCambiarPagina} onError={setError} />
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: margenes.bottom + spacing.sm }}>
            <AppText variant="caption" color="textSecondary">
              {paginas.total ? `Página ${paginas.actual} de ${paginas.total} · Pellizcá para hacer zoom` : 'Cargando el documento…'}
            </AppText>
          </View>
        </>
      )}
    </View>
  );
}