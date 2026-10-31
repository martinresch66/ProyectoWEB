// Guarda el token y los datos básicos del usuario.
// Usamos sessionStorage (se borra al cerrar la pestaña) para no dejar el token
// guardado más de lo necesario, como pide el README de /web.

const CLAVE_TOKEN = "convenios.token";
const CLAVE_USUARIO = "convenios.usuario";
const EVENTO = "convenios:sesion-cambio";

function almacenamiento() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function avisar() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function obtenerToken() {
  return almacenamiento()?.getItem(CLAVE_TOKEN) || null;
}

// Texto JSON del usuario guardado (o null). Se usa con useSyncExternalStore.
export function obtenerUsuarioTexto() {
  const s = almacenamiento();
  if (!s || !s.getItem(CLAVE_TOKEN)) return null;
  return s.getItem(CLAVE_USUARIO) || null;
}

export function suscribirSesion(alCambiar) {
  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function guardarSesion(token, usuario) {
  const s = almacenamiento();
  if (!s) return;
  s.setItem(CLAVE_TOKEN, token);
  s.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  avisar();
}

export function actualizarUsuarioGuardado(usuario) {
  const s = almacenamiento();
  if (!s || !s.getItem(CLAVE_TOKEN)) return;
  const nuevo = JSON.stringify(usuario);
  if (s.getItem(CLAVE_USUARIO) !== nuevo) {
    s.setItem(CLAVE_USUARIO, nuevo);
    avisar();
  }
}

export function borrarSesion() {
  const s = almacenamiento();
  if (!s) return;
  s.removeItem(CLAVE_TOKEN);
  s.removeItem(CLAVE_USUARIO);
  avisar();
}
