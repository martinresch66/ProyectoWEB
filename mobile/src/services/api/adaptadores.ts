/**
 * Adaptadores: convierten el JSON que llega a la forma que usa la app.
 * El contrato acepta variantes (objeto pelado o envuelto en { data }, `token` o `access_token`,
 * `user` o `usuario`, `creado_en` o `created_at`), así que se normaliza todo acá, igual que
 * web/lib/api/adaptadores.js. Si Laravel devuelve algo distinto, se ajusta solo este archivo.
 */
import type { Convenio, ConvenioFicha, Paginado, Sesion, Usuario } from '@/models';

type Json = Record<string, unknown>;

/** Saca el objeto de un posible { data: ... } (API Resources de Laravel). */
export function desenvolver<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json && !Array.isArray(json) && !('current_page' in json)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

function conFechas<T extends Json>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  return { ...obj, creado_en: obj.creado_en ?? obj.created_at } as T;
}

export function adaptarUsuario(json: unknown): Usuario {
  const u = desenvolver<Json>(json);
  return { ...u, unidad_id: (u.unidad_id as number | null) ?? null, unidad: (u.unidad as Usuario['unidad']) ?? null } as Usuario;
}

export function adaptarSesion(json: unknown): Sesion {
  const j = desenvolver<Json>(json);
  return {
    token: String(j.token ?? j.access_token ?? j.plainTextToken ?? ''),
    refresh_token: (j.refresh_token as string | undefined) ?? null,
    user: adaptarUsuario(j.user ?? j.usuario),
  };
}

export function adaptarConvenio(json: unknown): Convenio {
  return conFechas(desenvolver<Json>(json)) as unknown as Convenio;
}

/** Listado: array simple o paginador de Laravel (con o sin `meta`). */
export function adaptarListado(json: unknown): Paginado<Convenio> {
  if (Array.isArray(json)) {
    return { data: json.map(adaptarConvenio), current_page: 1, last_page: 1, total: json.length };
  }
  const j = json as Json & { meta?: Json };
  const meta = j.meta ?? j;
  const data = (j.data as unknown[]) ?? [];
  return {
    data: data.map(adaptarConvenio),
    current_page: Number(meta.current_page ?? 1),
    last_page: Number(meta.last_page ?? 1),
    per_page: Number(meta.per_page ?? data.length),
    total: Number(meta.total ?? data.length),
  };
}

export function adaptarFicha(json: unknown): ConvenioFicha {
  const c = conFechas(desenvolver<Json>(json));
  const lista = (...claves: string[]) => (claves.map((k) => c[k]).find(Array.isArray) as Json[] | undefined) ?? [];
  return {
    ...(c as unknown as ConvenioFicha),
    partes: lista('partes') as unknown as ConvenioFicha['partes'],
    personas: lista('personas') as unknown as ConvenioFicha['personas'],
    detalle_pasantia: (c.detalle_pasantia as ConvenioFicha['detalle_pasantia']) ?? null,
    vinculos_origen: lista('vinculos_origen', 'vinculos_como_origen') as unknown as ConvenioFicha['vinculos_origen'],
    vinculos_destino: lista('vinculos_destino', 'vinculos_como_destino') as unknown as ConvenioFicha['vinculos_destino'],
    documentos: lista('documentos').map(conFechas) as unknown as ConvenioFicha['documentos'],
    transiciones: lista('transiciones', 'transiciones_estado').map(conFechas) as unknown as ConvenioFicha['transiciones'],
    observaciones: lista('observaciones', 'observaciones_revision').map(conFechas) as unknown as ConvenioFicha['observaciones'],
  };
}
