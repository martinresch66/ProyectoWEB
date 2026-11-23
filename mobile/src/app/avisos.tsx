import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Button, Card } from '@/components/atoms';
import { EmptyState, ListItem, NovedadItem } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import { avisosStore, useAvisos } from '@/services/avisos.store';
import { novedadesService } from '@/services/novedades.service';
import { useAppTheme } from '@/theme';
import { rutaDeDestino } from '@/utils/destinos';

/**
 * Avisos: las novedades de los últimos 7 días en los convenios que el usuario puede ver
 * (las mismas que llegan como notificación). Tocar una abre el convenio, sus comentarios o el documento.
 */
export default function AvisosScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const { sinLeer } = useAvisos();
  const { data, loading, error, reload } = useAsync(() => novedadesService.listar(), []);

  // Al abrir la pantalla se dan por vistas. Si llegan nuevas mientras está abierta, se recarga.
  useEffect(() => {
    if (sinLeer === 0) return;
    avisosStore.marcarLeidos();
    reload();
  }, [sinLeer, reload]);

  const porFirmar = data?.por_firmar.cantidad ?? 0;

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <AppText color="textSecondary">
        Lo que pasó en los últimos 7 días en tus convenios, también lo que se hizo desde la web. Mientras la app está
        abierta se revisa cada minuto y te llega como notificación.
      </AppText>

      {porFirmar > 0 && (
        <Card style={{ paddingVertical: spacing.xs }}>
          <ListItem
            icon="create-outline"
            title={porFirmar === 1 ? 'Tenés 1 convenio por firmar' : `Tenés ${porFirmar} convenios por firmar`}
            subtitle="Abrir la lista para firmar"
            onPress={() => router.navigate('/firmar')}
          />
        </Card>
      )}

      {loading && !data ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xxl }} />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos cargar los avisos"
          message={error}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={reload} />}
        />
      ) : !data?.novedades.length ? (
        <EmptyState icon="notifications-off-outline" title="Sin novedades" message="No hubo cambios en tus convenios en los últimos 7 días." />
      ) : (
        <Card style={{ paddingVertical: spacing.xs }}>
          {data.novedades.map((n, i) => (
            <View key={n.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
              <NovedadItem
                novedad={n}
                onPress={n.destino.pantalla === 'avisos' ? undefined : () => router.push(rutaDeDestino(n.destino))}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}