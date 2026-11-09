import { Platform } from 'react-native';

import { cargarModulo } from './nativo';

type LocalAuthModule = typeof import('expo-local-authentication');

export interface BiometriaInfo {
  /** El celular tiene sensor y el usuario registró al menos una huella o rostro. */
  disponible: boolean;
  /** Nombre para mostrar en la interfaz. */
  tipo: 'huella' | 'rostro' | 'biometría';
}

function localAuth(): LocalAuthModule | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  return cargarModulo('expo-local-authentication', () => require('expo-local-authentication') as LocalAuthModule);
}

/** Consulta si el celular puede usar biometría y de qué tipo. */
export async function obtenerBiometria(): Promise<BiometriaInfo> {
  const LocalAuthentication = localAuth();
  if (!LocalAuthentication) return { disponible: false, tipo: 'huella' };
  try {
    const [hardware, enrolada, tipos] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const tipo = tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? 'huella'
      : tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'rostro'
        : 'biometría';
    return { disponible: hardware && enrolada, tipo };
  } catch {
    return { disponible: false, tipo: 'huella' };
  }
}

/**
 * Muestra el diálogo del sistema para validar la huella / rostro.
 * Devuelve true si la validación fue exitosa.
 */
export async function autenticarConBiometria(motivo: string): Promise<boolean> {
  const LocalAuthentication = localAuth();
  if (!LocalAuthentication) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: motivo,
    promptSubtitle: 'Convenios UNLPam',
    cancelLabel: 'Cancelar',
    biometricsSecurityLevel: 'strong',
  });
  return result.success;
}
