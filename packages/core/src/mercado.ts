import { modeloCanonico } from "./normalizacion.ts";

/**
 * Precio justo con los datos propios: por modelo (y si no alcanza, por
 * familia: V40 y V40 Cross Country juntos), una recta de precio según año y
 * km ajustada con mínimos cuadrados. Sin datos suficientes no se inventa nada.
 */

export interface Comparable {
  modelo: string | null;
  anio: number | null;
  km: number | null;
  precio: number | null;
  tipo?: string | null;
}

interface Grupo {
  /** precio = a + b·(año − añoRef) + c·(km / 10.000) */
  a: number;
  b: number;
  c: number;
  anioRef: number;
  n: number;
  /** Desviación típica de lo que se aleja cada aviso de la recta. */
  error: number;
  anios: [number, number];
}

export type Mercado = Map<string, Grupo>;

const MIN_N = 6;
export const familiaDe = (modelo: string) => modeloCanonico(modelo).replace(/cc$/, "");

const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
};

/** Resuelve un sistema lineal chico (Gauss con pivote). */
function resolver(A: number[][], y: number[]): number[] | null {
  const n = y.length;
  const M = A.map((f, i) => [...f, y[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let f = c + 1; f < n; f++) if (Math.abs(M[f]![c]!) > Math.abs(M[p]![c]!)) p = f;
    if (Math.abs(M[p]![c]!) < 1e-9) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let f = 0; f < n; f++) {
      if (f === c) continue;
      const k = M[f]![c]! / M[c]![c]!;
      for (let j = c; j <= n; j++) M[f]![j]! -= k * M[c]![j]!;
    }
  }
  return M.map((f, i) => f[n]! / f[i]!);
}

function ajustar(filas: { anio: number; km: number | null; precio: number }[]): Grupo | null {
  if (filas.length < MIN_N) return null;
  // Fuera lo absurdo: más de 2 veces o menos de la mitad de la mediana del grupo.
  const med = mediana(filas.map((f) => f.precio));
  const limpias = filas.filter((f) => f.precio > med * 0.5 && f.precio < med * 2);
  if (limpias.length < MIN_N) return null;
  const anioRef = Math.round(mediana(limpias.map((f) => f.anio)));
  const conKm = limpias.filter((f) => f.km !== null && f.km > 0);
  const anios: [number, number] = [Math.min(...limpias.map((f) => f.anio)), Math.max(...limpias.map((f) => f.anio))];
  let a: number, b: number, c = 0;
  if (conKm.length >= MIN_N) {
    // Normales de mínimos cuadrados con [1, año, km].
    const X = conKm.map((f) => [1, f.anio - anioRef, f.km! / 10_000]);
    const XtX = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((t, x) => t + x[i]! * x[j]!, 0)));
    const Xty = [0, 1, 2].map((i) => X.reduce((t, x, k) => t + x[i]! * conKm[k]!.precio, 0));
    const r = resolver(XtX, Xty);
    if (!r) return null;
    [a, b, c] = r as [number, number, number];
    // Un auto con más km no puede valer más: si el ajuste sale al revés, se ignora el km.
    if (c > 0) c = 0;
  } else {
    const X = limpias.map((f) => f.anio - anioRef);
    const mx = X.reduce((t, x) => t + x, 0) / X.length;
    const my = limpias.reduce((t, f) => t + f.precio, 0) / limpias.length;
    const sxx = X.reduce((t, x) => t + (x - mx) ** 2, 0);
    b = sxx ? X.reduce((t, x, k) => t + (x - mx) * (limpias[k]!.precio - my), 0) / sxx : 0;
    a = my - b * mx;
  }
  const residuos = limpias.map((f) => f.precio - (a + b * (f.anio - anioRef) + c * ((f.km ?? 0) / 10_000)));
  const error = Math.sqrt(residuos.reduce((t, r) => t + r * r, 0) / Math.max(1, residuos.length - 2));
  return { a, b, c, anioRef, n: limpias.length, error, anios };
}

/** Entrena con los avisos guardados (autos de verdad, con precio y año). */
export function entrenarMercado(avisos: Comparable[]): Mercado {
  const validos = avisos.filter(
    (x): x is Comparable & { modelo: string; anio: number; precio: number } =>
      Boolean(x.modelo) && Boolean(x.anio) && x.precio !== null && x.precio >= 1_000_000 && (!x.tipo || x.tipo === "auto"),
  );
  const grupos = new Map<string, { anio: number; km: number | null; precio: number }[]>();
  const agregar = (k: string, x: (typeof validos)[number]) => grupos.set(k, [...(grupos.get(k) ?? []), { anio: x.anio, km: x.km, precio: x.precio }]);
  for (const x of validos) {
    agregar(`m:${modeloCanonico(x.modelo)}`, x);
    agregar(`f:${familiaDe(x.modelo)}`, x);
  }
  const m: Mercado = new Map();
  for (const [k, filas] of grupos) {
    const g = ajustar(filas);
    if (g) m.set(k, g);
  }
  return m;
}

export interface PrecioJusto {
  precio: number;
  bajo: number;
  alto: number;
  /** Con cuántos avisos se calculó. */
  n: number;
  /** "modelo" si se usó el modelo exacto; "familia" si V40 y V40 CC juntos. */
  base: "modelo" | "familia";
}

const redondear = (x: number) => Math.round(x / 50_000) * 50_000;

/** Lo que debería costar un auto así según el mercado propio. null si no hay datos o el año queda muy afuera. */
export function precioJusto(m: Mercado, a: { modelo: string | null; anio: number | null; km: number | null }): PrecioJusto | null {
  if (!a.modelo || !a.anio) return null;
  const exacto = m.get(`m:${modeloCanonico(a.modelo)}`);
  const g = exacto ?? m.get(`f:${familiaDe(a.modelo)}`);
  if (!g) return null;
  if (a.anio < g.anios[0] - 1 || a.anio > g.anios[1] + 1) return null;
  const km = a.km ?? null;
  const p = g.a + g.b * (a.anio - g.anioRef) + g.c * ((km ?? 0) / 10_000) - (km === null ? 0 : 0);
  if (!Number.isFinite(p) || p < 1_000_000) return null;
  const margen = Math.max(g.error, p * 0.06);
  return { precio: redondear(p), bajo: redondear(p - margen), alto: redondear(p + margen), n: g.n, base: exacto ? "modelo" : "familia" };
}

/** Cuánto se aleja un precio del justo: negativo = más barato. */
export const diferencia = (precio: number, justo: PrecioJusto) => (precio - justo.precio) / justo.precio;

/** Mediana de días que duran publicados los autos que ya se vendieron (o desaparecieron), por familia. */
export function diasParaVender(avisos: { modelo: string | null; primeraVez: string; ultimaVez: string; estado: string }[]): Map<string, { dias: number; n: number }> {
  const porFamilia = new Map<string, number[]>();
  for (const x of avisos) {
    if (!x.modelo || x.estado === "activo") continue;
    const d = (new Date(x.ultimaVez).getTime() - new Date(x.primeraVez).getTime()) / 86_400_000;
    if (d < 0.5 || d > 365) continue;
    const k = familiaDe(x.modelo);
    porFamilia.set(k, [...(porFamilia.get(k) ?? []), d]);
  }
  return new Map([...porFamilia].filter(([, ds]) => ds.length >= 5).map(([k, ds]) => [k, { dias: Math.round(mediana(ds)), n: ds.length }]));
}
