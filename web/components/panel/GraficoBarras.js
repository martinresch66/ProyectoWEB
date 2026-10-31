"use client";

// Gráfico de barras con Recharts + tabla oculta para lectores de pantalla.

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function GraficoBarras({ titulo, datos, etiquetas = {}, horizontal = false }) {
  const filas = datos.map((d) => ({ nombre: etiquetas[d.clave] || d.clave, cantidad: d.cantidad }));
  const alto = horizontal ? Math.max(filas.length * 40 + 30, 120) : 220;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-base font-semibold">{titulo}</figcaption>
      {filas.length === 0 ? (
        <p className="text-sm text-gray-600">Sin datos para mostrar.</p>
      ) : (
        <>
          <div aria-hidden="true" style={{ width: "100%", height: alto }}>
            <ResponsiveContainer width="100%" height="100%">
              {horizontal ? (
                <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="#eaecf0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "#475467", fontSize: 12 }} />
                  <YAxis type="category" dataKey="nombre" width={140} tick={{ fill: "#344054", fontSize: 13 }} />
                  <Tooltip cursor={{ fill: "#f2f4f7" }} />
                  <Bar dataKey="cantidad" name="Cantidad" fill="#1d4ed8" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="cantidad" position="right" fill="#101828" fontSize={13} />
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={filas} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#eaecf0" />
                  <XAxis dataKey="nombre" tick={{ fill: "#344054", fontSize: 12 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: "#475467", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "#f2f4f7" }} />
                  <Bar dataKey="cantidad" name="Cantidad" fill="#1d4ed8" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cantidad" position="top" fill="#101828" fontSize={13} />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{titulo}</caption>
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombre}>
                  <td>{f.nombre}</td>
                  <td>{f.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
