import type { DetalleAuto } from "@/lib/datos";
import { NOMBRE_FUENTE, pesos } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const fecha = (s: string) => new Date(s).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" });

interface Evento {
  fecha: string;
  texto: string;
  tono?: "calza" | "advertencia";
}

/**
 * La historia del auto en todos sus avisos: cuándo apareció, en qué portal,
 * quién lo vendía, cómo cambió el precio y cuándo dejó de aparecer. Sirve
 * para ver al revendedor (lo compró un particular y ahora lo ofrece más caro).
 */
export function Historia({ detalle }: { detalle: DetalleAuto }) {
  const eventos: Evento[] = [];
  const vende = (a: DetalleAuto["avisos"][number]) =>
    a.tipoVendedor === "automotora" ? `, lo vende una automotora${a.vendedor ? ` (${a.vendedor.replace(/\s*\/\s*Vehículo Usado$/i, "")})` : ""}` : a.tipoVendedor === "particular" ? ", lo vende un particular" : "";
  // El mismo auto publicado varias veces en el mismo portal, al mismo precio y el mismo día: una sola línea.
  const grupos = new Map<string, DetalleAuto["avisos"]>();
  for (const a of detalle.avisos) {
    const k = `${a.fuente}|${a.precioInicial}|${a.primeraVez.slice(0, 10)}|${a.tipoVendedor}`;
    grupos.set(k, [...(grupos.get(k) ?? []), a]);
  }
  for (const [, g] of grupos) {
    const a = g[0]!;
    eventos.push({
      fecha: a.primeraVez,
      texto: `Aparece${g.length > 1 ? ` ${g.length} veces` : ""} en ${NOMBRE_FUENTE[a.fuente] ?? a.fuente}${vende(a)}${a.precioInicial ? `, a ${pesos(a.precioInicial)}` : ""}.`,
      tono: g.length > 1 ? "advertencia" : undefined,
    });
  }
  for (const a of detalle.avisos) {
    const precios = detalle.precios.filter((p) => p.aviso_id === a.id);
    for (let i = 1; i < precios.length; i++) {
      const antes = precios[i - 1]!.precio;
      const ahora = precios[i]!.precio;
      if (ahora === antes) continue;
      eventos.push({ fecha: precios[i]!.visto_en, texto: `${ahora < antes ? "Baja" : "Sube"} a ${pesos(ahora)} en ${NOMBRE_FUENTE[a.fuente] ?? a.fuente}.`, tono: ahora < antes ? "calza" : "advertencia" });
    }
    if (a.estado !== "activo") eventos.push({ fecha: a.ultimaVez, texto: `Deja de aparecer en ${NOMBRE_FUENTE[a.fuente] ?? a.fuente}.` });
  }
  eventos.sort((x, y) => x.fecha.localeCompare(y.fecha));
  // Un solo aviso sin cambios no tiene historia que contar (salvo que esté repetido).
  if (eventos.length < 2 && !eventos[0]?.tono) return null;

  // Particular primero y automotora después, más caro: típico de revendedor.
  const part = detalle.avisos.find((a) => a.tipoVendedor === "particular");
  const auto = detalle.avisos.find((a) => a.tipoVendedor === "automotora" && part && a.primeraVez > part.primeraVez);
  const reventa = part && auto && auto.precio && part.precioInicial && auto.precio > part.precioInicial * 1.05;

  return (
    <section className="mt-7">
      <h2 className="titulo-grupo !ml-0">Historia</h2>
      {reventa && (
        <p className="mb-3 text-[14px] leading-[20px] text-advertencia">
          Lo vendía un particular a {pesos(part.precioInicial!)} y ahora una automotora lo ofrece a {pesos(auto.precio!)}: probablemente lo compró para revenderlo.
        </p>
      )}
      <ol className="relative flex flex-col gap-3 border-l border-separador pl-4">
        {eventos.map((e, i) => (
          <li key={i} className="relative">
            <span className={cn("absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-hoja bg-tenue", e.tono === "calza" && "bg-calza", e.tono === "advertencia" && "bg-advertencia")} />
            <p className="text-[12.5px] tabular-nums text-tenue">{fecha(e.fecha)}</p>
            <p className="text-[15px] leading-[21px]">{e.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
