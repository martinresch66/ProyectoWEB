import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/organisms';
import { useAppTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : inactive} color={color as string} size={size} />;
  };
}

/** Pestañas principales de la app. */
export default function TabsLayout() {
  const { colors, typography } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: typography.label.fontSize, fontFamily: typography.label.fontFamily },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          header: () => <AppHeader title="Inicio" />,
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          header: () => <AppHeader title="Buscar" showSearch={false} />,
          tabBarIcon: tabIcon('search', 'search-outline'),
        }}
      />
      <Tabs.Screen
        name="firmar"
        options={{
          title: 'Firmar',
          header: () => <AppHeader title="Por firmar" />,
          tabBarIcon: tabIcon('create', 'create-outline'),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          header: () => <AppHeader title="Mi Perfil" showSearch={false} />,
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
