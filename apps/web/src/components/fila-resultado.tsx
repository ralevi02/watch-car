import { Car, Star } from "lucide-react";
import Link from "next/link";
import type { ResultadoAuto } from "@/lib/datos";
import { bajo, etiquetas, lineaAuto, miles, pesos, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";

/** Un auto en la lista: foto chica, precio, lo básico y qué revisar. */
export function FilaResultado({ r, destacado }: { r: ResultadoAuto; destacado?: boolean }) {
  const revisar = etiquetas(r);
  const favorito = r.marca?.estado === "favorito";
  const descartado = r.marca?.estado === "descartado";
  return (
    <Link
      href={`/auto?id=${r.autoId}`}
      aria-label={`${tituloAuto(r)}, ${r.precio !== null ? pesos(r.precio) : "sin precio"}`}
      className={cn("presionable flex gap-3.5 py-3", descartado && "opacity-55", destacado && "rounded-xl bg-card px-2")}
    >
      <div className="h-[88px] w-[116px] shrink-0 overflow-hidden rounded-xl bg-card">
        {r.foto ? (
          <img src={r.foto} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-tenue">
            <Car className="size-8" strokeWidth={1.4} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-grow flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[19px] font-bold tracking-[-0.3px] tabular-nums">{r.precio !== null ? pesos(r.precio) : "Sin precio"}</span>
          <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold">
            {favorito && <Star className="size-3.5 fill-current text-foreground" strokeWidth={0} aria-label="Guardado" />}
            <span className={r.veredicto === "calza" ? "text-calza" : "text-advertencia"}>{r.veredicto === "calza" ? "Calza" : "Revisar"}</span>
          </span>
        </div>
        <span className="mt-0.5 truncate text-[14px] text-suave">{tituloAuto(r)}</span>
        <span className="truncate text-[13.5px] text-tenue">{lineaAuto(r)}</span>
        {(revisar.length > 0 || bajo(r)) && (
          <span className="mt-1.5 flex flex-wrap gap-[5px]">
            {bajo(r) && <span className="etiqueta etiqueta-calza">Bajó ${miles(r.precioInicial! - r.precio!)}</span>}
            {revisar.map((e) => (
              <span key={e} className="etiqueta">
                {e}
              </span>
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

/** Mientras llegan los datos la primera vez. */
export function FilaEsqueleto() {
  return (
    <div className="flex gap-3.5 py-3" aria-hidden>
      <div className="h-[88px] w-[116px] shrink-0 animate-pulse rounded-xl bg-card" />
      <div className="flex flex-grow flex-col gap-2 pt-1">
        <div className="h-4 w-28 animate-pulse rounded bg-card" />
        <div className="h-3.5 w-40 animate-pulse rounded bg-card" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-card" />
      </div>
    </div>
  );
}
