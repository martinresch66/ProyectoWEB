// ÁTOMO: Entrada de texto
// Campo de texto con el estilo del web: borde gris, borde azul más grueso al enfocarlo
// (foco visible) y borde rojo cuando tiene error.
// Recibe además cualquier propiedad de TextInput (placeholder, value, onChangeText, secureTextEntry...).

import { useState } from "react";
import { TextInput } from "react-native";
import { useTema } from "../../theme";

/**
 * @param {import("react-native").TextInputProps & { error?: boolean }} props
 */
export default function Entrada({ error = false, editable = true, style, onFocus, onBlur, ...props }) {
  const { colores, radios, espacios, tamanoTactil, tipografia } = useTema();
  const [enfocado, setEnfocado] = useState(false);

  const anchoBorde = error || enfocado ? 2 : 1;
  const colorBorde = error ? colores.peligroTexto : enfocado ? colores.foco : colores.bordeFuerte;

  // En los campos de texto de Android, lineHeight desalinea el texto: usamos solo fuente y tamaño.
  const { lineHeight, ...fuente } = tipografia.cuerpo;

  return (
    <TextInput
      editable={editable}
      placeholderTextColor={colores.textoTenue}
      onFocus={(e) => {
        setEnfocado(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEnfocado(false);
        onBlur?.(e);
      }}
      style={[
        fuente,
        {
          minHeight: tamanoTactil,
          borderRadius: radios.md,
          borderWidth: anchoBorde,
          borderColor: colorBorde,
          // Compensa el borde más grueso para que el texto no "salte" al enfocar.
          paddingHorizontal: espacios.md - (anchoBorde - 1),
          backgroundColor: editable ? colores.superficie : colores.superficieSuave,
          color: editable ? colores.texto : colores.textoSecundario,
        },
        style,
      ]}
      {...props}
    />
  );
}
