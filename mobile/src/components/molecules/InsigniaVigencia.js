// MOLÉCULA: Insignia de vigencia
// La vigencia no es un estado guardado: se calcula con las fechas del convenio firmado
// (calcularVigencia de src/domain/dominio.js, la misma función que usa el web).
// Si el convenio no está firmado, no muestra nada.

import { useTema } from "../../theme";
import { calcularVigencia } from "../../domain/dominio";
import Insignia from "../atoms/Insignia";

/** @param {{ convenio: Record<string, any> }} props */
export default function InsigniaVigencia({ convenio }) {
  const { colores } = useTema();
  const vigencia = calcularVigencia(convenio);
  if (!vigencia) return null;

  const color = colores.vigencia[vigencia.clave];
  return (
    <Insignia
      texto={vigencia.etiqueta}
      fondo={color.fondo}
      colorTexto={color.texto}
      borde={color.borde}
      accessibilityLabel={`Vigencia: ${vigencia.etiqueta}`}
    />
  );
}
