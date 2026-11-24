import { NativeModules, Platform } from 'react-native';

import { cargarModulo } from './nativo';

type FaceDetectionModule = typeof import('@react-native-ml-kit/face-detection');

/** Error con un mensaje listo para mostrar: qué está mal en la foto y cómo sacarla de nuevo. */
export class RostroError extends Error {}

/** Foto a analizar, con su tamaño (para saber qué tan grande sale la cara). */
export interface FotoRostro {
  uri: string;
  ancho: number;
  alto: number;
}

/**
 * Resultado del reconocimiento:
 * - `reconocido`: ML Kit encontró un rostro válido en la foto.
 * - `no-disponible`: el detector no está en esta app (Expo Go no lo trae); la foto no se pudo verificar.
 */
export type ResultadoRostro = { estado: 'reconocido' } | { estado: 'no-disponible' };

/** Giro máximo de la cabeza (en grados) para considerar que mira de frente. */
const GIRO_MAXIMO = 18;
/** La cara tiene que ocupar al menos esta parte del ancho de la foto. */
const TAMANO_MINIMO = 0.3;
/** Probabilidad mínima de ojo abierto (0 a 1) que da ML Kit. */
const OJO_ABIERTO = 0.35;

/**
 * El detector es nativo (ML Kit de Google, corre dentro del celular, sin internet ni servidores).
 * Expo Go no lo incluye: solo funciona en la app instalada (APK o `npx expo run:android`).
 */
function detector(): FaceDetectionModule['default'] | null {
  if (Platform.OS === 'web' || !NativeModules.FaceDetection) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  const modulo = cargarModulo('@react-native-ml-kit/face-detection', () => require('@react-native-ml-kit/face-detection') as FaceDetectionModule);
  return modulo?.default ?? null;
}

/** true si este celular puede reconocer rostros (la app instalada, no Expo Go). */
export const reconocimientoDisponible = () => detector() !== null;

/**
 * Reconocimiento facial de "Registrar mi identidad": comprueba que en la foto haya exactamente un rostro,
 * de frente, cerca de la cámara y con los ojos abiertos. Si algo falla, lanza RostroError con el motivo.
 */
export async function reconocerRostro(foto: FotoRostro): Promise<ResultadoRostro> {
  const FaceDetection = detector();
  if (!FaceDetection) return { estado: 'no-disponible' };

  let rostros;
  try {
    rostros = await FaceDetection.detect(foto.uri, {
      performanceMode: 'accurate',
      landmarkMode: 'all',
      classificationMode: 'all',
      minFaceSize: 0.15,
    });
  } catch {
    throw new RostroError('No se pudo analizar la foto. Probá sacarla de nuevo.');
  }

  if (rostros.length === 0) {
    throw new RostroError('No encontramos un rostro en la foto. Sacala de frente, con buena luz y la cara dentro del cuadro.');
  }
  if (rostros.length > 1) {
    throw new RostroError('Aparece más de una persona en la foto. Sacala de nuevo solo con tu rostro.');
  }

  const [rostro] = rostros;
  if (Math.abs(rostro.rotationY) > GIRO_MAXIMO || Math.abs(rostro.rotationZ) > GIRO_MAXIMO) {
    throw new RostroError('Tu cara está girada o inclinada. Mirá de frente a la cámara y con la cabeza derecha.');
  }
  if (foto.ancho > 0 && rostro.frame.width / foto.ancho < TAMANO_MINIMO) {
    throw new RostroError('Tu cara sale muy chica. Acercá un poco más el celular.');
  }

  const { leftEyeOpenProbability: izq, rightEyeOpenProbability: der } = rostro;
  if (izq !== undefined && der !== undefined && izq >= 0 && der >= 0 && (izq < OJO_ABIERTO || der < OJO_ABIERTO)) {
    throw new RostroError('Parece que tenés los ojos cerrados. Sacá la foto con los ojos abiertos.');
  }

  const marcas = rostro.landmarks;
  if (marcas && (!marcas.leftEye || !marcas.rightEye || !marcas.noseBase)) {
    throw new RostroError('No se ven bien tus ojos y tu nariz. Sacate los anteojos de sol o lo que te tape la cara.');
  }

  return { estado: 'reconocido' };
}
