// ÁTOMO: Insignia
// Etiqueta redondeada y chica. No sabe nada de convenios: solo recibe texto y colores.
// Las moléculas InsigniaEstado e InsigniaVigencia la usan con los colores de cada caso.

import { View } from "react-native";
import { useTema } from "../../theme";
import Texto from "./Texto";

/**
 * @param {{ texto: string, fondo: string, colorTexto: string, borde?: string, accessibilityLabel?: string }} props
 */
export default function Insignia({ texto, fondo, colorTexto, borde, accessibilityLabel }) {
  const { radios } = useTema();
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? texto}
      style={{
        alignSelf: "flex-start",
        borderRadius: radios.completo,
        paddingHorizontal: 10, // px-2.5 del web
        paddingVertical: 2, // py-0.5
        backgroundColor: fondo,
        borderWidth: borde ? 1 : 0,
        borderColor: borde,
      }}
    >
      <Texto variante="insignia" numberOfLines={1} style={{ color: colorTexto }}>
        {texto}
      </Texto>
    </View>
  );
}
