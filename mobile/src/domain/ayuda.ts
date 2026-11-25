import type { IconName } from '@/components/atoms';

/**
 * Ayuda al usuario (T2): contenido del manual y de la ayuda de cada pantalla.
 * Está todo acá (y no en las pantallas) para mantenerlo en un solo lugar.
 */

/** Pantallas que tienen ayuda propia (el botón "?" de cada una). */
export type SeccionAyuda =
  | 'inicio'
  | 'buscar'
  | 'firmar'
  | 'perfil'
  | 'convenio'
  | 'documento'
  | 'comentarios'
  | 'subir'
  | 'archivo'
  | 'avisos'
  | 'identidad'
  | 'escuchar';

export interface Ayuda {
  titulo: string;
  icono: IconName;
  resumen: string;
  /** Qué se puede hacer, en orden. */
  pasos: string[];
  /** Consejos o aclaraciones. */
  consejos?: string[];
}

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export interface Manual {
  id: 'identidad' | 'firma';
  titulo: string;
  icono: IconName;
  resumen: string;
  pasos: { titulo: string; texto: string }[];
  problemas: PreguntaFrecuente[];
}

/** Manual de usuario: los dos procesos que pide el enunciado, paso a paso. */
export const MANUALES: Manual[] = [
  {
    id: 'identidad',
    titulo: 'Cómo registrar tu identidad',
    icono: 'finger-print-outline',
    resumen:
      'Registrá tu firma, tu rostro y tu huella una sola vez. Después vas a poder firmar convenios con un toque. Todo queda guardado solo en este celular.',
    pasos: [
      { titulo: 'Entrá a Registrar mi identidad', texto: 'Desde Mi Perfil, tocá "Registrar mi identidad".' },
      {
        titulo: 'Registrá tu firma',
        texto: 'Tocá "Registrar mi firma", dibujala con el dedo en el recuadro y tocá "Guardar firma". Confirmá con tu huella.',
      },
      {
        titulo: 'Registrá tu rostro',
        texto: 'Tocá "Registrar mi rostro" y sacate una foto de frente, con buena luz. Recortala y confirmá con tu huella.',
      },
      {
        titulo: 'Registrá tu huella',
        texto: 'Tocá "Registrar mi huella" y apoyá el dedo en el sensor. La huella la valida el celular: nunca sale del sensor.',
      },
      {
        titulo: 'Listo',
        texto: 'Las tres partes quedan marcadas como registradas. Al firmar un convenio vas a ver el botón "Usar mi firma".',
      },
    ],
    problemas: [
      {
        pregunta: 'Mi celular dice que no tengo huella registrada',
        respuesta: 'Agregá una huella en los ajustes de seguridad del celular (Ajustes > Seguridad) y volvé a la app.',
      },
      {
        pregunta: 'Cambié de celular',
        respuesta: 'La identidad se guarda solo en el celular donde la registraste: hacé estos pasos de nuevo en el nuevo.',
      },
      {
        pregunta: 'Quiero borrar mis datos',
        respuesta: 'En Registrar mi identidad, tocá "Borrar mi identidad de este celular". Los convenios ya firmados no cambian.',
      },
    ],
  },
  {
    id: 'firma',
    titulo: 'Cómo firmar un convenio',
    icono: 'create-outline',
    resumen:
      'Solo administración y gestión firman, y solo convenios aprobados. La firma lleva tu firma manuscrita, tu huella, la fecha, la hora y el lugar.',
    pasos: [
      {
        titulo: 'Buscá el convenio',
        texto: 'Abrí la pestaña "Firmar" (o la caja "Esperando firma" del Inicio) y tocá el convenio.',
      },
      { titulo: 'Leelo completo', texto: 'Se abre el documento en PDF. Pellizcá para hacer zoom y deslizá para pasar de página.' },
      { titulo: 'Tocá "Firmar convenio"', texto: 'Se abre el recuadro de firma.' },
      {
        titulo: 'Dibujá tu firma',
        texto: 'Firmá con el dedo, o tocá "Usar mi firma" si la registraste. Con "Borrar" empezás de nuevo.',
      },
      {
        titulo: 'Confirmá con tu huella',
        texto: 'Tocá "Firmar con huella" y apoyá el dedo. En ese momento se toma la ubicación: permití el acceso si la app lo pide.',
      },
      {
        titulo: 'Listo',
        texto: 'El convenio pasa a "Firmado" y el PDF muestra tu firma con la fecha, la hora y el lugar. Podés compartirlo o mandarlo por mail.',
      },
    ],
    problemas: [
      {
        pregunta: 'Dice "El convenio cambió mientras lo leías"',
        respuesta: 'Alguien lo modificó o ya lo firmó. Por seguridad solo se firma la versión que leíste: volvé a abrirlo.',
      },
      {
        pregunta: 'No veo el botón "Firmar convenio"',
        respuesta: 'Tu rol no firma (revisión o consulta) o el convenio no está aprobado.',
      },
      {
        pregunta: 'No se pudo obtener la ubicación',
        respuesta: 'Activá la ubicación del celular y permitila para la app. Sin ubicación no se puede firmar.',
      },
    ],
  },
];

/** Ayuda de cada pantalla (se abre con el botón "?" del encabezado). */
export const AYUDAS: Record<SeccionAyuda, Ayuda> = {
  inicio: {
    titulo: 'Inicio',
    icono: 'home-outline',
    resumen: 'Un vistazo rápido a los convenios que podés ver según tu rol y tu unidad.',
    pasos: [
      'Las cajas cuentan los convenios firmados en el último año, vigentes, próximos a vencer, en trámite y esperando firma. Tocá una para ver la lista.',
      '"Mis pendientes" aparece si tu rol firma (administración o gestión).',
      '"Últimos movimientos" muestra lo último que pasó en cada convenio. Tocá uno para abrir su ficha.',
      'Deslizá hacia abajo para actualizar.',
    ],
    consejos: [
      'La campanita de arriba muestra los avisos nuevos.',
      'Sin conexión, el Inicio muestra solo los convenios pendientes de firma guardados en el celular.',
    ],
  },
  buscar: {
    titulo: 'Buscar',
    icono: 'search-outline',
    resumen: 'Encontrá convenios por texto y filtros, y mirá cada uno con su convenio padre, sus hijos, resoluciones y documentos.',
    pasos: [
      'Escribí parte del código (ej: CONV-2026), del título o del resumen.',
      'Elegí filtros: año, tipo, estado, unidad académica o vigencia. Tocá "Todos" para sacar uno, o "Limpiar" para sacarlos todos.',
      'Los resultados salen en árbol: el convenio padre arriba y, adentro, sus resoluciones, su documentación y sus convenios hijos.',
      'Tocá la flecha de la derecha para desplegar todo el árbol (con los hijos ya abiertos) o para plegarlo. Tocá el resto de la tarjeta para abrir la ficha del convenio, o un documento para verlo.',
    ],
    consejos: [
      'El buscador del encabezado de cada pestaña te trae directo acá.',
      'Lo marcado con "Coincide" cumple tu búsqueda; el resto aparece para que veas la familia completa.',
    ],
  },
  firmar: {
    titulo: 'Por firmar',
    icono: 'create-outline',
    resumen: 'Los convenios aprobados que esperan tu firma, del más reciente al más antiguo.',
    pasos: [
      'Tocá un convenio para leer el documento.',
      'Al final, tocá "Firmar convenio", dibujá tu firma y confirmá con tu huella.',
    ],
    consejos: [
      'Solo administración y gestión firman. Los demás roles ven un aviso.',
      'Si registrás tu identidad, podés usar tu firma guardada con un toque.',
      'Sin conexión podés leer los pendientes guardados, pero para firmar necesitás conexión.',
    ],
  },
  perfil: {
    titulo: 'Mi Perfil',
    icono: 'person-circle-outline',
    resumen: 'Tus datos y cómo querés usar la app.',
    pasos: [
      'Foto: sacá una con la cámara o elegila de la galería. Se guarda en miniatura solo en este celular.',
      'Apariencia: modo claro u oscuro y tamaño de letra.',
      'Notificaciones: cada cuánto recordarte los convenios por firmar. "Probar" muestra una de ejemplo.',
      'Seguridad: entrar con huella y cerrar sesión.',
      'Registrar mi identidad, Avisos y este manual.',
    ],
  },
  convenio: {
    titulo: 'Ficha del convenio',
    icono: 'document-text-outline',
    resumen: 'Todos los datos del convenio: estado, vigencia, partes, documentos e historial.',
    pasos: [
      '"Leer y firmar" (o "Ver el documento") abre el PDF del convenio.',
      '"Escuchar el convenio" lo lee en voz alta, cláusula por cláusula.',
      '"Comentarios" abre la conversación sobre este convenio.',
      'En "Documentos" tocá uno para ver su detalle. Con "Subir PDF" agregás documentación (si tu rol puede).',
      '"Historial" muestra cada cambio de estado, quién lo hizo y cuándo.',
    ],
  },
  documento: {
    titulo: 'Documento del convenio',
    icono: 'document-outline',
    resumen: 'El convenio en PDF, para leerlo, compartirlo y firmarlo.',
    pasos: [
      'Pellizcá para hacer zoom y deslizá para pasar de página.',
      'Compartilo o mandalo por mail desde los botones.',
      'Si está aprobado y tu rol firma, tocá "Firmar convenio".',
    ],
    consejos: ['Un convenio firmado muestra quién lo firmó, cuándo y dónde.'],
  },
  comentarios: {
    titulo: 'Comentarios',
    icono: 'chatbubbles-outline',
    resumen: 'Conversá con los demás usuarios sobre este convenio.',
    pasos: ['Escribí tu comentario (entre 2 y 1000 caracteres) y tocá "Publicar".', 'Los más nuevos aparecen primero.'],
    consejos: [
      'Administración, gestión y revisión pueden escribir. Consulta solo puede leer.',
      'Si un comentario tiene insultos, se guarda pero se muestra como "Comentario ofensivo".',
    ],
  },
  subir: {
    titulo: 'Subir documentación',
    icono: 'cloud-upload-outline',
    resumen: 'Agregá un PDF al convenio (anexo, dictamen, resolución, acta u otro).',
    pasos: ['Elegí el tipo de documento.', 'Tocá "Elegir PDF" (hasta 20 MB).', 'Tocá "Subir y marcar".'],
    consejos: [
      'La API le agrega una marca en los metadatos del PDF: tu usuario, el convenio, la fecha y la hora.',
      'Si el archivo se modifica después, la app lo detecta y no lo muestra.',
    ],
  },
  archivo: {
    titulo: 'Detalle del documento',
    icono: 'document-attach-outline',
    resumen: 'El PDF subido, con su marca y su control de integridad.',
    pasos: ['Mirá el documento en pantalla.', 'Tocá "Ver la marca completa" para ver quién lo subió, cuándo y desde dónde.', 'Compartilo desde el botón.'],
    consejos: ['"Integridad" compara el hash SHA-256: si no coincide, el archivo fue modificado.'],
  },
  avisos: {
    titulo: 'Avisos',
    icono: 'notifications-outline',
    resumen: 'Lo que pasó en tus convenios en los últimos 7 días, también lo hecho desde la web.',
    pasos: ['Tocá un aviso para abrir el convenio, sus comentarios o el documento.', 'Deslizá hacia abajo para actualizar.'],
    consejos: [
      'Con la app abierta se revisa cada minuto y te llega como notificación.',
      'En Mi Perfil elegís cada cuánto recordarte los convenios por firmar.',
    ],
  },
  identidad: {
    titulo: 'Registrar mi identidad',
    icono: 'finger-print-outline',
    resumen: 'Tu firma, tu rostro y tu huella, guardados solo en este celular, para firmar más rápido.',
    pasos: [
      'Registrá tu firma: dibujala y guardala.',
      'Registrá tu rostro: una foto de frente.',
      'Registrá tu huella con el sensor.',
      'Cada paso se confirma con tu huella.',
    ],
    consejos: ['El manual completo tiene el paso a paso y qué hacer si algo falla.'],
  },
  escuchar: {
    titulo: 'Escuchar el convenio',
    icono: 'headset-outline',
    resumen: 'El celular te lee el convenio en voz alta: el mismo documento que se firma, cláusula por cláusula.',
    pasos: [
      'Tocá el botón grande para empezar. Al terminar una sección sigue sola con la próxima.',
      'Con las flechas pasás a la sección anterior o a la siguiente.',
      'En "Secciones" tocá cualquier cláusula para escucharla directamente.',
      'Elegí la velocidad: 0,75x más lento, 1,5x más rápido.',
      'Abajo del reproductor ves el texto de la sección, para seguirlo con la vista.',
    ],
    consejos: [
      'Usa la voz del celular, así que funciona aunque estés con datos limitados (solo necesita conexión para cargar el texto).',
      'Si cambiás la velocidad o pausás, sigue desde la palabra en la que iba (no vuelve al principio de la sección).',
      'Si salís de la pantalla, la lectura se pausa. Al volver, tocá el botón para seguir desde donde quedó.',
      'Si se escucha con acento extranjero, instalá la voz en español en Ajustes > Accesibilidad > Texto a voz.',
    ],
  },
};