import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import type { SeccionAyuda } from '@/domain/ayuda';
import { useAvisos } from '@/services/avisos.store';
import { useConexion } from '@/services/conexion.store';
import { useFotoPerfil } from '@/services/fotoPerfil.service';
import { toneColors, useAppTheme } from '@/theme';

import { AppText, Avatar, Icon, IconButton } from '../atoms';
import { SearchBar } from '../molecules';
import { BotonAyuda } from './AyudaModal';

export interface AppHeaderProps {
  title: string;
  /** Muestra el buscador en el header (requerimiento: "el buscador debe aparecer en el header"). */
  showSearch?: boolean;
  /** Ayuda de la pantalla: muestra el botón "?" (ayuda contextual del T2). */
  ayuda?: SeccionAyuda;
}

/**
 * Organismo: header de las pestañas principales.
 * Combina título + campanita de avisos + avatar (átomos) + SearchBar (molécula).
 * Al buscar, lleva a la pantalla Buscar con el texto ingresado.
 */
export function AppHeader({ title, showSearch = true, ayuda }: AppHeaderProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { usuario } = useAuth();
  const { sinLeer } = useAvisos();
  const foto = useFotoPerfil(usuario?.id ?? null);
  const { sinConexion } = useConexion();
  const aviso = toneColors(colors, 'warning');

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
          {ayuda && <BotonAyuda seccion={ayuda} />}
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
            <Avatar name={usuario?.nombre ?? ''} uri={foto} size={36} />
          </Pressable>
        </View>
      </View>
            {sinConexion && (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: aviso.bg,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}>
          <Icon name="cloud-offline-outline" size={16} rawColor={aviso.fg} />
          <AppText variant="caption" style={{ color: aviso.fg, flex: 1 }}>
            Sin conexión · Modo offline: solo los pendientes de firma
          </AppText>
        </View>
      )}
      {/* El buscador necesita conexión: sin conexión no se muestra. */}
      {showSearch && !sinConexion && (
        <SearchBar
          clearOnSubmit
          onSubmit={(q) => router.navigate({ pathname: '/buscar', params: q ? { q } : {} })}
          placeholder="Buscar por código, título o resumen…"
        />
      )}
    </View>
  );
}