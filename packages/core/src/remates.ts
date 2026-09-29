import { modeloCanonico } from "./normalizacion.ts";

/**
 * Patente chilena sin guiones, puntos ni dígito verificador: "SCTZ88-3" →
 * "SCTZ88", "HDKV-76-1" → "HDKV76", "vryb.82" → "VRYB82", "AB-1234" → "AB1234".
 */
export function normalizarPatente(s: string | null | undefined): string | null {
  const t = (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = t.match(/^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})/);
  return m ? m[1]! : null;
}

// Formato nuevo (desde 2007): cuatro consonantes y dos números. El antiguo: dos letras y cuatro números.
const NUEVA = /\b([BCDFGHJKLPRSTVWXYZ]{4})[\s.·-]?(\d{2})\b/g;
const ANTIGUA = /\b([A-Z]{2})[.·-]?(\d{2})[.·-]?(\d{2})\b/g;

/** Patentes escritas en el título o la descripción de un aviso (en mayúsculas, como se escriben). */
export function patentesEnTexto(...textos: (string | null | undefined)[]): string[] {
  const t = textos.filter(Boolean).join(" ");
  const out = new Set<string>();
  for (const m of t.matchAll(NUEVA)) out.add(`${m[1]}${m[2]}`);
  for (const m of t.matchAll(ANTIGUA)) {
    const numeros = `${m[2]}${m[3]}`;
    // "CC 2018" o "RS2017" no son patentes: cuatro números que parecen un año se descartan.
    if (/^(19|20)\d{2}$/.test(numeros)) continue;
    out.add(`${m[1]}${numeros}`);
  }
  return [...out];
}

export interface LoteRemate {
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  km: number | null;
  fecha: string | null;
}

export interface AvisoParaRemate {
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  km: number | null;
  primeraVez: string;
  patentes: string[];
}

/**
 * ¿El aviso es el auto de un lote rematado? Seguro si la patente coincide.
 * Posible si es la misma marca, familia de modelo y año, se publicó después
 * del remate y tiene entre los km del remate y 20.000 más.
 */
export function coincideRemate(a: AvisoParaRemate, r: LoteRemate): "patente" | "posible" | null {
  if (r.patente && a.patentes.includes(r.patente)) return "patente";
  if (!a.marca || !r.marca || a.marca.toLowerCase() !== r.marca.toLowerCase()) return null;
  if (!a.anio || a.anio !== r.anio || !a.km || !r.km) return null;
  const fam = (m: string | null) => modeloCanonico(m ?? "").replace(/cc$/, "");
  if (!fam(a.modelo) || fam(a.modelo) !== fam(r.modelo)) return null;
  if (r.fecha && new Date(a.primeraVez).getTime() < new Date(r.fecha).getTime()) return null;
  return a.km >= r.km && a.km <= r.km + 20_000 ? "posible" : null;
}
