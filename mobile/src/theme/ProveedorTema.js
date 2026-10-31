// Proveedor del tema: decide si la app se ve clara u oscura y lo comparte con todas las pantallas.
//
// Uso en cualquier componente:
//   const { colores, espacios, radios, tipografia } = useTema();
//
// Para el selector de modo claro/oscuro (requisito del TP):
//   const { preferencia, cambiarPreferencia } = useTema();
//   cambiarPreferencia("oscuro"); // "sistema" | "claro" | "oscuro"

import { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { coloresClaro, coloresOscuro } from "./colores";
import { espacios, radios, tamanoTactil, crearTipografia } from "./medidas";

/**
 * Forma del tema que devuelve useTema(). Le sirve al editor para autocompletar y detectar errores.
 * @typedef {Object} Tema
 * @property {boolean} oscuro
 * @property {"sistema" | "claro" | "oscuro"} preferencia
 * @property {(preferencia: "sistema" | "claro" | "oscuro") => void} cambiarPreferencia
 * @property {typeof coloresClaro} colores
 * @property {typeof espacios} espacios
 * @property {typeof radios} radios
 * @property {number} tamanoTactil
 * @property {ReturnType<typeof crearTipografia>} tipografia
 */
const ContextoTema = createContext(/** @type {Tema | null} */ (null));

export function ProveedorTema({ children }) {
  // Modo del sistema operativo: "light", "dark" o null si no se sabe.
  const esquemaSistema = useColorScheme();

  // Lo que eligió el usuario. Por ahora vive solo en memoria;
  // más adelante se guardará en src/storage para que se recuerde al reabrir la app.
  const [preferencia, setPreferencia] = useState("sistema");

  const [fuentesListas, errorFuentes] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const oscuro = preferencia === "sistema" ? esquemaSistema === "dark" : preferencia === "oscuro";
  const conInter = fuentesListas && !errorFuentes;

  const valor = useMemo(
    () => ({
      oscuro,
      preferencia,
      cambiarPreferencia: setPreferencia,
      colores: oscuro ? coloresOscuro : coloresClaro,
      espacios,
      radios,
      tamanoTactil,
      tipografia: crearTipografia(conInter),
    }),
    [oscuro, preferencia, conInter]
  );

  // Mientras cargan las fuentes (un instante) no se dibuja nada, para evitar que el texto
  // aparezca primero con otra fuente y después cambie. Si fallan, se sigue con la del sistema.
  if (!fuentesListas && !errorFuentes) return null;

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema() {
  const tema = useContext(ContextoTema);
  if (!tema) {
    throw new Error("useTema() tiene que usarse dentro de <ProveedorTema>.");
  }
  return tema;
}
