import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Button, Card, Icon } from '@/components/atoms';
import { Banner, EmptyState, SegmentedControl } from '@/components/molecules';
import { SinConexion } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import { useLectorVoz, VELOCIDADES, type Velocidad } from '@/hooks/useLectorVoz';
import { useConexion } from '@/services/conexion.store';
import { lecturaService } from '@/services/lectura.service';
import { useAppTheme } from '@/theme';

const OPCIONES_VELOCIDAD = VELOCIDADES.map((v) => ({ value: String(v), label: `${String(v).replace('.', ',')}x` }));

/**
 * Escuchar el convenio (innovación del T2): el celular lee en voz alta el mismo PDF que se firma,
 * sección por sección (encabezado, partes, cada cláusula y firmas). Sirve para repasarlo sin mirar
 * la pantalla (de viaje, caminando) y para personas con baja visión. Usa la voz del celular, sin internet.
 */
export default function EscucharScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useAppTheme();
  const lectura = useAsync(() => lecturaService.obtener(id), [id]);
  const { sinConexion } = useConexion(lectura.reload);
  const secciones = lectura.data?.secciones ?? null;
  const lector = useLectorVoz(secciones);

  if (lectura.loading && !lectura.data) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xxl }} />
        <AppText variant="caption" color="textSecondary" align="center">
          Preparando el texto del convenio…
        </AppText>
      </Screen>
    );
  }
  if (!lectura.data) {
    return (
      <Screen>
        {sinConexion ? (
          <SinConexion mensaje="Para escuchar el convenio necesitás conexión." />
        ) : (
          <EmptyState
            icon="alert-circle-outline"
            title="No se pudo preparar la lectura"
            message={lectura.error ?? undefined}
            action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={lectura.reload} />}
          />
        )}
      </Screen>
    );
  }

  const { convenio, documento, minutos } = lectura.data;
  const total = lectura.data.secciones.length;
  const actual = lectura.data.secciones[lector.indice];
  const leyendo = lector.estado === 'leyendo';
  const duracion = Math.max(1, Math.round(minutos / lector.velocidad));

  return (
    <Screen>
      {/* Qué se va a escuchar */}
      <Card style={{ gap: spacing.xs }}>
        <AppText variant="label" color="textMuted">
          {convenio.codigo}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {convenio.titulo}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {total} secciones · unos {duracion} min · {documento === 'firmado' ? 'documento firmado' : 'documento para firmar'}
        </AppText>
      </Card>

      {!lector.disponible && <Banner tone="warning" message="Este dispositivo no tiene una voz disponible para leer en voz alta." />}

      {/* Reproductor */}
      <Card style={{ gap: spacing.lg, alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
          <AppText variant="label" color="textSecondary" align="center">
            Sección {lector.indice + 1} de {total}
          </AppText>
          <AppText variant="subtitle" align="center" numberOfLines={2}>
            {actual?.titulo}
          </AppText>
          {/* Barra de avance */}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginTop: spacing.sm }}>
            <View style={{ width: `${((lector.indice + (leyendo ? 0.5 : 0)) / total) * 100}%`, height: 6, backgroundColor: colors.primary }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
          <BotonRedondo icono="play-skip-back" etiqueta="Sección anterior" onPress={lector.anterior} disabled={lector.indice === 0} />
          <Pressable
            onPress={leyendo ? lector.pausar : lector.reproducir}
            disabled={!lector.disponible}
            accessibilityRole="button"
            accessibilityLabel={leyendo ? 'Pausar' : lector.estado === 'pausado' ? 'Seguir escuchando' : 'Escuchar'}
            style={({ pressed }) => ({
              width: 76,
              height: 76,
              borderRadius: 38,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              opacity: !lector.disponible ? 0.4 : pressed ? 0.8 : 1,
            })}>
            <Icon name={leyendo ? 'pause' : 'play'} size={36} rawColor={colors.onPrimary} />
          </Pressable>
          <BotonRedondo icono="play-skip-forward" etiqueta="Sección siguiente" onPress={lector.siguiente} disabled={lector.indice >= total - 1} />
        </View>

        <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
          <AppText variant="label" color="textSecondary">
            Velocidad
          </AppText>
          <SegmentedControl
            options={OPCIONES_VELOCIDAD}
            value={String(lector.velocidad)}
            onChange={(v) => lector.cambiarVelocidad(Number(v) as Velocidad)}
            accessibilityLabel="Velocidad de lectura"
          />
        </View>
      </Card>

      {/* Lo que se está leyendo, para seguirlo con la vista */}
      {actual && (
        <Card style={{ gap: spacing.sm, borderColor: leyendo ? colors.primary : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name={leyendo ? 'volume-high' : 'document-text-outline'} size={16} color={leyendo ? 'primary' : 'textSecondary'} />
            <AppText variant="label" color={leyendo ? 'primary' : 'textSecondary'}>
              {leyendo ? 'Leyendo ahora' : 'Texto de la sección'}
            </AppText>
          </View>
          <AppText>{actual.texto}</AppText>
        </Card>
      )}

      {/* Índice: tocá una sección para escucharla */}
      <Card style={{ paddingVertical: spacing.sm, gap: 2 }}>
        <AppText variant="label" color="textSecondary" style={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.xs }}>
          Secciones · tocá una para escucharla
        </AppText>
        {lectura.data.secciones.map((s, i) => {
          const esActual = i === lector.indice;
          return (
            <Pressable
              key={s.id}
              onPress={() => lector.irA(i)}
              disabled={!lector.disponible}
              accessibilityRole="button"
              accessibilityState={{ selected: esActual }}
              accessibilityLabel={`Escuchar ${s.titulo}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 44,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: esActual ? colors.primarySoft : pressed ? colors.surfaceAlt : 'transparent',
              })}>
              <AppText variant="label" style={{ width: 22, textAlign: 'center', color: esActual ? colors.primary : colors.textMuted }}>
                {i + 1}
              </AppText>
              <AppText style={{ flex: 1, color: esActual ? colors.primary : colors.text }} numberOfLines={1}>
                {s.titulo}
              </AppText>
              {esActual && leyendo && <Icon name="volume-high" size={18} color="primary" />}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

function BotonRedondo({
  icono,
  etiqueta,
  onPress,
  disabled = false,
}: {
  icono: 'play-skip-back' | 'play-skip-forward';
  etiqueta: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceAlt,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Icon name={icono} size={24} color="text" />
    </Pressable>
  );
}
