import { useState } from 'react';
import { View } from 'react-native';

import { conexionStore } from '@/services/conexion.store';
import type { PendientesGuardados } from '@/services/offline.service';
import { useAppTheme } from '@/theme';
import { timeAgo } from '@/utils/format';

import { AppText, Button } from '../atoms';
import { Banner, ConvenioCard, EmptyState } from '../molecules';

export interface PendientesOfflineProps {
  guardados: PendientesGuardados | null;
  /** Si el rol firma convenios (admin y gestión). */
  puedeFirmar: boolean;
  onAbrir: (convenioId: number) => void;
}

/**
 * Organismo: lo que se ve sin conexión en el Inicio y en Firmar (modo offline del T2):
 * solo los convenios pendientes de firma que se guardaron en el celular.
 */
export function PendientesOffline({ guardados, puedeFirmar, onAbrir }: PendientesOfflineProps) {
  const { spacing } = useAppTheme();
  const [probando, setProbando] = useState(false);
  const pendientes = guardados?.pendientes ?? [];

  async function reintentar() {
    setProbando(true);
    await conexionStore.comprobar();
    setProbando(false);
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Banner
        tone="warning"
        icon="cloud-offline-outline"
        title="Sin conexión · Modo offline"
        message="Solo podés ver los convenios pendientes de firma guardados en el celular. Para firmar, buscar o comentar necesitás conexión."
      />

      {!puedeFirmar ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Nada para ver sin conexión"
          message="Sin conexión solo se ven los convenios pendientes de firma, y tu rol no firma convenios."
        />
      ) : pendientes.length === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          title="No hay convenios guardados"
          message="Cuando tengas conexión, abrí el Inicio: tus pendientes de firma se guardan solos en el celular."
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          <AppText variant="caption" color="textMuted">
            {pendientes.length === 1 ? '1 convenio' : `${pendientes.length} convenios`} esperando firma · guardados{' '}
            {timeAgo(guardados!.guardado_en)}
          </AppText>
          {pendientes.map((c) => (
            <ConvenioCard key={c.id} convenio={c} onPress={() => onAbrir(c.id)} />
          ))}
        </View>
      )}

      <Button title="Reintentar conexión" icon="refresh" variant="secondary" loading={probando} onPress={reintentar} />
    </View>
  );
}
