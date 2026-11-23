import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import type { Novedad } from '@/models';
import {
  avisosStore,
  SEGUNDOS_RECORDATORIO,
  TEXTO_RECORDATORIO,
  useAvisos,
  type FrecuenciaRecordatorio,
} from '@/services/avisos.store';
import { novedadesService } from '@/services/novedades.service';
import {
  cancelarNotificacion,
  escucharToques,
  mostrarNotificacion,
  pedirPermisoNotificaciones,
  programarNotificacion,
} from '@/services/notifications';
import { storage, StorageKeys } from '@/services/storage';
import { leerDestino, rutaDeDestino } from '@/utils/destinos';

/** Cada cuánto se consulta la API mientras la app está abierta. */
const INTERVALO_MS = 60 * 1000;
/** Hasta 3 novedades se muestran una por una; si son más, una sola notificación con el total. */
const MAX_INDIVIDUALES = 3;
/** Ids de los recordatorios: al volver a programarlos se reemplazan (nunca hay dos iguales). */
const ID_FIRMA = 'recordatorio-firma';
const ID_INACTIVIDAD = 'recordatorio-inactividad';

/** Lo que se guarda en el celular por usuario: desde cuándo preguntar y qué ya se avisó. */
interface UltimaConsulta {
  desde: string;
  avisadas: string[];
}

async function avisar(nuevas: Novedad[]) {
  if (nuevas.length === 0) return;
  if (nuevas.length <= MAX_INDIVIDUALES) {
    // De la más vieja a la más nueva, así la última que se ve arriba es la más reciente.
    for (const n of [...nuevas].reverse()) await mostrarNotificacion(n.titulo, n.mensaje, { destino: n.destino }, 'novedades');
    return;
  }
  await mostrarNotificacion(
    `Tenés ${nuevas.length} novedades en tus convenios`,
    nuevas
      .slice(0, MAX_INDIVIDUALES)
      .map((n) => n.titulo)
      .join(' · '),
    { destino: { pantalla: 'avisos', id: null } },
    'novedades',
  );
}

/** Segundos hasta el recordatorio de firma: X después de que el convenio quedó esperando (o X desde ahora, si ya pasó). */
function segundosHastaRecordar(esperanDesde: string | null, frecuencia: FrecuenciaRecordatorio): number | null {
  const intervalo = SEGUNDOS_RECORDATORIO[frecuencia];
  if (!intervalo) return null;
  const espera = esperanDesde ? (Date.now() - new Date(esperanDesde).getTime()) / 1000 : 0;
  const faltan = intervalo - (Number.isFinite(espera) ? espera : 0);
  return faltan > 5 ? faltan : intervalo;
}

/**
 * Notificaciones de la app (T2). Se usa una vez, en el layout de las pestañas (solo con sesión iniciada).
 * 1. Notificaciones vía API: cada minuto (y al volver a la app) pregunta GET /mobile/novedades?desde=…
 *    y muestra en el celular lo nuevo: convenios, comentarios, cambios de estado o de datos, cancelaciones.
 * 2. Recordatorios locales (programados en el celular, funcionan con la app cerrada):
 *    - "Aún tenés convenios por firmar", X tiempo después de que quedaron esperando firma.
 *    - "¿Hay novedades?", si pasa X tiempo sin abrir la app.
 *    X se elige en Mi Perfil (1 minuto para la demostración, 4 h, 24 h o nunca).
 * Expo Go no recibe push remotas en Android (desde el SDK 53), por eso se consulta la API y se notifica localmente.
 */
export function useNotificacionesApp() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { frecuencia } = useAvisos();
  const usuarioId = usuario?.id ?? null;
  // Datos primitivos: si no cambian, no se vuelve a programar el recordatorio.
  const [porFirmar, setPorFirmar] = useState(0);
  const [esperanDesde, setEsperanDesde] = useState<string | null>(null);

  // Tocar una notificación abre la pantalla de lo que avisa.
  useEffect(
    () =>
      escucharToques((datos) => {
        const destino = leerDestino(datos);
        if (destino) router.push(rutaDeDestino(destino));
      }),
    [router],
  );

  // Al entrar: preferencia guardada y permiso. Al cerrar sesión: se borran los recordatorios.
  useEffect(() => {
    avisosStore.cargarFrecuencia();
    pedirPermisoNotificaciones();
    return () => {
      cancelarNotificacion(ID_FIRMA);
      cancelarNotificacion(ID_INACTIVIDAD);
      avisosStore.reiniciar();
    };
  }, []);

  // Consulta de novedades a la API.
  useEffect(() => {
    if (usuarioId === null) return;
    let activo = true;
    let consultando = false;

    const clave = StorageKeys.novedades(usuarioId);

    const consultar = async () => {
      if (consultando || AppState.currentState !== 'active') return;
      consultando = true;
      try {
        const anterior = await storage.get<UltimaConsulta>(clave);
        const respuesta = await novedadesService.listar(anterior?.desde);
        if (!activo) return;

        // La primera vez solo se toma nota (no se avisa lo viejo). Después, lo que no se avisó antes.
        const yaAvisadas = new Set(anterior?.avisadas ?? []);
        const nuevas = anterior ? respuesta.novedades.filter((n) => !yaAvisadas.has(n.id)) : [];
        await storage.set<UltimaConsulta>(clave, {
          desde: respuesta.generado_en,
          avisadas: [...new Set([...respuesta.novedades.map((n) => n.id), ...yaAvisadas])].slice(0, 200),
        });

        avisosStore.sumarSinLeer(nuevas.length);
        setPorFirmar(respuesta.por_firmar.cantidad);
        setEsperanDesde(respuesta.por_firmar.esperan_desde);
        await avisar(nuevas);
      } catch {
        // Sin conexión o API apagada: se vuelve a intentar en el próximo minuto.
      } finally {
        consultando = false;
      }
    };

    consultar();
    const timer = setInterval(consultar, INTERVALO_MS);
    const suscripcion = AppState.addEventListener('change', (estadoApp) => {
      if (estadoApp === 'active') {
        cancelarNotificacion(ID_INACTIVIDAD);
        consultar();
      }
    });
    return () => {
      activo = false;
      clearInterval(timer);
      suscripcion.remove();
    };
  }, [usuarioId]);

  // Recordatorio "Aún tenés convenios por firmar".
  useEffect(() => {
    const segundos = segundosHastaRecordar(esperanDesde, frecuencia);
    if (porFirmar === 0 || segundos === null) {
      cancelarNotificacion(ID_FIRMA);
      return;
    }
    programarNotificacion(
      ID_FIRMA,
      porFirmar === 1 ? 'Aún tenés un convenio por firmar' : `Aún tenés ${porFirmar} convenios por firmar`,
      'Tocá para abrir la lista y firmarlos con tu huella.',
      segundos,
      { destino: { pantalla: 'firmar', id: null } },
    );
  }, [porFirmar, esperanDesde, frecuencia]);

  // Recordatorio "¿Hay novedades?": se programa al salir de la app y se cancela al volver.
  useEffect(() => {
    const segundos = SEGUNDOS_RECORDATORIO[frecuencia];
    const suscripcion = AppState.addEventListener('change', (estadoApp) => {
      if (estadoApp !== 'background') return;
      if (!segundos) return;
      programarNotificacion(
        ID_INACTIVIDAD,
        '¿Hay novedades en tus convenios?',
        `Hace ${TEXTO_RECORDATORIO[frecuencia]} que no entrás. Tocá para ver los avisos.`,
        segundos,
        { destino: { pantalla: 'avisos', id: null } },
      );
    });
    if (!segundos) cancelarNotificacion(ID_INACTIVIDAD);
    return () => suscripcion.remove();
  }, [frecuencia]);
}