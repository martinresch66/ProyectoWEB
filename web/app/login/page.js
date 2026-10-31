"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/components/Proveedores";
import { Boton } from "@/components/ui/basicos";
import { Campo } from "@/components/ui/formulario";
import { USAR_SIMULADO } from "@/lib/api/config";
import { mensajeDeError, ErrorSinConexion } from "@/lib/api/errores";

// Usuarios de database/seeds.sql (contraseña: password123). Solo se muestran en modo simulado.
const USUARIOS_DE_PRUEBA = [
  { email: "admin@unlpam.edu.ar", rol: "Administración (global)" },
  { email: "gestion.ing@unlpam.edu.ar", rol: "Gestión · Ingeniería" },
  { email: "revision@unlpam.edu.ar", rol: "Revisión" },
  { email: "consulta.exactas@unlpam.edu.ar", rol: "Consulta · Exactas" },
];

export default function PaginaLogin() {
  const { usuario, listo, iniciarSesion } = useSesion();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (listo && usuario) router.replace("/");
  }, [listo, usuario, router]);

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Completá el email y la contraseña.");
      return;
    }
    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
      router.replace("/");
    } catch (e) {
      if (e instanceof ErrorSinConexion) setError("No hay conexión con el servidor. Probá de nuevo en un momento.");
      else if (e?.estado === 401) setError("Email o contraseña incorrectos.");
      else setError(mensajeDeError(e) || e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-lg font-bold text-white">
            CU
          </span>
          <h1 className="text-2xl font-bold">Convenios UNLPam</h1>
          <p className="text-sm text-gray-600">Sistema interno de gestión de convenios. Ingresá con tu cuenta institucional.</p>
        </div>

        <form onSubmit={enviar} noValidate className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </p>
          )}
          <Campo etiqueta="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} obligatorio />
          <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} obligatorio />
          <Boton type="submit" cargando={enviando}>
            Ingresar
          </Boton>
        </form>

        {USAR_SIMULADO && (
          <section aria-labelledby="titulo-prueba" className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
            <h2 id="titulo-prueba" className="font-semibold">
              Modo simulado: usuarios de prueba
            </h2>
            <p className="mt-1">Contraseña de todos: password123. Tocá uno para completar el formulario.</p>
            <ul className="mt-2 flex flex-col gap-1">
              {USUARIOS_DE_PRUEBA.map((u) => (
                <li key={u.email}>
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-lg px-2 text-left hover:bg-violet-100"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword("password123");
                    }}
                  >
                    <span className="font-semibold">{u.rol}</span> · {u.email}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
