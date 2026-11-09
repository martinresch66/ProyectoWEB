import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import type { CanalMfa, DestinoMfa, Sesion, Usuario } from '@/models';
import { ApiError, configureApiAuth } from '@/services/api/client';
import { authService, type EnvioCodigoRespuesta } from '@/services/auth.service';
import { autenticarConBiometria, obtenerBiometria, type BiometriaInfo } from '@/services/biometrics';
import { mostrarNotificacion } from '@/services/notifications';
import { SecureKeys, secureStorage } from '@/services/secureStorage';
import { storage } from '@/services/storage';
import { generarId } from '@/utils/id';

type Estado = 'cargando' | 'sin_sesion' | 'con_sesion';

/** Datos guardados al activar el ingreso con huella en este celular. */
interface HuellaGuardada {
  deviceToken: string;
  userId: number;
  nombre: string;
}

/** Login en curso: la contraseña ya se validó y falta el código MFA. */
interface MfaPendiente {
  mfaToken: string;
  canales: DestinoMfa[];
  email: string;
}

interface AuthContextValue {
  estado: Estado;
  usuario: Usuario | null;
  mfa: MfaPendiente | null;
  biometria: BiometriaInfo;
  /** Usuario que tiene activado el ingreso con huella en este celular (para el botón del login). */
  huellaDe: { nombre: string } | null;
  /** true si el usuario logueado tiene activo el ingreso con huella en este celular. */
  huellaActiva: boolean;
  /** true justo después de un login con contraseña, para ofrecer activar la huella. */
  ofrecerHuella: boolean;

  iniciarLogin: (email: string, password: string) => Promise<void>;
  enviarCodigo: (canal: CanalMfa) => Promise<EnvioCodigoRespuesta & { notificado: boolean }>;
  verificarCodigo: (codigo: string) => Promise<void>;
  cancelarLogin: () => void;
  ingresarConHuella: () => Promise<boolean>;
  activarHuella: () => Promise<boolean>;
  desactivarHuella: () => Promise<void>;
  descartarOfertaHuella: () => void;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function obtenerDeviceId(): Promise<string> {
  const guardado = await secureStorage.get<string>(SecureKeys.deviceId);
  if (guardado) return guardado;
  const nuevo = generarId();
  await secureStorage.set(SecureKeys.deviceId, nuevo);
  return nuevo;
}

/** Modelo del celular (ej: "SM-S948B"), para identificar el dispositivo con huella activada. */
function nombreDelCelular(): string {
  const constantes = Platform.constants as { Model?: string; Brand?: string };
  return [constantes.Brand, constantes.Model].filter(Boolean).join(' ') || 'Celular';
}

const ofertaKey = (userId: number) => `huella_ofrecida_${userId}`;

/**
 * Maneja la sesión del usuario:
 * - La guarda en el almacenamiento seguro: al volver a abrir la app no se pide login (ni hace falta internet).
 * - Conecta el cliente HTTP para enviar el token Bearer y renovarlo con el refresh token cuando vence.
 * - Login en dos pasos (contraseña + código MFA) e ingreso con huella.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mfa, setMfa] = useState<MfaPendiente | null>(null);
  const [biometria, setBiometria] = useState<BiometriaInfo>({ disponible: false, tipo: 'huella' });
  const [huella, setHuella] = useState<HuellaGuardada | null>(null);
  const [ofrecerHuella, setOfrecerHuella] = useState(false);

  const sesionRef = useRef<Sesion | null>(null);
  const refreshEnCurso = useRef<Promise<string | null> | null>(null);

  const guardarSesion = useCallback(async (sesion: Sesion) => {
    sesionRef.current = sesion;
    await secureStorage.set(SecureKeys.session, sesion);
    setUsuario(sesion.user);
    setEstado('con_sesion');
  }, []);

  const limpiarSesion = useCallback(async () => {
    sesionRef.current = null;
    await secureStorage.remove(SecureKeys.session);
    setUsuario(null);
    setOfrecerHuella(false);
    setEstado('sin_sesion');
  }, []);

  /** Renueva el token. Si varias pantallas lo piden a la vez, se hace un solo pedido. */
  const refrescar = useCallback((): Promise<string | null> => {
    const actual = sesionRef.current;
    if (!actual) return Promise.resolve(null);
    // Sin refresh token (por ejemplo, con el login del backend de Laravel) no se puede renovar.
    if (!actual.refresh_token) return limpiarSesion().then(() => null);
    if (!refreshEnCurso.current) {
      refreshEnCurso.current = authService
        .refrescar(actual.refresh_token)
        .then(async (nueva) => {
          await guardarSesion(nueva);
          return nueva.token;
        })
        .catch(async (err) => {
          // Solo se cierra la sesión si la API la rechazó. Sin conexión, se mantiene (modo offline).
          if (err instanceof ApiError && err.status === 401) {
            await limpiarSesion();
            return null;
          }
          throw err;
        })
        .finally(() => {
          refreshEnCurso.current = null;
        });
    }
    return refreshEnCurso.current;
  }, [guardarSesion, limpiarSesion]);

  // Arranque: recupera la sesión guardada (sin red) y el estado de la huella.
  useEffect(() => {
    configureApiAuth({ getAccessToken: () => sesionRef.current?.token ?? null, refresh: refrescar });

    (async () => {
      const [sesion, huellaGuardada, bio] = await Promise.all([
        secureStorage.get<Sesion>(SecureKeys.session),
        secureStorage.get<HuellaGuardada>(SecureKeys.biometric),
        obtenerBiometria(),
      ]);
      setBiometria(bio);
      setHuella(huellaGuardada);
      // Se descarta una sesión guardada con otro formato (versiones viejas de la app).
      if (sesion?.token && sesion.user?.rol) {
        sesionRef.current = sesion;
        setUsuario(sesion.user);
        setEstado('con_sesion');
      } else {
        setEstado('sin_sesion');
      }
    })();

    return () => configureApiAuth(null);
  }, [refrescar]);

  const iniciarLogin = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email.trim(), password);
    setMfa({ mfaToken: res.mfa_token, canales: res.canales, email: email.trim().toLowerCase() });
  }, []);

  const enviarCodigo = useCallback(
    async (canal: CanalMfa) => {
      if (!mfa) throw new Error('No hay un inicio de sesión en curso.');
      const res = await authService.enviarCodigo(mfa.mfaToken, canal);
      const notificado = res.simulacion ? await mostrarNotificacion(res.simulacion.titulo, res.simulacion.cuerpo) : false;
      return { ...res, notificado };
    },
    [mfa],
  );

  const verificarCodigo = useCallback(
    async (codigo: string) => {
      if (!mfa) throw new Error('No hay un inicio de sesión en curso.');
      const deviceId = await obtenerDeviceId();
      const sesion = await authService.verificarCodigo(mfa.mfaToken, codigo, deviceId);

      // ¿Ofrecer activar la huella? Solo si el celular la soporta, no está activa y no se ofreció antes.
      const yaOfrecida = await storage.get<boolean>(ofertaKey(sesion.user.id));
      const activa = huella?.userId === sesion.user.id;
      setOfrecerHuella(biometria.disponible && !activa && !yaOfrecida);

      setMfa(null);
      await guardarSesion(sesion);
    },
    [mfa, huella, biometria.disponible, guardarSesion],
  );

  const cancelarLogin = useCallback(() => setMfa(null), []);

  const ingresarConHuella = useCallback(async () => {
    if (!huella) return false;
    const ok = await autenticarConBiometria('Ingresá con tu huella');
    if (!ok) return false;
    try {
      const deviceId = await obtenerDeviceId();
      const sesion = await authService.loginConHuella(deviceId, huella.deviceToken);
      await guardarSesion(sesion);
      return true;
    } catch (err) {
      // La API ya no reconoce este dispositivo: se olvida la huella guardada.
      if (err instanceof ApiError && err.status === 401) {
        await secureStorage.remove(SecureKeys.biometric);
        setHuella(null);
      }
      throw err;
    }
  }, [huella, guardarSesion]);

  const activarHuella = useCallback(async () => {
    if (!usuario) return false;
    const ok = await autenticarConBiometria(`Confirmá tu ${biometria.tipo} para activarla`);
    if (!ok) return false;
    const deviceId = await obtenerDeviceId();
    const { device_token } = await authService.activarHuella(deviceId, nombreDelCelular());
    const datos: HuellaGuardada = { deviceToken: device_token, userId: usuario.id, nombre: usuario.nombre };
    await secureStorage.set(SecureKeys.biometric, datos);
    await storage.set(ofertaKey(usuario.id), true);
    setHuella(datos);
    setOfrecerHuella(false);
    return true;
  }, [usuario, biometria.tipo]);

  const desactivarHuella = useCallback(async () => {
    const deviceId = await obtenerDeviceId();
    await authService.desactivarHuella(deviceId).catch(() => {});
    await secureStorage.remove(SecureKeys.biometric);
    setHuella(null);
  }, []);

  const descartarOfertaHuella = useCallback(() => {
    if (usuario) storage.set(ofertaKey(usuario.id), true);
    setOfrecerHuella(false);
  }, [usuario]);

  const cerrarSesion = useCallback(async () => {
    const actual = sesionRef.current;
    // Se avisa a la API para invalidar los tokens; si no hay conexión, igual se cierra localmente.
    if (actual) await authService.logout(actual.token, actual.refresh_token).catch(() => {});
    await limpiarSesion();
  }, [limpiarSesion]);

  const value = useMemo<AuthContextValue>(
    () => ({
      estado,
      usuario,
      mfa,
      biometria,
      huellaDe: huella && biometria.disponible ? { nombre: huella.nombre } : null,
      huellaActiva: !!huella && huella.userId === usuario?.id,
      ofrecerHuella,
      iniciarLogin,
      enviarCodigo,
      verificarCodigo,
      cancelarLogin,
      ingresarConHuella,
      activarHuella,
      desactivarHuella,
      descartarOfertaHuella,
      cerrarSesion,
    }),
    [
      estado,
      usuario,
      mfa,
      biometria,
      huella,
      ofrecerHuella,
      iniciarLogin,
      enviarCodigo,
      verificarCodigo,
      cancelarLogin,
      ingresarConHuella,
      activarHuella,
      desactivarHuella,
      descartarOfertaHuella,
      cerrarSesion,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
