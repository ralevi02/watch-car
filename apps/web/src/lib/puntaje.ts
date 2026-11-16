import { diferencia, preferenciasDe, type Seguimiento, tienePreferencia } from "@radar/core";
import type { ResultadoAuto } from "@/lib/datos";

const tope = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

/**
 * Qué tan buena opción es un auto para una ficha: más alto, mejor. Pesa sobre todo
 * el precio frente al precio justo (que ya considera año y km); después los km y el
 * año frente a la ficha, lo que prefieres, qué tan lejos está y las alertas.
 */
export function puntaje(r: ResultadoAuto, ficha: Seguimiento | undefined, kmDeCasa: number | null): number {
  let p = 0;
  if (r.precio !== null && r.justo && r.justo.n >= 5) p += tope(-diferencia(r.precio, r.justo) * 100, -30, 30);
  else if (r.precio !== null && ficha?.precio.max) p += tope((1 - r.precio / ficha.precio.max) * 40, -15, 15);
  if (r.km !== null && ficha?.km.max) p += tope((1 - r.km / ficha.km.max) * 15, -10, 10);
  if (r.anio !== null && ficha?.anio.min !== undefined) p += tope((r.anio - ficha.anio.min) * 2, 0, 8);
  if (ficha && tienePreferencia(`${r.titulo} ${r.version ?? ""}`, preferenciasDe(ficha))) p += 12;
  if (kmDeCasa !== null) p -= Math.min(kmDeCasa / 20, 10);
  p -= Math.min((r.alertas.length + (r.senales?.length ?? 0) + (r.remate ? 1 : 0)) * 8, 20);
  if (!r.foto) p -= 3;
  if (r.nuevo) p += 2;
  return p;
}

/** La ficha con que se mide un auto: la elegida o, en "todas", la primera en que calza (o aparece). */
export function fichaDe(r: ResultadoAuto, fichas: { id: string; ficha: Seguimiento }[], elegida?: string) {
  if (elegida) return fichas.find((f) => f.id === elegida)?.ficha;
  return (fichas.find((f) => r.porBusqueda[f.id]?.veredicto === "calza") ?? fichas.find((f) => r.porBusqueda[f.id]))?.ficha;
}
