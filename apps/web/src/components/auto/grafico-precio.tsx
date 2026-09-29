import { millones } from "@/lib/presentar";

const fecha = (s: string) => new Date(s).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" });

/** Línea chica con el precio en el tiempo (solo si cambió alguna vez). */
export function GraficoPrecio({ puntos }: { puntos: { precio: number; visto_en: string }[] }) {
  // Un punto por cambio de precio, más el último visto.
  const cambios = puntos.filter((p, i) => i === 0 || p.precio !== puntos[i - 1]!.precio);
  if (cambios.length < 2) return null;
  const serie = [...cambios, { ...cambios.at(-1)!, visto_en: puntos.at(-1)!.visto_en }];
  const t0 = new Date(serie[0]!.visto_en).getTime();
  const t1 = Math.max(new Date(serie.at(-1)!.visto_en).getTime(), t0 + 1);
  const precios = serie.map((p) => p.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const W = 320;
  const H = 72;
  const x = (s: string) => ((new Date(s).getTime() - t0) / (t1 - t0)) * (W - 8) + 4;
  const y = (p: number) => (max === min ? H / 2 : 8 + (1 - (p - min) / (max - min)) * (H - 16));
  // Escalón: el precio se mantiene hasta el cambio siguiente.
  const d = serie.map((p, i) => (i === 0 ? `M${x(p.visto_en)},${y(p.precio)}` : `H${x(p.visto_en)}V${y(p.precio)}`)).join("");
  const baja = serie.at(-1)!.precio < serie[0]!.precio;
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[72px] w-full overflow-visible" role="img" aria-label={`Precio de ${millones(serie[0]!.precio)} a ${millones(serie.at(-1)!.precio)}`}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" className={baja ? "text-calza" : "text-advertencia"} />
        {cambios.map((p) => (
          <circle key={p.visto_en} cx={x(p.visto_en)} cy={y(p.precio)} r={3} className={baja ? "fill-calza" : "fill-advertencia"} />
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[12px] text-tenue tabular-nums">
        <span>
          {fecha(serie[0]!.visto_en)}, {millones(serie[0]!.precio)}
        </span>
        <span>
          {fecha(serie.at(-1)!.visto_en)}, {millones(serie.at(-1)!.precio)}
        </span>
      </figcaption>
    </figure>
  );
}
