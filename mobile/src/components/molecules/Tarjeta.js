// MOLÉCULA: Tarjeta
// Contenedor con fondo, borde y esquinas redondeadas, con título y acciones opcionales.
// Equivale a la Tarjeta del web.

import { View } from "react-native";
import { useTema } from "../../theme";
import Texto from "../atoms/Texto";

/**
 * @param {{ titulo?: string, acciones?: import("react").ReactNode, children?: import("react").ReactNode, style?: import("react-native").StyleProp<import("react-native").ViewStyle> }} props
 */
export default function Tarjeta({ titulo, acciones, children, style }) {
  const { colores, radios, espacios } = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: colores.superficie,
          borderWidth: 1,
          borderColor: colores.borde,
          borderRadius: radios.lg,
          padding: espacios.lg,
          gap: espacios.lg,
        },
        style,
      ]}
    >
      {(titulo || acciones) && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: espacios.md,
          }}
        >
          {titulo && (
            <Texto variante="subtitulo" accessibilityRole="header">
              {titulo}
            </Texto>
          )}
          {acciones}
        </View>
      )}
      {children}
    </View>
  );
}
