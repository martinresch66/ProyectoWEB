import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Button, Card } from '@/components/atoms';
import { Banner, ConvenioCard, EmptyState, MovimientoItem, SectionHeader } from '@/components/molecules';
import { ResumenGrid } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import { useRecargarAlVolver } from '@/hooks/useRecargarAlVolver';
import type { IndicadorResumen } from '@/models';
import { resumenService } from '@/services/resumen.service';
import { useAppTheme } from '@/theme';
import { primerNombre } from '@/utils/format';

/** Cuántos pendientes se muestran en el Inicio (el resto, en la pestaña Firmar). */
const PENDIENTES_EN_INICIO = 3;

/**
 * Inicio (Home): resumen de movimiento.
 * - Boxes: firmados en el último año, vigentes, en trámite y esperando firma.
 * - Mis pendientes: convenios por firmar (solo para los roles que firman).
 * - Últimos movimientos: máximo 10, del más reciente al más antiguo.
 * Todo sale de GET /mobile/resumen, calculado por la API según el rol y la unidad.
 */
export default function HomeScreen() {
  const { colors, spacing } = useAppTheme();
  const { usuario } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => resumenService.obtener(), []);
  // Al volver al Inicio (por ejemplo, después de firmar), se actualizan los números.
  useRecargarAlVolver(reload);

  const abrirConvenio = (id: number) => router.push({ pathname: '/convenio/[id]', params: { id: String(id) } });
  const irAFirmar = () => router.navigate('/firmar');
  // "Esperando firma" lleva al Firmador si el rol firma; los demás boxes abren el listado de ese indicador.
  const abrirIndicador = (indicador: IndicadorResumen) => {
    if (indicador === 'por_firmar' && data?.puede_firmar) return irAFirmar();
    router.push({ pathname: '/indicador/[clave]', params: { clave: indicador } });
  };

  // Primera carga fallida: no hay nada que mostrar.
  if (error && !data) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos cargar el resumen"
          message={error}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={reload} />}
        />
      </Screen>
    );
  }

  const pendientes = data?.pendientes_firma ?? [];
  const movimientos = data?.ultimos_movimientos ?? [];

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="textSecondary">
          Hola,
        </AppText>
        <AppText variant="title">{primerNombre(usuario?.nombre ?? '')}</AppText>
        {usuario && (
          <AppText variant="caption" color="textMuted">
            {ROLES[usuario.rol]} · {usuario.unidad?.nombre ?? 'Alcance global'}
          </AppText>
        )}
      </View>

      {/* Si falla al actualizar, se siguen mostrando los datos anteriores con un aviso. */}
      {error && data && <Banner tone="warning" message={`No se pudo actualizar: ${error}`} />}

      <ResumenGrid totales={data?.totales ?? null} onPressIndicador={abrirIndicador} />

      {data?.puede_firmar && (
        <View>
          <SectionHeader
            title="Mis pendientes"
            actionLabel={pendientes.length > PENDIENTES_EN_INICIO ? 'Ver todos' : undefined}
            onAction={irAFirmar}
          />
          {pendientes.length === 0 ? (
            <Card>
              <AppText color="textSecondary">No tenés convenios por firmar.</AppText>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {pendientes.slice(0, PENDIENTES_EN_INICIO).map((c) => (
                <ConvenioCard key={c.id} convenio={c} onPress={() => abrirConvenio(c.id)} />
              ))}
            </View>
          )}
        </View>
      )}

      <View>
        <SectionHeader title="Últimos movimientos" />
        <Card style={{ paddingVertical: spacing.xs }}>
          {!data ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
          ) : movimientos.length === 0 ? (
            <AppText color="textSecondary" style={{ paddingVertical: spacing.md }}>
              Todavía no hay movimientos en tus convenios.
            </AppText>
          ) : (
            movimientos.map((m, i) => (
              <View key={m.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
                <MovimientoItem movimiento={m} onPress={() => abrirConvenio(m.convenio.id)} />
              </View>
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}