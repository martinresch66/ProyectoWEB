// Pantalla provisoria: catálogo de componentes.
// Sirve para ver todos los átomos, moléculas y organismos juntos, probar el modo claro/oscuro
// y sacar capturas para documentar el Atomic Design. Se reemplazará por el panel real.

import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/theme';
import Texto from '@/components/atoms/Texto';
import Boton from '@/components/atoms/Boton';
import CampoFormulario from '@/components/molecules/CampoFormulario';
import InsigniaEstado from '@/components/molecules/InsigniaEstado';
import Nota from '@/components/molecules/Nota';
import Tarjeta from '@/components/molecules/Tarjeta';
import TarjetaConvenio from '@/components/organisms/TarjetaConvenio';

// Datos ficticios, solo para esta pantalla.
const CONVENIOS_DE_PRUEBA = [
  {
    id: 1,
    codigo: 'CM-2026-001',
    titulo: 'Convenio marco de colaboración con Cooperativa Agrícola del Oeste',
    tipo: 'marco',
    estado: 'firmado',
    unidad: { nombre: 'Facultad de Ingeniería' },
    fecha_inicio: '2026-01-15',
    fecha_fin: '2028-01-15',
    dias_preaviso: 60,
  },
  {
    id: 2,
    codigo: 'PAS-2026-014',
    titulo: 'Pasantía en Laboratorio de Software Pampeano',
    tipo: 'pasantia',
    estado: 'firmado',
    unidad: { nombre: 'Facultad de Ingeniería' },
    fecha_inicio: '2026-03-01',
    fecha_fin: '2026-11-20',
    dias_preaviso: 30,
  },
  {
    id: 3,
    codigo: 'CE-2026-007',
    titulo: 'Específico de asistencia técnica en sistemas de riego',
    tipo: 'especifico',
    estado: 'revision',
    unidad: { nombre: 'Facultad de Agronomía' },
    fecha_inicio: null,
    fecha_fin: null,
  },
];

const MODOS = [
  { valor: 'sistema', texto: 'Sistema' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
] as const;

const ESTADOS_DE_PRUEBA = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];

export default function CatalogoComponentes() {
  const { colores, espacios, preferencia, cambiarPreferencia } = useTema();
  const margenes = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espacios.lg,
        paddingTop: margenes.top + espacios.lg,
        gap: espacios.xl,
      }}
    >
      <View style={{ gap: espacios.xs }}>
        <Texto variante="titulo" accessibilityRole="header">
          Catálogo de componentes
        </Texto>
        <Texto variante="cuerpoChico" color="secundario">
          Átomos, moléculas y organismos de la app, con los colores del web.
        </Texto>
      </View>

      <Tarjeta titulo="Apariencia">
        <View style={{ flexDirection: 'row', gap: espacios.sm }}>
          {MODOS.map((modo) => (
            <Boton
              key={modo.valor}
              variante={preferencia === modo.valor ? 'primario' : 'secundario'}
              onPress={() => cambiarPreferencia(modo.valor)}
              style={{ flex: 1 }}
            >
              {modo.texto}
            </Boton>
          ))}
        </View>
      </Tarjeta>

      <Tarjeta titulo="Botones">
        <Boton onPress={() => {}}>Guardar borrador</Boton>
        <Boton variante="secundario" onPress={() => {}}>
          Cancelar
        </Boton>
        <Boton variante="peligro" onPress={() => {}}>
          Rescindir
        </Boton>
        <Boton variante="texto" onPress={() => {}}>
          Ver historial
        </Boton>
        <Boton cargando onPress={() => {}}>
          Enviando
        </Boton>
        <Boton deshabilitado onPress={() => {}}>
          Aprobar
        </Boton>
      </Tarjeta>

      <Tarjeta titulo="Estados del convenio">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacios.sm }}>
          {ESTADOS_DE_PRUEBA.map((estado) => (
            <InsigniaEstado key={estado} estado={estado} />
          ))}
        </View>
      </Tarjeta>

      <Tarjeta titulo="Formulario">
        <CampoFormulario
          etiqueta="Correo electrónico"
          obligatorio
          placeholder="nombre@unlpam.edu.ar"
          keyboardType="email-address"
          autoCapitalize="none"
          ayuda="Usá tu correo institucional."
        />
        <CampoFormulario etiqueta="Código del convenio" obligatorio error="Ya existe un convenio con este código." />
      </Tarjeta>

      <View style={{ gap: espacios.md }}>
        <Nota tipo="info">Los cambios se sincronizan al recuperar la conexión.</Nota>
        <Nota tipo="alerta" titulo="Sin conexión">
          Estás viendo la última copia guardada en este equipo.
        </Nota>
        <Nota tipo="error">No se pudo enviar a revisión: faltan partes firmantes.</Nota>
        <Nota tipo="exito">Convenio enviado a revisión.</Nota>
      </View>

      <View style={{ gap: espacios.md }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          Convenios
        </Texto>
        {CONVENIOS_DE_PRUEBA.map((convenio) => (
          <TarjetaConvenio key={convenio.id} convenio={convenio} onPress={() => {}} />
        ))}
      </View>
    </ScrollView>
  );
}
