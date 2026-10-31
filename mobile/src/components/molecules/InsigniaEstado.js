// MOLÉCULA: Insignia de estado
// Átomo Insignia + reglas del dominio: muestra el estado del convenio (Borrador, En revisión,
// Aprobado, Firmado, Rescindido, Archivado) con el mismo color que en el web.

import { useTema } from "../../theme";
import { ESTADOS } from "../../domain/dominio";
import Insignia from "../atoms/Insignia";

/** @param {{ estado: string }} props */
export default function InsigniaEstado({ estado }) {
  const { colores } = useTema();
  const color = colores.estados[estado] ?? colores.estados.borrador;
  const texto = ESTADOS[estado] ?? estado;
  return <Insignia texto={texto} fondo={color.fondo} colorTexto={color.texto} accessibilityLabel={`Estado: ${texto}`} />;
}
