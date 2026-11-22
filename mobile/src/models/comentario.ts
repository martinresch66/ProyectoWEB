import type { Rol } from './usuario';

/** Comentario dentro de un convenio (GET /mobile/convenios/:id/comentarios). */
export interface Comentario {
  id: number;
  convenio_id: number;
  autor: { id: number; nombre: string; rol: Rol };
  /** Si es ofensivo, la API manda solo "Comentario ofensivo" (el original no sale de la base). */
  texto: string;
  es_ofensivo: boolean;
  /** true si lo escribió el usuario de la sesión. */
  es_mio: boolean;
  creado_en: string;
}

/** Comentarios de un convenio y si el usuario puede escribir (consulta solo lee). */
export interface ComentariosDeConvenio {
  convenio: { id: number; codigo: string; titulo: string };
  puede_comentar: boolean;
  comentarios: Comentario[];
}