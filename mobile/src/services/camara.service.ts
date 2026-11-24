import { Platform } from 'react-native';

import { cargarModulo } from './nativo';
import type { FotoRostro } from './rostro.service';

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
 * Devuelve la foto (dirección en el caché y tamaño, para el reconocimiento facial) o null si la persona canceló.
 */
export async function tomarSelfie(): Promise<FotoRostro | null> {
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
  const foto = resultado.canceled ? undefined : resultado.assets[0];
  return foto ? { uri: foto.uri, ancho: foto.width, alto: foto.height } : null;
}

/** De dónde sale la foto de perfil. */
export type OrigenFoto = 'camara' | 'galeria';

/**
 * Foto de perfil: con la cámara delantera o de la galería, recortada cuadrada.
 * Devuelve la dirección de la foto (en el caché) o null si la persona canceló.
 * La galería no pide permiso: Android abre su selector de fotos y la app solo recibe la elegida.
 */
export async function elegirFotoPerfil(origen: OrigenFoto): Promise<string | null> {
  const ImagePicker = picker();
  if (!ImagePicker) throw new CamaraError('Este dispositivo no permite elegir fotos.');

  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      throw new CamaraError(
        permiso.canAskAgain
          ? 'Necesitamos la cámara para sacar tu foto de perfil. Volvé a intentar y permití el acceso.'
          : 'El permiso de cámara está bloqueado. Activalo en los ajustes del celular (Apps > Permisos > Cámara).',
      );
    }
    const resultado = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    return resultado.canceled ? null : (resultado.assets[0]?.uri ?? null);
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return resultado.canceled ? null : (resultado.assets[0]?.uri ?? null);
}