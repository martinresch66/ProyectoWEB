import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, Icon } from '@/components/atoms';
import { Banner } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { formatearBytes, TIPOS_DOCUMENTO, TIPOS_SUBIDA } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import type { ResultadoSubida, TipoDocumento } from '@/models';
import { conveniosService } from '@/services/convenios.service';
import { documentosService, MAX_BYTES_PDF, type PdfElegido } from '@/services/documentos.service';
import { useAppTheme } from '@/theme';
import { mensajeDeError } from '@/utils/confirm';

/** Botón-etiqueta para elegir el tipo de documento (queda marcado el elegido). */
function Opcion({ label, activa, onPress }: { label: string; activa: boolean; onPress: () => void }) {
  const { colors, spacing, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activa }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: activa ? colors.primary : colors.border,
        backgroundColor: activa ? colors.primarySoft : colors.surface,
      }}>
      <AppText variant="label" color={activa ? 'primary' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Fila "Dato: valor" del resumen de la marca. */
function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <AppText variant="caption" color="textSecondary">
      <AppText variant="caption">{label}: </AppText>
      {valor}
    </AppText>
  );
}

/**
 * Subir documentación (T2): se elige un PDF del celular y su tipo, y se sube a la API.
 * La API le pone la marca en los metadatos (usuario, convenio, fecha y hora) antes de guardarlo.
 */
export default function SubirDocumentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useAppTheme();
  const ficha = useAsync(() => conveniosService.obtener(id), [id]);

  const [pdf, setPdf] = useState<PdfElegido | null>(null);
  const [tipo, setTipo] = useState<TipoDocumento>('anexo');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoSubida | null>(null);

  const muyGrande = (pdf?.tamano ?? 0) > MAX_BYTES_PDF;

  async function elegir() {
    setError(null);
    try {
      const elegido = await documentosService.elegirPdf();
      if (elegido) setPdf(elegido);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  async function subir() {
    if (!pdf) return;
    setError(null);
    setSubiendo(true);
    try {
      setResultado(await documentosService.subir(Number(id), pdf, tipo));
      setPdf(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  }

  if (resultado) {
    const { marca, documento } = resultado;
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Subir documentación' }} />
        <Banner tone="success" title="Documento subido y marcado" message="La API agregó la marca en los metadatos del PDF." />
        <Card style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">{documento.nombre_original}</AppText>
          <Dato label="Tipo" valor={`${TIPOS_DOCUMENTO[documento.tipo_documento] ?? documento.tipo_documento} · versión ${documento.version}`} />
          <Dato label="Subido por" valor={`${marca.usuario} (${marca.usuario_email})`} />
          <Dato label="Convenio" valor={marca.convenio} />
          <Dato label="Fecha y hora" valor={`${marca.fecha_local} (hora de Argentina)`} />
          <Dato label="Páginas" valor={String(marca.paginas)} />
        </Card>
        <Button
          title="Ver el documento"
          icon="document-text-outline"
          onPress={() => router.replace({ pathname: '/archivo/[id]', params: { id: String(documento.id) } })}
        />
        <Button title="Subir otro" icon="cloud-upload-outline" variant="ghost" onPress={() => setResultado(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Subir documentación' }} />
      {ficha.data && (
        <AppText variant="caption" color="textSecondary">
          {ficha.data.codigo} · {ficha.data.titulo}
        </AppText>
      )}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">1. Elegí el PDF</AppText>
        {pdf && (
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Icon name="document-attach-outline" size={22} color="danger" />
            <View style={{ flex: 1 }}>
              <AppText numberOfLines={2}>{pdf.nombre}</AppText>
              {pdf.tamano !== null && (
                <AppText variant="caption" color={muyGrande ? 'danger' : 'textMuted'}>
                  {formatearBytes(pdf.tamano)}
                  {muyGrande ? ' · supera el máximo de 20 MB' : ''}
                </AppText>
              )}
            </View>
          </View>
        )}
        <Button
          title={pdf ? 'Elegir otro PDF' : 'Elegir PDF'}
          icon="folder-open-outline"
          variant="secondary"
          onPress={elegir}
          disabled={subiendo}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">2. Tipo de documento</AppText>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TIPOS_SUBIDA.map((t) => (
            <Opcion key={t} label={TIPOS_DOCUMENTO[t]} activa={tipo === t} onPress={() => setTipo(t)} />
          ))}
        </View>
      </Card>

      <Banner
        tone="info"
        message="Solo PDF, hasta 20 MB. Al subirlo, la API le agrega una marca en los metadatos con tu usuario, el convenio, la fecha y la hora."
      />
      {error && <Banner tone="danger" message={error} />}

      <Button
        title="Subir y marcar"
        icon="cloud-upload-outline"
        onPress={subir}
        loading={subiendo}
        disabled={!pdf || muyGrande}
        fullWidth
      />
    </Screen>
  );
}