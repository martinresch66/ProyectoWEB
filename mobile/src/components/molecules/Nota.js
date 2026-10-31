// MOLÉCULA: Nota
// Recuadro de aviso con los mismos cuatro tipos que el web: info, alerta, error y éxito.
// Los errores se anuncian solos en el lector de pantalla.
//
// <Nota tipo="alerta">Estás viendo la última copia guardada porque no hay conexión.</Nota>

import { View } from "react-native";
import { useTema } from "../../theme";
import Texto from "../atoms/Texto";

/**
 * @param {{ tipo?: "info" | "alerta" | "error" | "exito", titulo?: string, children?: import("react").ReactNode }} props
 */
export default function Nota({ tipo = "info", titulo, children }) {
  const { colores, radios, espacios } = useTema();
  const color = colores.notas[tipo] ?? colores.notas.info;
  const esError = tipo === "error";

  return (
    <View
      accessibilityRole={esError ? "alert" : undefined}
      accessibilityLiveRegion={esError ? "assertive" : undefined}
      style={{
        borderWidth: 1,
        borderColor: color.borde,
        backgroundColor: color.fondo,
        borderRadius: radios.md,
        paddingHorizontal: espacios.lg,
        paddingVertical: espacios.md,
        gap: espacios.xs,
      }}
    >
      {titulo && (
        <Texto variante="destacado" style={{ color: color.texto }}>
          {titulo}
        </Texto>
      )}
      {typeof children === "string" ? (
        <Texto variante="cuerpoChico" style={{ color: color.texto }}>
          {children}
        </Texto>
      ) : (
        children
      )}
    </View>
  );
}
