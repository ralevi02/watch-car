"use client";

import { modeloCanonico } from "@radar/core";
import { useMemo } from "react";
import { useAlmacen } from "@/lib/almacen";
import type { ResultadoAuto } from "@/lib/datos";
import { costoViaje, distanciaDeCasa, lugarDe } from "@/lib/lugares";
import { millones } from "@/lib/presentar";

const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
};
const clave = (r: Pick<ResultadoAuto, "modelo" | "anio">) => `${modeloCanonico(r.modelo ?? "")}|${r.anio}`;

/**
 * Para autos lejos de la casa: si está más barato que lo que se pide en la
 * Región Metropolitana por el mismo modelo y año, y el ahorro paga el viaje.
 */
export function useLejos() {
  const { datos } = useAlmacen();
  const casa = datos?.ajustes?.casa?.comuna ?? null;
  const medianas = useMemo(() => {
    const grupos = new Map<string, number[]>();
    for (const r of datos?.resultados ?? []) {
      if (r.precio === null || !r.anio || !r.modelo) continue;
      if (lugarDe(r)?.region !== "Metropolitana") continue;
      grupos.set(clave(r), [...(grupos.get(clave(r)) ?? []), r.precio]);
    }
    return new Map([...grupos].filter(([, xs]) => xs.length >= 3).map(([k, xs]) => [k, mediana(xs)]));
  }, [datos?.resultados]);

  return (r: ResultadoAuto): string | null => {
    const d = distanciaDeCasa(r, casa);
    if (!d || d.km < 150) return null;
    const lugar = r.comuna ?? r.region?.replace(/^Regi[oó]n (de |del )?/i, "") ?? "Lejos";
    const ref = medianas.get(clave(r));
    const ahorro = ref && r.precio !== null ? ref - r.precio - costoViaje(d.km) : 0;
    return ahorro >= 300_000 ? `${lugar}: ${millones(ahorro)} menos que en Santiago, con viaje` : `${lugar}, ${d.horas < 10 ? d.horas.toFixed(1).replace(".", ",") : Math.round(d.horas)} h`;
  };
}
