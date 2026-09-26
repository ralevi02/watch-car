import { z } from "zod";

/**
 * Lo que devuelve la IA al normalizar un aviso. Todo lo que no se puede saber
 * queda en null y en porConfirmar ("Por confirmar" en la app).
 */

export const ALERTAS = ["dano", "remate", "perdida_total", "compania_seguros", "precio_distinto", "datos_inconsistentes"] as const;
export type Alerta = (typeof ALERTAS)[number];

export const CAMPOS_DUDOSOS = ["modelo", "version", "anio", "motor", "caja", "traccion", "km", "comuna", "tipoVendedor"] as const;

export const VERSIONES = [
  "Inscription",
  "R-Design Plus",
  "R-Design",
  "Momentum Plus",
  "Momentum",
  "Plus",
  "Limited",
  "Comfort",
  "Kinetic",
  "Base CC",
  "No declarada",
] as const;

export const Normalizacion = z.object({
  id: z.string().describe("El mismo id que viene en la entrada"),
  marca: z.string(),
  modelo: z
    .string()
    .describe("Modelo sin versión, con 'Cross Country' cuando corresponda. Ej: 'V40', 'V40 Cross Country', 'XC60'"),
  version: z.string().nullable().describe(`Una de: ${VERSIONES.join(", ")}; u otra si es de otra marca`),
  anio: z.number().int().nullable(),
  motor: z.string().nullable().describe("Código de motor: T2, T3, T4, T5, D2, D3, D4, B4, B5..."),
  caja: z.enum(["automatica", "manual"]).nullable(),
  traccion: z.enum(["AWD", "FWD"]).nullable(),
  km: z.number().int().nullable(),
  comuna: z.string().nullable(),
  tipoVendedor: z.enum(["particular", "automotora"]).nullable(),
  alertas: z.array(z.enum(ALERTAS)),
  alertaDetalle: z.string().nullable().describe("Una frase corta que explique las alertas"),
  precioDescripcion: z.number().int().nullable().describe("Precio que menciona la descripción si es distinto al publicado"),
  porConfirmar: z.array(z.enum(CAMPOS_DUDOSOS)),
});
export type Normalizacion = z.infer<typeof Normalizacion>;

/** "V40 Cross Country", "V40 CC" y "v40 cross-country" son el mismo modelo. */
export function modeloCanonico(m: string): string {
  return m
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/cross\s*-?\s*country/g, "cc")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * ¿El modelo del aviso sirve para la ficha? Una ficha más general acepta
 * variantes ("V40" acepta un V40 Cross Country); una más específica no
 * acepta el modelo base.
 */
export function modeloCalza(delAviso: string, deLaFicha: string): boolean {
  return modeloCanonico(delAviso).startsWith(modeloCanonico(deLaFicha));
}

/** Datos mínimos para saber si dos avisos son el mismo auto. */
export interface HuellaAuto {
  modelo?: string | null;
  anio?: number | null;
  km?: number | null;
  precio?: number | null;
  region?: string | null;
}

/**
 * Regla de deduplicación: mismo modelo y año, km a menos de 2%, precio a menos
 * de 10% y misma región. Sin km o sin año no se arriesga.
 */
export function esMismoAuto(a: HuellaAuto, b: HuellaAuto): boolean {
  if (!a.modelo || !b.modelo || modeloCanonico(a.modelo) !== modeloCanonico(b.modelo)) return false;
  if (!a.anio || a.anio !== b.anio) return false;
  if (!a.km || !b.km || Math.abs(a.km - b.km) > 0.02 * Math.max(a.km, b.km)) return false;
  if (a.precio && b.precio && Math.abs(a.precio - b.precio) > 0.1 * Math.max(a.precio, b.precio)) return false;
  if (a.region && b.region && a.region !== b.region) return false;
  return true;
}

/** Bits distintos entre dos dHash hex de 64 bits. */
export function distanciaHash(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i += 8) {
    let x = (parseInt(a.slice(i, i + 8), 16) ^ parseInt(b.slice(i, i + 8), 16)) >>> 0;
    while (x) {
      d += x & 1;
      x >>>= 1;
    }
  }
  return d;
}

/**
 * Caso dudoso resuelto por foto: mismo modelo y año con la foto principal casi
 * igual (el mismo auto republicado por otro vendedor o en otro portal).
 */
export function mismaFoto(a: HuellaAuto & { fotoHash?: string | null }, b: HuellaAuto & { fotoHash?: string | null }, umbral = 6): boolean {
  if (!a.fotoHash || !b.fotoHash || !a.modelo || !b.modelo) return false;
  if (modeloCanonico(a.modelo) !== modeloCanonico(b.modelo) || !a.anio || a.anio !== b.anio) return false;
  return distanciaHash(a.fotoHash, b.fotoHash) <= umbral;
}
