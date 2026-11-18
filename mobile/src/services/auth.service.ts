import type { CanalMfa, DestinoMfa, Sesion, Usuario } from '@/models';

import { adaptarSesion, adaptarUsuario } from './api/adaptadores';
import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

export interface LoginRespuesta {
  mfa_token: string;
  canales: DestinoMfa[];
}

export interface EnvioCodigoRespuesta {
  canal: CanalMfa;
  destino: string;
  vence_en: string;
  reenviar_en_segundos: number;
  /** Mensaje simulado (mail/SMS) que la app muestra como notificación. */
  simulacion?: { titulo: string; cuerpo: string };
}

/** Llamadas de sesión. Las de login son públicas (auth: false). */
export const authService = {
  login(email: string, password: string) {
    return apiRequest<LoginRespuesta>(ENDPOINTS.loginMovil, { method: 'POST', body: { email, password }, auth: false });
  },

  enviarCodigo(mfaToken: string, canal: CanalMfa) {
    return apiRequest<EnvioCodigoRespuesta>(ENDPOINTS.enviarCodigo, {
      method: 'POST',
      body: { mfa_token: mfaToken, canal },
      auth: false,
    });
  },

  async verificarCodigo(mfaToken: string, codigo: string, deviceId: string): Promise<Sesion> {
    const json = await apiRequest<unknown>(ENDPOINTS.verificarCodigo, {
      method: 'POST',
      body: { mfa_token: mfaToken, codigo, device_id: deviceId },
      auth: false,
    });
    return adaptarSesion(json);
  },

  async refrescar(refreshToken: string): Promise<Sesion> {
    const json = await apiRequest<unknown>(ENDPOINTS.refrescar, {
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: false,
    });
    return adaptarSesion(json);
  },

  /** Cierra la sesión en el servidor (revoca el token y el refresh token). */
  logout(token: string, refreshToken: string | null) {
    return apiRequest<void>(ENDPOINTS.logout, {
      method: 'POST',
      body: refreshToken ? { refresh_token: refreshToken } : undefined,
      auth: false,
      token,
    });
  },

  async me(): Promise<Usuario> {
    return adaptarUsuario(await apiRequest<unknown>(ENDPOINTS.usuarioActual));
  },

  activarHuella(deviceId: string, deviceName: string) {
    return apiRequest<{ device_token: string }>(ENDPOINTS.activarHuella, {
      method: 'POST',
      body: { device_id: deviceId, device_name: deviceName },
    });
  },

  async loginConHuella(deviceId: string, deviceToken: string): Promise<Sesion> {
    const json = await apiRequest<unknown>(ENDPOINTS.loginConHuella, {
      method: 'POST',
      body: { device_id: deviceId, device_token: deviceToken },
      auth: false,
    });
    return adaptarSesion(json);
  },

  desactivarHuella(deviceId: string) {
    return apiRequest<void>(ENDPOINTS.desactivarHuella, { method: 'POST', body: { device_id: deviceId } });
  },
};
