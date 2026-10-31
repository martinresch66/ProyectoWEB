// ÁTOMO: Botón
// Mismas variantes que el botón del web: primario, secundario, peligro y texto.
// Alto mínimo de 44 px para que sea fácil de tocar, y estado "cargando" con indicador.
//
// <Boton onPress={guardar}>Guardar</Boton>
// <Boton variante="secundario" onPress={cancelar}>Cancelar</Boton>
// <Boton cargando={enviando} onPress={enviar}>Enviar a revisión</Boton>

import { ActivityIndicator, Pressable } from "react-native";
import { useTema } from "../../theme";
import Texto from "./Texto";

/**
 * @param {{
 *   children?: import("react").ReactNode,
 *   onPress?: () => void,
 *   variante?: "primario" | "secundario" | "peligro" | "texto",
 *   deshabilitado?: boolean,
 *   cargando?: boolean,
 *   accessibilityLabel?: string,
 *   style?: import("react-native").StyleProp<import("react-native").ViewStyle>,
 * }} props
 */
export default function Boton({
  children,
  onPress,
  variante = "primario",
  deshabilitado = false,
  cargando = false,
  accessibilityLabel,
  style,
}) {
  const { colores, radios, espacios, tamanoTactil } = useTema();
  const inactivo = deshabilitado || cargando;

  const paletas = {
    primario: {
      fondo: colores.primario,
      presionado: colores.primarioPresionado,
      texto: colores.textoSobrePrimario,
      borde: "transparent",
    },
    secundario: {
      fondo: colores.superficie,
      presionado: colores.superficieSuave,
      texto: colores.texto,
      borde: colores.bordeFuerte,
    },
    peligro: {
      fondo: colores.peligro,
      presionado: colores.peligroPresionado,
      texto: colores.textoSobrePeligro,
      borde: "transparent",
    },
    texto: {
      fondo: "transparent",
      presionado: colores.primarioSuave,
      texto: colores.primarioTexto,
      borde: "transparent",
    },
  };
  const paleta = paletas[variante] ?? paletas.primario;
  const colorTexto = deshabilitado ? colores.deshabilitadoTexto : paleta.texto;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        {
          minHeight: tamanoTactil,
          paddingHorizontal: espacios.lg,
          borderRadius: radios.md,
          borderWidth: 1,
          borderColor: paleta.borde,
          backgroundColor: pressed ? paleta.presionado : paleta.fondo,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: espacios.sm,
        },
        deshabilitado &&
          variante !== "texto" && {
            backgroundColor: colores.deshabilitadoFondo,
            borderColor: colores.deshabilitadoFondo,
          },
        style,
      ]}
    >
      {cargando && <ActivityIndicator size="small" color={colorTexto} />}
      <Texto variante="boton" style={{ color: colorTexto }}>
        {children}
      </Texto>
    </Pressable>
  );
}
