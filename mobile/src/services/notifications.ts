import { Platform } from 'react-native';

import { cargarModulo } from './nativo';

type NotificationsModule = typeof import('expo-notifications');

const CANAL_ANDROID = 'general';
let inicializado = false;
/** false si no se pudo crear el canal propio (algunas versiones de Expo Go fallan): se usa el canal por defecto. */
let canalCreado = false;

/** expo-notifications se carga recién cuando se necesita (y puede no existir en Expo Go). */
function notificaciones(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  return cargarModulo('expo-notifications', () => require('expo-notifications') as NotificationsModule);
}

/** Configura cómo se muestran las notificaciones con la app abierta (banner arriba). */
export async function inicializarNotificaciones() {
  const Notifications = notificaciones();
  if (inicializado || !Notifications) return;
  inicializado = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      // En Android 13+ el pedido de permiso no aparece hasta que exista al menos un canal.
      // Se pasan todas las opciones: algunas versiones de Expo Go fallan si alguna queda vacía.
      await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
        name: 'General',
        description: 'Avisos de la app de convenios',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E4E8C',
        enableVibrate: true,
        showBadge: true,
      });
      canalCreado = true;
    }
  } catch (err) {
    console.warn('[notificaciones] No se pudo configurar el canal de Android:', (err as Error)?.message);
  }
}

/** Pide permiso para mostrar notificaciones (si todavía no se dio). */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const Notifications = notificaciones();
  if (!Notifications) return false;
  try {
    await inicializarNotificaciones();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.status === 'granted') return true;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Muestra una notificación local inmediata.
 * Devuelve false si no se pudo mostrar (sin permiso, sin el módulo o en web),
 * para que la app use otra forma de avisar.
 */
export async function mostrarNotificacion(titulo: string, cuerpo: string): Promise<boolean> {
  try {
    const Notifications = notificaciones();
    if (!Notifications || !(await pedirPermisoNotificaciones())) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo },
      trigger: Platform.OS === 'android' && canalCreado ? { channelId: CANAL_ANDROID } : null,
    });
    return true;
  } catch {
    return false;
  }
}
