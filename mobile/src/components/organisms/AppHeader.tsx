import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';

import { AppText, Avatar } from '../atoms';
import { SearchBar } from '../molecules';

export interface AppHeaderProps {
  title: string;
  /** Muestra el buscador en el header (requerimiento: "el buscador debe aparecer en el header"). */
  showSearch?: boolean;
}

/**
 * Organismo: header de las pestañas principales.
 * Combina título + avatar (molécula/átomo) + SearchBar (molécula).
 * Al buscar, lleva a la pantalla Buscar con el texto ingresado.
 */
export function AppHeader({ title, showSearch = true }: AppHeaderProps) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { usuario } = useAuth();

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
        <Pressable
          onPress={() => router.navigate('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Ir a Mi Perfil"
          hitSlop={8}>
          <Avatar name={usuario?.nombre ?? ''} size={36} />
        </Pressable>
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
