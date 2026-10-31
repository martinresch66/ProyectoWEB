import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ProveedorTema, useTema } from '@/theme';

SplashScreen.preventAutoHideAsync();

// La navegación (barra de pestañas, encabezados) toma sus colores de nuestro tema,
// así respeta la preferencia claro/oscuro que elija el usuario y no solo la del sistema.
function Navegacion() {
  const { oscuro, colores } = useTema();
  const base = oscuro ? DarkTheme : DefaultTheme;

  const temaNavegacion = {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.primarioTexto, // pestaña activa
      background: colores.fondo,
      card: colores.superficie, // fondo de la barra de pestañas y encabezados
      text: colores.texto,
      border: colores.borde,
      notification: colores.peligro, // globitos de notificación
    },
  };

  return (
    <ThemeProvider value={temaNavegacion}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  // ProveedorTema no dibuja nada hasta que carga la fuente Inter, así que la pantalla
  // de inicio (splash) sigue visible mientras tanto y el texto no cambia de fuente de golpe.
  return (
    <ProveedorTema>
      <Navegacion />
    </ProveedorTema>
  );
}

