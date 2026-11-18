/**
 * Modelo de dominio: Convenio.
 * Mismos nombres de campos (snake_case) y valores que database/schema.sql y web/CONTRATO-API.md §4.
 */

/** ENUM convenios.estado: circuito borrador → revisión → aprobado → firmado (→ rescindido / archivado). */
export type EstadoConvenio = 'borrador' | 'revision' | 'aprobado' | 'firmado' | 'rescindido' | 'archivado';

/** ENUM convenios.tipo. Marco = acuerdo general (padre); específico, adenda y pasantía cuelgan de él. */
export type TipoConvenio = 'marco' | 'especifico' | 'adenda' | 'pasantia';

/** Vigencia de un convenio firmado (no es un estado: se calcula con las fechas). */
export type Vigencia = 'vigente' | 'proximo' | 'vencido' | 'sin_vencimiento' | 'aun_no_vigente';

export type TipoVinculo = 'especifico_de' | 'adenda_de' | 'renovacion_de' | 'sustitucion_de';

export type TipoDocumento = 'convenio_firmado' | 'anexo' | 'dictamen' | 'resolucion' | 'acta_pasantia' | 'otro';

export interface Unidad {
  id: number;
  nombre: string;
  codigo: string | null;
}

/** Nombre corto de un usuario en las relaciones (creador, revisor, quien subió un documento…). */
export interface UsuarioResumen {
  id: number;
  nombre: string;
}

/** Ítem del listado GET /agreements: los campos de la tabla convenios más la unidad. */
export interface Convenio {
  id: number;
  codigo: string; // ej: "CONV-2026-004"
  titulo: string;
  tipo: TipoConvenio;
  estado: EstadoConvenio;
  unidad_id: number;
  resumen: string | null;
  fecha_inicio: string | null; // AAAA-MM-DD
  fecha_fin: string | null; // null = sin vencimiento registrado
  dias_preaviso: number | null;
  version: number;
  creado_por: number;
  creado_en?: string;
  unidad: Unidad | null;
}

/** Institución firmante (tabla partes) con su rol en el convenio. */
export interface Parte {
  id: number;
  nombre: string;
  cuit_cuil: string | null;
  tipo_personeria: 'fisica' | 'juridica';
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  pivot: { rol_en_convenio: string | null };
}

export interface Persona {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string | null;
  telefono?: string | null;
}

export interface PersonaConvenio extends Persona {
  pivot: { rol: string };
}

export interface DetallePasantia {
  id: number;
  estudiante_persona_id: number;
  tutor_academico_persona_id: number | null;
  tutor_institucion_persona_id: number | null;
  estudiante: Persona | null;
  tutor_academico: Persona | null;
  tutor_institucion: Persona | null;
  carrera: string;
  horas_semanales: number;
  monto_estimulo: number | null;
  aseguradora: string | null;
  numero_poliza: string | null;
}

export type ConvenioRelacionado = Pick<Convenio, 'id' | 'codigo' | 'titulo' | 'tipo' | 'estado'>;

export interface Vinculo {
  id: number;
  convenio_origen_id: number;
  convenio_destino_id: number;
  tipo_vinculo: TipoVinculo;
  convenio_destino?: ConvenioRelacionado | null;
  convenio_origen?: ConvenioRelacionado | null;
}

export interface Documento {
  id: number;
  tipo_documento: TipoDocumento;
  nombre_original: string;
  tamano_bytes: number;
  hash_sha256: string;
  version: number;
  subido_por: number;
  usuario: UsuarioResumen | null;
  creado_en: string;
}

/** Registro de transiciones_estado: es el "movimiento" de un convenio. */
export interface Transicion {
  id: number;
  estado_anterior: EstadoConvenio | null;
  estado_nuevo: EstadoConvenio;
  motivo: string;
  cambiado_por: number;
  usuario: UsuarioResumen | null;
  creado_en: string;
}

export interface Observacion {
  id: number;
  observacion: string;
  esta_resuelta: number | boolean;
  respuesta?: string | null;
  usuario_revisor_id: number;
  revisor: UsuarioResumen | null;
  creado_en: string;
}

/** Ficha completa GET /agreements/{id}. */
export interface ConvenioFicha extends Convenio {
  creador: UsuarioResumen | null;
  partes: Parte[];
  personas: PersonaConvenio[];
  detalle_pasantia: DetallePasantia | null;
  vinculos_origen: Vinculo[];
  vinculos_destino: Vinculo[];
  documentos: Documento[];
  transiciones: Transicion[];
  observaciones: Observacion[];
}

/** Paginador de Laravel (paginate()). */
export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page?: number;
  total: number;
}
