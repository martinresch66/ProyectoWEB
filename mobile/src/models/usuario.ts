import type { Unidad } from './convenio';

/** ENUM usuarios.rol. */
export type Rol = 'admin' | 'gestion' | 'revision' | 'consulta';

/** Objeto `user` de /auth/login y /auth/me (CONTRATO-API.md §3). */
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  /** null = alcance global (admin / revisor general). */
  unidad_id: number | null;
  activo: number | boolean;
  unidad: Unidad | null;
}

/** Sesión de la app: token Bearer + refresh token para renovarlo sin pedir la contraseña. */
export interface Sesion {
  token: string;
  /** Solo lo da la API de la app móvil (el login del contrato no lo tiene). */
  refresh_token: string | null;
  user: Usuario;
}

export type CanalMfa = 'email' | 'sms' | 'push';

export interface DestinoMfa {
  canal: CanalMfa;
  destino: string;
}
