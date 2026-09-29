"use client";

import { cn } from "@/lib/utils";

/** Control segmentado: la opción elegida se marca con un fondo que se desliza. */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { id: T; etiqueta: string; cuenta?: number }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  const i = Math.max(0, opciones.findIndex((o) => o.id === valor));
  return (
    <div role="radiogroup" aria-label={etiqueta} className="relative grid h-10 rounded-xl bg-card p-[3px]" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] rounded-[9px] bg-[var(--pulgar)] shadow-[var(--pulgar-sombra)] transition-transform duration-[280ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
        style={{ width: `calc((100% - 6px) / ${opciones.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === valor}
          onClick={() => onCambio(o.id)}
          className={cn("relative z-10 truncate px-1 text-[14px] transition-colors", o.id === valor ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}
        >
          {o.etiqueta}
          {o.cuenta !== undefined && o.cuenta > 0 && <span className="ml-1 text-tenue">{o.cuenta}</span>}
        </button>
      ))}
    </div>
  );
}
