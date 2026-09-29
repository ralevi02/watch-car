"use client";

import { puedeSerCrossCountry } from "@radar/core";
import { useState, useTransition } from "react";
import { type Correccion, corregirAuto } from "@/app/(app)/acciones-auto";
import { useAlmacen } from "@/lib/almacen";
import type { ResultadoAuto } from "@/lib/datos";

/**
 * "¿Algo mal?": el dueño corrige lo que la IA clasificó mal. El auto se
 * arregla al tiro y la corrección queda como ejemplo para los avisos que vengan.
 */
export function Corregir({ r, alQuitar }: { r: ResultadoAuto; alQuitar?: () => void }) {
  const { refrescar, pedirDetalle } = useAlmacen();
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const cc = /cross country/i.test(r.modelo ?? "");
  const opciones: { id: Correccion; etiqueta: string; hecho: string; quita?: boolean }[] = [
    ...(r.modelo && puedeSerCrossCountry(r.modelo.replace(/\s*cross country/i, ""))
      ? cc
        ? [{ id: "no_es_cc" as const, etiqueta: "No es Cross Country", hecho: "Anotado: no es Cross Country." }]
        : [{ id: "es_cc" as const, etiqueta: "Sí es Cross Country", hecho: "Anotado: es Cross Country." }]
      : []),
    { id: "repuesto", etiqueta: "Es un repuesto", hecho: "Anotado: es un repuesto. Ya no aparece.", quita: true },
    { id: "otro", etiqueta: "No es un auto", hecho: "Anotado: no es un auto. Ya no aparece.", quita: true },
  ];

  const corregir = (o: (typeof opciones)[number]) =>
    iniciar(async () => {
      setError(null);
      const res = await corregirAuto(r.autoId, o.id);
      if (!res.ok) return setError(res.error);
      navigator.vibrate?.(8);
      setHecho(o.hecho);
      await refrescar();
      pedirDetalle(r.autoId);
      if (o.quita) alQuitar?.();
    });

  return (
    <section className="mt-7">
      <h2 className="titulo-grupo !ml-0">¿Algo mal?</h2>
      {hecho ? (
        <p className="text-[15px] text-muted-foreground">{hecho} La IA lo usa de ejemplo para los próximos avisos.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {opciones.map((o) => (
            <button key={o.id} type="button" disabled={enviando} onClick={() => corregir(o)} className="presionable h-10 rounded-full bg-card px-4 text-[14px] font-medium disabled:opacity-50">
              {o.etiqueta}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
    </section>
  );
}
