"use client";

import type { Seguimiento } from "@radar/core";
import { useState } from "react";
import { actualizarFicha } from "@/app/(app)/acciones-auto";
import { useAlmacen } from "@/lib/almacen";
import { millones } from "@/lib/presentar";

interface Sugerencia {
  id: string;
  texto: string;
  accion: string;
  ficha: Seguimiento;
}

const abajo = (n: number, paso: number) => Math.floor(n / paso) * paso;

/**
 * La ficha aprende de lo que descartas: si varias veces descartas por lo
 * mismo (caja manual, muchos km, muy caro), propone ajustar la ficha.
 */
export function SugerenciasFicha({ id, ficha }: { id: string; ficha: Seguimiento }) {
  const { datos, cambiar, refrescar } = useAlmacen();
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const descartados = (datos?.resultados ?? []).filter((r) => r.marca?.estado === "descartado" && r.porBusqueda[id]);
  const por = (motivo: string) => descartados.filter((r) => r.marca?.motivoDescarte === motivo);

  const sugerencias: Sugerencia[] = [];
  const manual = por("Caja manual");
  if (manual.length >= 2 && ficha.caja === "cualquiera") {
    sugerencias.push({ id: "caja", texto: `Descartaste ${manual.length} por caja manual.`, accion: "Pedir solo automática", ficha: { ...ficha, caja: "automatica" } });
  }
  const km = por("Muchos km").flatMap((r) => (r.km ? [r.km] : []));
  if (km.length >= 2) {
    const tope = abajo(Math.min(...km) - 1, 10_000);
    if (!ficha.km.max || tope < ficha.km.max) {
      sugerencias.push({
        id: "km",
        texto: `Descartaste ${km.length} por muchos km (desde ${Math.min(...km).toLocaleString("es-CL")} km).`,
        accion: `Bajar el tope a ${tope.toLocaleString("es-CL")} km`,
        ficha: { ...ficha, km: { ...ficha.km, max: tope, maxConAdvertencia: ficha.km.maxConAdvertencia && ficha.km.maxConAdvertencia > tope ? tope : ficha.km.maxConAdvertencia } },
      });
    }
  }
  const caros = por("Muy caro").flatMap((r) => (r.precio ? [r.precio] : []));
  if (caros.length >= 2) {
    const tope = abajo(Math.min(...caros) - 1, 500_000);
    if (!ficha.precio.max || tope < ficha.precio.max) {
      sugerencias.push({
        id: "precio",
        texto: `Descartaste ${caros.length} por caros (desde ${millones(Math.min(...caros))}).`,
        accion: `Bajar el tope a ${millones(tope)}`,
        ficha: { ...ficha, precio: { ...ficha.precio, max: tope, maxConAdvertencia: ficha.precio.maxConAdvertencia && ficha.precio.maxConAdvertencia > tope ? tope : ficha.precio.maxConAdvertencia } },
      });
    }
  }

  if (!sugerencias.length && !listo) return null;
  const aplicar = async (s: Sugerencia) => {
    setAplicando(s.id);
    const res = await actualizarFicha(id, s.ficha);
    setAplicando(null);
    if (!res.ok) return;
    cambiar((d) => ({ ...d, busquedas: d.busquedas.map((b) => (b.id === id ? { ...b, ficha: s.ficha } : b)) }));
    setListo(`Listo: ${s.accion.charAt(0).toLowerCase()}${s.accion.slice(1)}.`);
    void refrescar();
  };

  return (
    <div className="flex flex-col gap-2">
      {listo && <p className="rounded-[14px] bg-card px-4 py-3 text-[15px]">{listo}</p>}
      {sugerencias.map((s) => (
        <div key={s.id} className="rounded-[14px] bg-card px-4 py-3">
          <p className="text-[15px] leading-[21px]">{s.texto}</p>
          <button type="button" disabled={aplicando !== null} onClick={() => void aplicar(s)} className="presionable mt-2 h-10 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground disabled:opacity-50">
            {aplicando === s.id ? "Aplicando…" : s.accion}
          </button>
        </div>
      ))}
    </div>
  );
}
