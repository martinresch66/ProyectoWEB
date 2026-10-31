// MOLÉCULA: Campo de formulario
// Átomos Texto + Entrada: etiqueta, campo, texto de ayuda y mensaje de error, como en el web.
// El lector de pantalla anuncia la etiqueta, si es obligatorio y la ayuda o el error.
//
// <CampoFormulario
//   etiqueta="Correo electrónico"
//   obligatorio
//   value={correo}
//   onChangeText={setCorreo}
//   error={errores.correo}
//   keyboardType="email-address"
//   autoCapitalize="none"
// />

import { View } from "react-native";
import { useTema } from "../../theme";
import Texto from "../atoms/Texto";
import Entrada from "../atoms/Entrada";

/**
 * Además de estas, acepta cualquier propiedad de TextInput (value, onChangeText, placeholder...).
 * @param {Omit<import("react-native").TextInputProps, "style"> & {
 *   etiqueta: string,
 *   ayuda?: string,
 *   error?: string,
 *   obligatorio?: boolean,
 *   style?: import("react-native").StyleProp<import("react-native").ViewStyle>,
 * }} props
 */
export default function CampoFormulario({ etiqueta, ayuda, error, obligatorio = false, style, ...propsEntrada }) {
  const { espacios } = useTema();

  return (
    <View style={[{ gap: 6 }, style]}>
      {/* La etiqueta visible se oculta al lector de pantalla porque ya la anuncia el campo. */}
      <Texto variante="etiqueta" color="secundario" importantForAccessibility="no">
        {etiqueta}
        {obligatorio && <Texto variante="etiqueta" color="peligro"> *</Texto>}
      </Texto>

      <Entrada
        error={Boolean(error)}
        accessibilityLabel={obligatorio ? `${etiqueta}, obligatorio` : etiqueta}
        accessibilityHint={error || ayuda}
        {...propsEntrada}
      />

      {error ? (
        <Texto variante="cuerpoChico" color="peligro" accessibilityLiveRegion="polite">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="cuerpoChico" color="tenue" style={{ marginTop: espacios.xs / 2 }}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}
