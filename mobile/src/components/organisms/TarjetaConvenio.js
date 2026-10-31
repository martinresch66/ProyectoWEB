// ORGANISMO: Tarjeta de convenio
// Resume un convenio en el listado: código, título, tipo, unidad, estado, vigencia y vencimiento.
// Combina átomos (Texto) y moléculas (InsigniaEstado, InsigniaVigencia).
// Es el equivalente móvil de una fila de la tabla de convenios del web: en una pantalla
// angosta, una tarjeta por convenio se lee mejor que una tabla con siete columnas.

import { Pressable, View } from "react-native";
import { useTema } from "../../theme";
import { ESTADOS, TIPOS, calcularVigencia, formatearFecha } from "../../domain/dominio";
import Texto from "../atoms/Texto";
import InsigniaEstado from "../molecules/InsigniaEstado";
import InsigniaVigencia from "../molecules/InsigniaVigencia";

function textoVencimiento(convenio) {
  if (convenio.fecha_fin) return `Vence el ${formatearFecha(convenio.fecha_fin)}`;
  if (convenio.estado === "firmado") return "Sin vencimiento registrado";
  return null;
}

/** @param {{ convenio: Record<string, any>, onPress?: () => void }} props */
export default function TarjetaConvenio({ convenio, onPress }) {
  const { colores, radios, espacios } = useTema();

  const tipo = TIPOS[convenio.tipo] ?? convenio.tipo;
  const unidad = convenio.unidad?.nombre;
  const vencimiento = textoVencimiento(convenio);
  const vigencia = calcularVigencia(convenio);

  // Lo que lee el lector de pantalla al llegar a la tarjeta, en una sola frase ordenada.
  const descripcion = [
    convenio.codigo,
    convenio.titulo,
    tipo,
    unidad,
    `Estado: ${ESTADOS[convenio.estado] ?? convenio.estado}`,
    vigencia?.etiqueta,
    vencimiento,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      accessibilityHint="Abre la ficha del convenio"
      style={({ pressed }) => ({
        backgroundColor: pressed ? colores.superficieSuave : colores.superficie,
        borderWidth: 1,
        borderColor: colores.borde,
        borderRadius: radios.lg,
        padding: espacios.lg,
        gap: espacios.sm,
      })}
    >
      <Texto variante="destacado" color="secundario">
        {convenio.codigo}
      </Texto>

      <Texto variante="subtitulo" numberOfLines={2}>
        {convenio.titulo}
      </Texto>

      <View>
        <Texto variante="cuerpoChico" color="secundario">
          {tipo}
        </Texto>
        {unidad && (
          <Texto variante="cuerpoChico" color="secundario">
            {unidad}
          </Texto>
        )}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacios.sm }}>
        <InsigniaEstado estado={convenio.estado} />
        <InsigniaVigencia convenio={convenio} />
      </View>

      {vencimiento && (
        <Texto variante="cuerpoChico" color="tenue">
          {vencimiento}
        </Texto>
      )}
    </Pressable>
  );
}
