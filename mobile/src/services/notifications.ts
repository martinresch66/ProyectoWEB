import { Platform } from 'react-native';

import { cargarModulo } from './nativo';

type NotificationsModule = typeof import('expo-notifications');
/** Lo que llega al tocar una notificación (NotificationResponse de expo-notifications). */
type Respuesta = NonNullable<Awaited<ReturnType<NotificationsModule['getLastNotificationResponseAsync']>>>;

/** Datos que viajan dentro de la notificación (ej: a qué pantalla lleva al tocarla). */
export type DatosNotificacion = Record<string, unknown>;

/**
 * Canales de Android:
 * - general: códigos de verificación y pruebas.
 * - novedades: avisos de convenios. Con el celular bloqueado no muestra el texto (pueden ser datos internos).
 */
const CANALES = {
  general: { name: 'General', description: 'Avisos de la app de convenios', privado: false },
  novedades: { name: 'Novedades de convenios', description: 'Comentarios, cambios de estado y recordatorios', privado: true },
} as const;
export type Canal = keyof typeof CANALES;

let inicializacion: Promise<void> | null = null;
/** Canales que se pudieron crear (algunas versiones de Expo Go fallan): si falta, se usa el canal por defecto. */
const canalesCreados = new Set<Canal>();

/** expo-notifications se carga recién cuando se necesita (y puede no existir en Expo Go). */
function notificaciones(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  return cargarModulo('expo-notifications', () => require('expo-notifications') as NotificationsModule);
}

/** Canal a usar en Android ({} si no se pudo crear: va al canal por defecto). */
function canalAndroid(canal: Canal): { channelId?: string } {
  return Platform.OS === 'android' && canalesCreados.has(canal) ? { channelId: canal } : {};
}

/**
 * Configura cómo se muestran las notificaciones con la app abierta (banner arriba) y crea los canales.
 * Se hace una sola vez: si se llama de nuevo, espera a la primera.
 */
export function inicializarNotificaciones(): Promise<void> {
  inicializacion ??= inicializar();
  return inicializacion;
}

async function inicializar() {
  const Notifications = notificaciones();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[notificaciones] No se pudo configurar el handler:', (err as Error)?.message);
  }

  if (Platform.OS !== 'android') return;
  // En Android 13+ el pedido de permiso no aparece hasta que exista al menos un canal.
  // Se pasan todas las opciones: algunas versiones de Expo Go fallan si alguna queda vacía.
  for (const [id, canal] of Object.entries(CANALES) as [Canal, (typeof CANALES)[Canal]][]) {
    try {
      await Notifications.setNotificationChannelAsync(id, {
        name: canal.name,
        description: canal.description,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E4E8C',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: canal.privado
          ? Notifications.AndroidNotificationVisibility.PRIVATE
          : Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      canalesCreados.add(id);
    } catch (err) {
      console.warn(`[notificaciones] No se pudo crear el canal "${id}":`, (err as Error)?.message);
    }
  }
}

/** Si se piden permisos varias veces a la vez (ej: al entrar), se muestra un solo cartel. */
let pedidoEnCurso: Promise<boolean> | null = null;

/** Pide permiso para mostrar notificaciones (si todavía no se dio). */
export function pedirPermisoNotificaciones(): Promise<boolean> {
  pedidoEnCurso ??= pedirPermiso().finally(() => {
    pedidoEnCurso = null;
  });
  return pedidoEnCurso;
}

async function pedirPermiso(): Promise<boolean> {
  const Notifications = notificaciones();
  if (!Notifications) return false;
  try {
    await inicializarNotificaciones();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.status === 'granted') return true;
    if (!actual.canAskAgain) return false;
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
export async function mostrarNotificacion(
  titulo: string,
  cuerpo: string,
  datos: DatosNotificacion = {},
  canal: Canal = 'general',
): Promise<boolean> {
  try {
    const Notifications = notificaciones();
    if (!Notifications || !(await pedirPermisoNotificaciones())) return false;
    const android = canalAndroid(canal);
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, data: datos },
      trigger: android.channelId ? { channelId: android.channelId } : null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Programa una notificación local para dentro de `segundos` (aunque la app esté cerrada).
 * Si ya había una con el mismo `id`, la reemplaza (así un recordatorio nunca se duplica).
 */
export async function programarNotificacion(
  id: string,
  titulo: string,
  cuerpo: string,
  segundos: number,
  datos: DatosNotificacion = {},
): Promise<boolean> {
  try {
    const Notifications = notificaciones();
    if (!Notifications || !(await pedirPermisoNotificaciones())) return false;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: titulo, body: cuerpo, data: datos },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(5, Math.round(segundos)),
        repeats: false,
        ...canalAndroid('novedades'),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancela una notificación programada (si no existe, no pasa nada). */
export async function cancelarNotificacion(id: string): Promise<void> {
  try {
    await notificaciones()?.cancelScheduledNotificationAsync(id);
  } catch {
    // no estaba programada
  }
}

/**
 * Avisa cuando el usuario toca una notificación, con los datos que llevaba.
 * También revisa si la app se abrió tocando una (estando cerrada). Devuelve la función para dejar de escuchar.
 */
export function escucharToques(alTocar: (datos: DatosNotificacion) => void): () => void {
  const Notifications = notificaciones();
  if (!Notifications) return () => {};

  // El mismo toque puede llegar por el listener y por getLastNotificationResponseAsync: se atiende una sola vez.
  let ultimo = '';
  const atender = (respuesta: Respuesta | null) => {
    if (!respuesta) return;
    const clave = `${respuesta.notification.request.identifier}-${respuesta.notification.date}`;
    if (clave === ultimo) return;
    ultimo = clave;
    const datos = respuesta.notification.request.content.data;
    alTocar(datos && typeof datos === 'object' ? (datos as DatosNotificacion) : {});
  };

  let activo = true;
  try {
    const suscripcion = Notifications.addNotificationResponseReceivedListener(atender);
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (activo && r) {
          atender(r);
          Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
      suscripcion.remove();
    };
  } catch {
    return () => {};
  }
}