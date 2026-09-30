import type { ResultadoAuto } from "@/lib/datos";

/** Mes de la revisión técnica de autos particulares según el último dígito de la patente (calendario del MTT). */
const MES_REVISION: Record<string, number> = { "9": 1, "0": 2, "1": 4, "2": 5, "3": 6, "4": 7, "5": 8, "6": 9, "7": 10, "8": 11 };
export const NOMBRE_MES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function mesRevision(patente?: string | null): number | null {
  const d = patente?.replace(/\D/g, "").at(-1);
  return d ? (MES_REVISION[d] ?? null) : null;
}

export interface Mantencion {
  nombre: string;
  cada: string;
  proximoKm: number | null;
  /** Cuánto falta (km); negativo = pasado. */
  faltan: number | null;
  nota?: string;
}

/** Lo que toca según el km (y la edad, para la correa). Sin historial, se cuenta desde cero en cada intervalo. */
export function mantenciones(r: Pick<ResultadoAuto, "traccion" | "caja" | "anio" | "motor">, km: number): Mantencion[] {
  const proximo = (cada: number) => Math.ceil((km + 1) / cada) * cada;
  const item = (nombre: string, cadaKm: number, cada: string, nota?: string): Mantencion => ({ nombre, cada, proximoKm: proximo(cadaKm), faltan: proximo(cadaKm) - km, nota });
  const edad = r.anio ? new Date().getFullYear() - r.anio : 0;
  const lista = [
    item("Aceite y filtros", 15_000, "cada 15.000 km o 1 año"),
    item("Frenos (revisar)", 20_000, "cada 20.000 km"),
    ...(r.caja !== "manual" ? [item("Aceite de la caja automática", 60_000, "cada 60.000 km", "Volvo lo da por \"de por vida\", pero cambiarlo alarga la vida de la Geartronic")] : []),
    ...(r.traccion === "AWD" ? [item("Aceite y filtro del Haldex (AWD)", 40_000, "cada 40.000 km")] : []),
    {
      nombre: "Correa de distribución",
      cada: "según el manual; en muchos Volvo, entre 150.000 y 240.000 km, o a los 10 años",
      proximoKm: 150_000,
      faltan: 150_000 - km,
      nota: edad >= 9 ? `El auto tiene ${edad} años: si no hay registro de cambio, hazla pronto aunque tenga pocos km` : "Revisa en los registros cuándo se cambió",
    },
  ];
  return lista.sort((a, b) => (a.faltan ?? Infinity) - (b.faltan ?? Infinity));
}

/** Texto para publicar el auto a la venta (se edita antes de copiar). */
export function textoParaVender(r: ResultadoAuto, km: number, precio: number | null): string {
  const partes = [
    `Vendo ${[r.marcaAuto, r.modelo, r.version && r.version !== "No declarada" ? r.version : null, r.motor, r.traccion === "AWD" ? "AWD" : null].filter(Boolean).join(" ")} ${r.anio ?? ""}`.trim() + ".",
    `${km.toLocaleString("es-CL")} km${r.caja ? `, caja ${r.caja === "automatica" ? "automática" : "manual"}` : ""}.`,
    "Mantenciones al día, papeles al día y sin multas.",
    precio ? `Precio: $${precio.toLocaleString("es-CL")}, conversable.` : null,
    "Se puede ver en Santiago. Escríbeme para coordinar.",
  ];
  return partes.filter(Boolean).join("\n");
}
