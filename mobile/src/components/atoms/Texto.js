// ÁTOMO: Texto
// Todo el texto de la app pasa por acá, así siempre usa la tipografía y los colores del tema.
//
// <Texto variante="titulo">Convenios</Texto>
// <Texto variante="cuerpoChico" color="secundario">Facultad de Ingeniería</Texto>

import { Text } from "react-native";
import { useTema } from "../../theme";

// Nombre corto del color -> clave dentro de los colores del tema.
const COLORES = {
  principal: "texto",
  secundario: "textoSecundario",
  tenue: "textoTenue",
  primario: "primarioTexto",
  peligro: "peligroTexto",
};

/**
 * @param {import("react-native").TextProps & {
 *   variante?: "titulo" | "subtitulo" | "cuerpo" | "cuerpoChico" | "destacado" | "etiqueta" | "boton" | "insignia",
 *   color?: "principal" | "secundario" | "tenue" | "primario" | "peligro" | (string & {}),
 * }} props
 */
export default function Texto({ variante = "cuerpo", color = "principal", style, children, ...props }) {
  const { colores, tipografia } = useTema();
  return (
    <Text style={[tipografia[variante], { color: colores[COLORES[color]] ?? color }, style]} {...props}>
      {children}
    </Text>
  );
}
