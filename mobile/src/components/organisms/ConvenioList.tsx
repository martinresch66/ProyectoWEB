import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import type { Convenio } from '@/models';
import { useAppTheme } from '@/theme';

import { Button } from '../atoms';
import { ConvenioCard, EmptyState } from '../molecules';

export interface ConvenioListProps {
  convenios: Convenio[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
}

/**
 * Organismo: listado de convenios con sus estados de carga, error y vacío.
 * Cada ítem es una ConvenioCard (molécula) que abre el detalle.
 */
export function ConvenioList({ convenios, loading, error, onRetry, emptyMessage }: ConvenioListProps) {
  const { colors, spacing } = useAppTheme();
  const router = useRouter();

  if (loading && !convenios) {
    return <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xxl }} />;
  }

  if (error) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="No pudimos cargar los convenios"
        message={error}
        action={onRetry && <Button title="Reintentar" icon="refresh" variant="secondary" onPress={onRetry} />}
      />
    );
  }

  if (!convenios?.length) {
    return <EmptyState icon="document-text-outline" title="Sin convenios" message={emptyMessage} />;
  }

  return (
    <View style={{ gap: spacing.md }}>
      {convenios.map((c) => (
        <ConvenioCard
          key={c.id}
          convenio={c}
          onPress={() => router.push({ pathname: '/convenio/[id]', params: { id: String(c.id) } })}
        />
      ))}
    </View>
  );
}
