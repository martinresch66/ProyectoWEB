import { View } from 'react-native';

import { ROLES } from '@/domain/dominio';
import type { Comentario } from '@/models';
import { useAppTheme } from '@/theme';
import { formatDateTime, timeAgo } from '@/utils/format';

import { AppText, Icon } from '../atoms';

export interface ComentarioItemProps {
  comentario: Comentario;
}

/**
 * Molécula: un comentario, como globo de chat. Los propios van a la derecha y en azul.
 * Si el sistema lo detectó como ofensivo, se muestra solo "Comentario ofensivo".
 */
export function ComentarioItem({ comentario }: ComentarioItemProps) {
  const { colors, spacing, radius } = useAppTheme();
  const { autor, es_mio: mio, es_ofensivo: ofensivo } = comentario;
  const quien = mio ? 'Vos' : autor.nombre;

  return (
    <View
      accessible
      accessibilityLabel={`${quien}, ${formatDateTime(comentario.creado_en)}: ${ofensivo ? 'comentario ofensivo' : comentario.texto}`}
      style={{
        alignSelf: mio ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        backgroundColor: mio ? colors.primarySoft : colors.surface,
        borderColor: ofensivo ? colors.danger : colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.xs,
      }}>
      <AppText variant="label" color={mio ? 'primary' : 'text'}>
        {quien}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {ROLES[autor.rol] ?? autor.rol} · {timeAgo(comentario.creado_en)}
      </AppText>
      {ofensivo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="alert-circle-outline" size={16} color="danger" />
          <AppText color="danger" style={{ fontStyle: 'italic' }}>
            Comentario ofensivo
          </AppText>
        </View>
      ) : (
        <AppText>{comentario.texto}</AppText>
      )}
    </View>
  );
}