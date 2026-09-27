"use client";

import { useState } from "react";
import { ResultadoCard } from "@/components/resultado-card";
import type { Filtro, ResultadoAuto } from "@/lib/datos";
import { FILTROS, filtrar } from "@/lib/filtros";
import { cn } from "@/lib/utils";

/**
 * Resultados con filtros en el teléfono: tocar un filtro o una ficha cambia la
 * lista al instante, sin ir al servidor. La URL se actualiza igual, para que
 * volver atrás o compartir el link funcione.
 */
export function VistaResultados({
  resultados,
  busquedas,
  filtroInicial,
  busquedaInicial,
  aviso,
}: {
  resultados: ResultadoAuto[];
  busquedas: { id: string; nombre: string }[];
  filtroInicial: Filtro;
  busquedaInicial?: string;
  aviso?: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [busqueda, setBusqueda] = useState<string | undefined>(busquedaInicial);
  const { visibles, cuentas } = filtrar(resultados, filtro, busqueda);

  const cambiar = (f: Filtro, b: string | undefined) => {
    navigator.vibrate?.(5);
    setFiltro(f);
    setBusqueda(b);
    const p = new URLSearchParams();
    if (f !== "todos") p.set("filtro", f);
    if (b) p.set("busqueda", b);
    window.history.replaceState(null, "", p.size ? `/resultados?${p}` : "/resultados");
  };

  const vacio =
    busquedas.length === 0
      ? "Todavía no tienes seguimientos. Crea uno en la pestaña Seguimientos."
      : filtro === "todos"
        ? "Aún no hay avisos que calcen. La próxima pasada corre dentro de las próximas 3 horas."
        : "Nada por aquí con este filtro.";

  const chip = "presionable shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-3">
        {busquedas.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: undefined, nombre: "Todas" }, ...busquedas].map((b) => (
              <button
                key={b.id ?? "todas"}
                type="button"
                onClick={() => cambiar(filtro, b.id)}
                className={cn(chip, "border", busqueda === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}
              >
                {b.nombre}
              </button>
            ))}
          </div>
        )}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => cambiar(f.id, busqueda)}
              className={cn(chip, filtro === f.id ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border")}
            >
              {f.etiqueta} <span className="opacity-60">{cuentas[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* La lista se vuelve a montar al cambiar de filtro: las tarjetas entran escalonadas. */}
      <main key={`${filtro}-${busqueda ?? "todas"}`} className="flex flex-col gap-3 px-4 py-4">
        {visibles.length === 0 ? (
          <p className="entrada-escalonada py-10 text-center text-muted-foreground">{vacio}</p>
        ) : (
          visibles.map((r, i) => (
            <div key={r.autoId} className="entrada-escalonada" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
              <ResultadoCard r={r} destacado={r.enlaces.some((e) => e.id === aviso)} ocultarAlDescartar={filtro !== "descartados"} />
            </div>
          ))
        )}
      </main>
    </>
  );
}
