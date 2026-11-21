import { Platform } from 'react-native';

import { cargarModulo } from './nativo';

type ImagePickerModule = typeof import('expo-image-picker');

/** Error con un mensaje listo para mostrar (permiso denegado, sin cámara…). */
export class CamaraError extends Error {}

function picker(): ImagePickerModule | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  return cargarModulo('expo-image-picker', () => require('expo-image-picker') as ImagePickerModule);
}

/**
 * Abre la cámara delantera para sacar una foto cuadrada del rostro.
 * Devuelve la dirección de la foto (en el caché) o null si la persona canceló.
 */
export async function tomarSelfie(): Promise<string | null> {
  const ImagePicker = picker();
  if (!ImagePicker) throw new CamaraError('Este dispositivo no tiene cámara disponible.');

  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    throw new CamaraError(
      permiso.canAskAgain
        ? 'Necesitamos la cámara para registrar tu rostro. Volvé a intentar y permití el acceso.'
        : 'El permiso de cámara está bloqueado. Activalo en los ajustes del celular (Apps > Permisos > Cámara).',
    );
  }

  const resultado = await ImagePicker.launchCameraAsync({
    cameraType: ImagePicker.CameraType.front,
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (resultado.canceled) return null;
  return resultado.assets[0]?.uri ?? null;
}