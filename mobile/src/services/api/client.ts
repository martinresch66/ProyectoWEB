import { env } from '@/config/env';

/** Error de la API con un mensaje listo para mostrar al usuario. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** Código HTTP, o null si no hubo respuesta (sin conexión, API apagada). */
    public status: number | null,
    /** Errores de validación por campo (422 de Laravel): { campo: ["mensaje"] }. */
    public errores: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** false para las rutas públicas (login, MFA, refresh). Por defecto se envía el token de la sesión. */
  auth?: boolean;
  /** Token a usar en lugar del de la sesión (por ejemplo, al cerrar sesión). */
  token?: string;
}

/**
 * Conexión entre el cliente HTTP y la sesión (la configura AuthProvider).
 * Así el cliente puede agregar el token y renovarlo sin depender de React.
 */
interface AuthHooks {
  getAccessToken: () => string | null;
  /** Renueva el token. Devuelve el nuevo, o null si la sesión ya no es válida. */
  refresh: () => Promise<string | null>;
}

let authHooks: AuthHooks | null = null;

export function configureApiAuth(hooks: AuthHooks | null) {
  authHooks = hooks;
}

function buildUrl(path: string, query?: Query) {
  const url = `${env.apiUrl}${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return params ? `${url}?${params}` : url;
}

async function send(path: string, { method = 'GET', query, body }: RequestOptions, token: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);
  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con la API (${env.apiUrl}). Verificá que esté corriendo y que el celular esté en la misma red Wi-Fi.`,
      null,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Mensaje para el usuario según el código HTTP (§2 de CONTRATO-API.md). */
function mensajePorCodigo(status: number, mensaje?: string): string {
  if (mensaje) return mensaje;
  if (status === 401) return 'Tu sesión venció. Volvé a ingresar.';
  if (status === 403) return 'No tenés permiso para hacer esto.';
  if (status === 404) return 'No encontramos lo que buscabas.';
  if (status === 422) return 'Revisá los datos ingresados.';
  return `Error del servidor (${status}).`;
}

/**
 * Cliente HTTP único de la app. Agrega el token Bearer y, si la API responde 401 (token vencido),
 * renueva la sesión con el refresh token y reintenta una vez, sin que el usuario lo note.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false && authHooks !== null;
  const token = options.token ?? (useAuth ? authHooks!.getAccessToken() : null);

  let res = await send(path, options, token);

  if (res.status === 401 && useAuth && !options.token) {
    const newToken = await authHooks!.refresh();
    if (newToken) res = await send(path, options, newToken);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(mensajePorCodigo(res.status, data?.message), res.status, data?.errors ?? {});
  return data as T;
}
