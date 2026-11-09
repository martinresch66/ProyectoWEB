import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { inicializarNotificaciones } from '@/services/notifications';
import { AppThemeProvider, useAppTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
inicializarNotificaciones();

/**
 * Navegación raíz.
 * - Sin sesión: solo se puede acceder al login y a la verificación (MFA).
 * - Con sesión: las pestañas y el resto de las pantallas.
 * Cuando cambia la sesión, Expo Router redirige solo a las pantallas permitidas.
 */
function RootNavigator() {
  const { colors, isDark, ready, typography } = useAppTheme();
  const { estado, ofrecerHuella } = useAuth();
  const router = useRouter();
  // Inter es la tipografía de la web. Si no carga (sin internet la primera vez en web), se sigue con la del sistema.
  const [fuentesListas, errorFuentes] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const listo = ready && estado !== 'cargando' && (fuentesListas || !!errorFuentes);
  const conSesion = estado === 'con_sesion';

  // Se oculta el splash recién cuando se cargaron las fuentes, las preferencias y la sesión (evita "parpadeos").
  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  // Después del primer login con contraseña, se ofrece activar la huella.
  useEffect(() => {
    if (conSesion && ofrecerHuella) router.push('/activar-huella');
  }, [conSesion, ofrecerHuella, router]);

  if (!listo) return null;

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontSize: typography.subtitle.fontSize, fontFamily: typography.subtitle.fontFamily },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Protected guard={conSesion}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="convenio/[id]" options={{ title: 'Ficha del convenio' }} />
          <Stack.Screen name="identidad" options={{ title: 'Registrar mi identidad' }} />
          <Stack.Screen name="ayuda" options={{ title: 'Ayuda' }} />
          <Stack.Screen name="componentes" options={{ title: 'Componentes (Atomic Design)' }} />
          <Stack.Screen
            name="activar-huella"
            options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!conSesion}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="verificacion" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
