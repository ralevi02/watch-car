import { buscarLugar, distanciaKm } from "@/lib/comunas";
import type { ResultadoAuto } from "@/lib/datos";
import { lugarDe } from "@/lib/lugares";

/**
 * La ruta para ir a ver varios autos: desde la casa, cada vez al más cercano
 * que falte (vecino más próximo), en un link de Google Maps con paradas.
 */
export function rutaDeVisitas(autos: ResultadoAuto[], casa: string | null): { url: string; orden: ResultadoAuto[] } | null {
  const conLugar = autos.map((r) => ({ r, l: lugarDe(r) })).filter((x): x is { r: ResultadoAuto; l: NonNullable<ReturnType<typeof lugarDe>> } => Boolean(x.l)).slice(0, 9);
  if (!conLugar.length) return null;
  const inicio = casa ? buscarLugar(casa, null) : null;
  const orden: typeof conLugar = [];
  let aqui = inicio ?? conLugar[0]!.l;
  const quedan = [...conLugar];
  while (quedan.length) {
    quedan.sort((a, b) => distanciaKm(aqui, a.l) - distanciaKm(aqui, b.l));
    const sig = quedan.shift()!;
    orden.push(sig);
    aqui = sig.l;
  }
  const donde = (r: ResultadoAuto) => `${r.comuna ?? r.region ?? ""}, Chile`;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (casa) url.searchParams.set("origin", `${casa}, Chile`);
  url.searchParams.set("destination", donde(orden.at(-1)!.r));
  if (orden.length > 1) url.searchParams.set("waypoints", orden.slice(0, -1).map((x) => donde(x.r)).join("|"));
  url.searchParams.set("travelmode", "driving");
  return { url: url.toString(), orden: orden.map((x) => x.r) };
}
