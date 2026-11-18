import { Alert, Platform } from 'react-native';

/** Pide confirmación antes de una acción (ej: cerrar sesión). Funciona en el celular y en la web. */
export function confirmar(titulo: string, mensaje: string, textoAceptar = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoAceptar, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Devuelve el mensaje de un error para mostrar al usuario. */
export function mensajeDeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}
