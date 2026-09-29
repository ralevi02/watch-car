import { buscarLugar, distanciaKm } from "@/lib/comunas";
import type { ResultadoAuto } from "@/lib/datos";

/** Dónde está un auto (centro de su comuna, o de su región si no hay comuna). */
export const lugarDe = (r: Pick<ResultadoAuto, "comuna" | "region">) => buscarLugar(r.comuna, r.region);

/**
 * Distancia desde la casa del dueño, en km por camino (aprox.: la línea recta
 * por 1,25) y en horas manejando (a 80 km/h promedio).
 */
export function distanciaDeCasa(r: Pick<ResultadoAuto, "comuna" | "region">, comunaCasa?: string | null): { km: number; horas: number; texto: string } | null {
  if (!comunaCasa) return null;
  const casa = buscarLugar(comunaCasa, null);
  const auto = lugarDe(r);
  if (!casa || !auto) return null;
  const km = Math.round(distanciaKm(casa, auto) * 1.25);
  const horas = km / 80;
  const texto = km < 3 ? "En tu comuna" : horas < 1 ? `${km} km, ${Math.max(5, Math.round((horas * 60) / 5) * 5)} min` : `${km} km, ${horas.toFixed(horas < 10 ? 1 : 0).replace(".", ",")} h`;
  return { km, horas, texto };
}

/**
 * Lo que cuesta ir a buscar un auto lejos (ida en bus y vuelta manejando):
 * bencina de vuelta (~ $140 por km) más un pasaje de ida (~ $45 por km).
 */
export const costoViaje = (km: number) => Math.round((km * 185) / 10_000) * 10_000;
