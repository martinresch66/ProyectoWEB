import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useAvisos } from '@/services/avisos.store';
import { useAppTheme } from '@/theme';

import { AppText, Avatar, IconButton } from '../atoms';
import { SearchBar } from '../molecules';

export interface AppHeaderProps {
  title: string;
  /** Muestra el buscador en el header (requerimiento: "el buscador debe aparecer en el header"). */
  showSearch?: boolean;
}

/**
 * Organismo: header de las pestañas principales.
 * Combina título + campanita de avisos + avatar (átomos) + SearchBar (molécula).
 * Al buscar, lleva a la pantalla Buscar con el texto ingresado.
 */
export function AppHeader({ title, showSearch = true }: AppHeaderProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { usuario } = useAuth();
  const { sinLeer } = useAvisos();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View>
            <IconButton
              icon={sinLeer > 0 ? 'notifications' : 'notifications-outline'}
              color={sinLeer > 0 ? 'primary' : 'text'}
              label={sinLeer > 0 ? `Avisos: ${sinLeer} sin leer` : 'Avisos'}
              onPress={() => router.push('/avisos')}
            />
            {sinLeer > 0 && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 2,
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 4,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppText variant="label" color="onPrimary" style={{ fontSize: 11, lineHeight: 14 }}>
                  {sinLeer > 9 ? '9+' : String(sinLeer)}
                </AppText>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.navigate('/perfil')}
            accessibilityRole="button"
            accessibilityLabel="Ir a Mi Perfil"
            hitSlop={8}>
            <Avatar name={usuario?.nombre ?? ''} size={36} />
          </Pressable>
        </View>
      </View>
      {showSearch && (
        <SearchBar
          clearOnSubmit
          onSubmit={(q) => router.navigate({ pathname: '/buscar', params: q ? { q } : {} })}
          placeholder="Buscar por código, título o resumen…"
        />
      )}
    </View>
  );
}