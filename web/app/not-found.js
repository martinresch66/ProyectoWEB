import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NoEncontrada() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="text-sm text-gray-600">Revisá la dirección o volvé al panel.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
        Ir al panel
      </Link>
    </main>
  );
}
