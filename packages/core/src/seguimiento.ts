import { z } from "zod";
import { modeloCalza, modeloCanonico } from "./normalizacion.ts";

/**
 * La "ficha" de un seguimiento: lo que el chat arma a partir de lo que pides
 * en lenguaje natural, y lo que los recolectores usan para buscar y filtrar.
 *
 * Un límite "duro" deja fuera el aviso. Un límite "con advertencia" lo deja
 * entrar, pero marcado.
 */

const Rango = z
  .object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
    /** Hasta dónde se acepta pasar el máximo, con advertencia. */
    maxConAdvertencia: z.number().int().nonnegative().optional(),
  })
  .refine((r) => r.min === undefined || r.max === undefined || r.min <= r.max, {
    message: "min no puede ser mayor que max",
  })
  .refine(
    (r) => r.max === undefined || r.maxConAdvertencia === undefined || r.maxConAdvertencia >= r.max,
    { message: "maxConAdvertencia debe ser mayor o igual que max" },
  );

export const Fuente = z.enum(["chileautos", "facebook", "mercadolibre", "kavak", "yapo"]);
export type Fuente = z.infer<typeof Fuente>;

export const Seguimiento = z.object({
  nombre: z.string().min(1).describe("Nombre corto, ej: 'Volvo V40 Cross Country'"),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  /** Cómo se publica a veces el mismo modelo (ej. "V40 CC", "V40 Cross", "V40"). */
  alias: z.array(z.string()).default([]),
  /** Cómo se llama el modelo en los filtros de los portales, sin versión (ej. "V40" para un V40 Cross Country). */
  modeloPortal: z
    .string()
    .optional()
    .describe("Modelo como aparece en los filtros de los portales, sin versión. Ej: 'V40' para un V40 Cross Country. Vacío = igual a modelo"),
  anio: Rango.default({}),
  km: Rango.default({}),
  /** En pesos chilenos. */
  precio: Rango.default({}),
  motoresExcluidos: z.array(z.string()).default([]).describe("ej: ['D2']"),
  motoresIncluidos: z.array(z.string()).default([]).describe("Vacío = cualquiera"),
  traccion: z.enum(["cualquiera", "AWD", "FWD"]).default("cualquiera"),
  caja: z.enum(["cualquiera", "automatica", "manual"]).default("cualquiera"),
  regiones: z.array(z.string()).default([]).describe("Vacío = todo Chile"),
  fuentes: z.array(Fuente).default(["chileautos", "facebook", "mercadolibre", "kavak", "yapo"]),
  frecuenciaHoras: z.number().int().min(1).max(24).default(3),
  notas: z.string().optional().describe("Cualquier criterio que no calce en los campos anteriores"),
});
export type Seguimiento = z.infer<typeof Seguimiento>;

export type Veredicto =
  | { tipo: "calza" }
  | { tipo: "advertencia"; motivos: string[] }
  | { tipo: "fuera"; motivos: string[] };

export interface AvisoNormalizado {
  /** Qué vende el aviso; lo que no es un auto queda fuera. */
  tipo?: "auto" | "repuesto" | "accesorio" | "otro";
  /** Modelo según la normalización, ej. "V40" o "V40 Cross Country". */
  modelo?: string;
  /** Campos que la normalización marcó como dudosos. */
  porConfirmar?: readonly string[];
  anio?: number;
  km?: number;
  precio?: number;
  motor?: string;
  traccion?: "AWD" | "FWD";
  caja?: "automatica" | "manual";
}

const fmt = (n: number) => n.toLocaleString("es-CL");

function revisarRango(
  valor: number | undefined,
  rango: z.infer<typeof Rango>,
  etiqueta: string,
  motivosFuera: string[],
  motivosAdv: string[],
  f: (n: number) => string = fmt,
) {
  if (valor === undefined) return;
  if (rango.min !== undefined && valor < rango.min) motivosFuera.push(`${etiqueta} ${f(valor)} bajo el mínimo`);
  if (rango.max !== undefined && valor > rango.max) {
    if (rango.maxConAdvertencia !== undefined && valor <= rango.maxConAdvertencia) {
      motivosAdv.push(`${etiqueta} ${f(valor)} sobre ${f(rango.max)}`);
    } else {
      motivosFuera.push(`${etiqueta} ${f(valor)} sobre el máximo`);
    }
  }
}

/** Compara un aviso ya normalizado con la ficha. Los datos que faltan no descartan. */
export function evaluar(aviso: AvisoNormalizado, s: Seguimiento): Veredicto {
  const fuera: string[] = [];
  const adv: string[] = [];
  if (aviso.tipo && aviso.tipo !== "auto") return { tipo: "fuera", motivos: [`No es un auto (${aviso.tipo})`] };
  // Bajo un millón no hay auto usado: es un repuesto o un precio de mentira ($1, $100.000).
  if (aviso.precio !== undefined && aviso.precio < 1_000_000) return { tipo: "fuera", motivos: [`Precio $${fmt(aviso.precio)}: no es el precio de un auto`] };
  if (aviso.modelo) {
    // La duda de modelo es casi siempre "¿base o Cross Country?". Solo importa
    // si la ficha pide el Cross Country; si acepta el modelo base, calza igual.
    const dudoso = aviso.porConfirmar?.includes("modelo");
    const base = modeloCanonico(aviso.modelo).replace(/cc$/, "");
    const mismaFamilia = modeloCalza(s.modelo, base);
    const aceptaLaBase = modeloCalza(base, s.modelo);
    if (dudoso && mismaFamilia && !aceptaLaBase) adv.push(`¿Es ${s.modelo}? Publicado como ${aviso.modelo}`);
    else if (!modeloCalza(aviso.modelo, s.modelo)) fuera.push(`Es ${aviso.modelo}, no ${s.modelo}`);
  }
  revisarRango(aviso.anio, s.anio, "Año", fuera, adv, String);
  revisarRango(aviso.km, s.km, "Km", fuera, adv);
  revisarRango(aviso.precio, s.precio, "Precio", fuera, adv, (n) => `$${fmt(n)}`);
  // Muy por debajo del tope casi nunca es el auto: repuestos, arriendo, el pie o un precio de mentira.
  if (aviso.precio === undefined && s.precio.max !== undefined) adv.push("Sin precio publicado");
  if (aviso.precio !== undefined && s.precio.max !== undefined && aviso.precio < s.precio.max * 0.25) {
    adv.push(`Precio muy bajo ($${fmt(aviso.precio)})`);
  }
  if (aviso.motor && s.motoresExcluidos.some((m) => m.toLowerCase() === aviso.motor!.toLowerCase())) {
    fuera.push(`Motor ${aviso.motor} excluido`);
  }
  if (aviso.motor && s.motoresIncluidos.length > 0 && !s.motoresIncluidos.some((m) => m.toLowerCase() === aviso.motor!.toLowerCase())) {
    fuera.push(`Motor ${aviso.motor} no está en la lista`);
  }
  if (s.traccion !== "cualquiera" && aviso.traccion && aviso.traccion !== s.traccion) fuera.push(`Tracción ${aviso.traccion}`);
  if (s.caja !== "cualquiera" && aviso.caja && aviso.caja !== s.caja) fuera.push(`Caja ${aviso.caja}`);
  if (fuera.length > 0) return { tipo: "fuera", motivos: fuera };
  if (adv.length > 0) return { tipo: "advertencia", motivos: adv };
  return { tipo: "calza" };
}

/** El ejemplo de la conversación, útil para pruebas. */
export const EJEMPLO_V40CC: Seguimiento = Seguimiento.parse({
  nombre: "Volvo V40 Cross Country",
  marca: "Volvo",
  modelo: "V40 Cross Country",
  alias: ["V40 CC", "V40 Cross", "V40"],
  modeloPortal: "V40",
  anio: { min: 2017 },
  km: { max: 120000, maxConAdvertencia: 150000 },
  precio: { max: 14000000 },
  motoresExcluidos: ["D2"],
});
