import type { ResultadoAuto } from "@/lib/datos";

export const miles = (n: number) => n.toLocaleString("es-CL");
export const pesos = (n: number) => `$${miles(n)}`;
/** "$8,7 M" para lo que no necesita el número completo. */
export const millones = (n: number) => `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M`;

export const NOMBRE_FUENTE: Record<string, string> = { chileautos: "Chileautos", facebook: "Facebook", mercadolibre: "MercadoLibre", kavak: "Kavak", yapo: "Yapo" };

/** Nombre corto de cada alerta, para las etiquetas. */
export const ETIQUETA_ALERTA: Record<string, string> = {
  dano: "Posible daño",
  remate: "Remate",
  perdida_total: "Pérdida total",
  compania_seguros: "Compañía de seguros",
  precio_distinto: "Otro precio",
  datos_inconsistentes: "Datos que no cuadran",
};

/** Los motivos de evaluar() ("Km 125.000 sobre 120.000") en corto. */
function etiquetaMotivo(m: string) {
  if (m.startsWith("Km ")) return "Km sobre tu tope";
  if (m.startsWith("Precio ")) return "Sobre tu tope";
  if (m.startsWith("Año ")) return "Año fuera de rango";
  if (m.startsWith("Modelo por confirmar")) return "Modelo por confirmar";
  return m;
}

/** Etiquetas de lo que hay que revisar: alertas del aviso y por qué se sale de la ficha. */
export function etiquetas(r: Pick<ResultadoAuto, "alertas" | "motivos" | "veredicto">) {
  const de = r.alertas.map((a) => ETIQUETA_ALERTA[a] ?? a);
  const por = r.veredicto === "advertencia" ? r.motivos.map(etiquetaMotivo) : [];
  return [...new Set([...por, ...de])];
}

export const haceDias = (fecha: string) => {
  const d = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
};

/** "V40 Cross Country T4 AWD": el modelo con lo que distingue a este auto. */
export function tituloAuto(r: Pick<ResultadoAuto, "modelo" | "titulo" | "motor" | "traccion" | "version">) {
  if (!r.modelo) return r.titulo;
  const version = r.version && !["No declarada", "Base CC"].includes(r.version) ? r.version : null;
  return [r.modelo, version, r.motor, r.traccion === "AWD" ? "AWD" : null].filter(Boolean).join(" ");
}

export const caja = (c: string | null) => (c === "automatica" ? "automática" : c === "manual" ? "manual" : null);

/** "2018, 90.000 km, manual" */
export function lineaAuto(r: Pick<ResultadoAuto, "anio" | "km" | "caja" | "traccion">) {
  return [r.anio, r.km !== null ? `${miles(r.km)} km` : null, caja(r.caja) ?? (r.traccion === "AWD" ? "AWD" : null)].filter(Boolean).join(", ");
}

export const lugar = (r: Pick<ResultadoAuto, "comuna" | "region">) => r.comuna ?? r.region?.replace("Metropolitana de Santiago", "RM") ?? null;

export const bajo = (r: Pick<ResultadoAuto, "precio" | "precioInicial">) => r.precio !== null && r.precioInicial !== null && r.precio < r.precioInicial;
