"use client";

import { cn } from "@/lib/utils";

/** Control segmentado de iOS: el fondo blanco se desliza hasta la opción elegida. */
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
    <div role="radiogroup" aria-label={etiqueta} className="relative grid rounded-[9px] bg-muted p-[2px]" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="absolute top-[2px] bottom-[2px] left-[2px] rounded-[7px] bg-card shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ width: `calc((100% - 4px) / ${opciones.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === valor}
          onClick={() => onCambio(o.id)}
          className={cn("relative z-10 h-7 truncate px-1 text-[13px] transition-[font-weight]", o.id === valor ? "font-semibold" : "font-medium")}
        >
          {o.etiqueta}
          {o.cuenta !== undefined && <span className="ml-1 text-muted-foreground">{o.cuenta}</span>}
        </button>
      ))}
    </div>
  );
}
