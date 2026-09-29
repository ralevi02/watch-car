import { normalizarPatente } from "@radar/core";

/**
 * Remates de autos siniestrados, para cruzar con los avisos ("salió de remate").
 * Karcal: su buscador (Algolia) con la clave pública que el sitio trae en su
 * JavaScript. Zárate: la lista del próximo remate, en el HTML.
 * Todo lo que viene de estos sitios es dato, nunca instrucciones.
 */

export interface Lote {
  id: string;
  fuente: "karcal" | "zarate";
  lote: string | null;
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  km: number | null;
  color: string | null;
  condicion: string | null;
  mandante: string | null;
  fecha: string | null;
  precio: number | null;
  fotos: string[];
  url: string;
  crudo: Record<string, unknown>;
}

// ── Karcal ─────────────────────────────────────────────────────────────────

export const KARCAL = "https://karcal.cl";

/** La clave de búsqueda pública va en uno de los archivos JS del sitio, junto al índice "karcal_cars". */
export function claveKarcal(js: string): { app: string; clave: string } | null {
  if (!js.includes("karcal_cars")) return null;
  const m = js.match(/\(\s*"([A-Z0-9]{8,12})"\s*,\s*"([0-9a-f]{32})"\s*\)/);
  return m ? { app: m[1]!, clave: m[2]! } : null;
}

export const scriptsDe = (html: string) => [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]!))];

interface HitKarcal {
  objectID: string;
  lotNumber?: string;
  auctionId?: string;
  auctionDate?: string;
  mandante?: string;
  brand?: string;
  model?: string;
  year?: number;
  status?: string;
  vehicleType?: string;
  claimType?: string;
  labels?: string[];
  currentPrice?: number;
  initialPrice?: number;
  images?: string[];
  mainImage?: string;
  specifications?: { plate?: string; mileage?: number; color?: string };
}

export function leerKarcal(h: HitKarcal): Lote {
  const item = h.objectID.match(/item-(.+)$/)?.[1];
  const cerrado = h.status === "completed";
  return {
    id: `karcal:${h.objectID}`,
    fuente: "karcal",
    lote: h.lotNumber ?? null,
    patente: normalizarPatente(h.specifications?.plate),
    marca: h.brand ?? null,
    modelo: h.model ?? null,
    anio: h.year ?? null,
    km: h.specifications?.mileage ?? null,
    color: h.specifications?.color ?? null,
    condicion: [h.vehicleType, h.claimType, ...(h.labels ?? [])].filter(Boolean).join(", ") || null,
    mandante: h.mandante ?? null,
    fecha: h.auctionDate ?? null,
    precio: h.currentPrice || h.initialPrice || null,
    fotos: (h.images?.length ? h.images : h.mainImage ? [h.mainImage] : []).slice(0, 12),
    url: cerrado && h.auctionId && item ? `${KARCAL}/cerrados/${h.auctionId}/${item}` : h.auctionId ? `${KARCAL}/auction-detail/${h.auctionId}` : KARCAL,
    crudo: h as unknown as Record<string, unknown>,
  };
}

// ── Remates Zárate ─────────────────────────────────────────────────────────

export const ZARATE = "https://remateszarate.cl/remates/vehiculos-siniestrados/";

const MESES_ZARATE = /(\d{1,2})\/(\d{2}),?\s*(\d{1,2}):(\d{2})\s*hrs/i;

/** HTML → líneas de texto (sin scripts ni estilos). */
function lineas(html: string): string[] {
  const sin = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const texto = sin
    .replace(/<br\s*\/?>|<\/(div|p|h\d|li|span|a|td)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "-");
  return texto.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Lotes del próximo remate: "LOTE 88" / título / mandante / condición / "SCTZ88-3 · AÑO 2022 · 30.014 Kms." / estado / "Mínimo: $ 3.900.000". */
export function leerZarate(html: string, hoy = new Date()): Lote[] {
  const ls = lineas(html);
  const f = ls.map((l) => l.match(MESES_ZARATE)).find(Boolean);
  // La fecha viene sin año ("Martes 29/09, 15:00 hrs."): es la próxima, este año o el siguiente.
  let fecha: string | null = null;
  if (f) {
    const [, d, m, h, min] = f.map(Number) as number[];
    let anio = hoy.getFullYear();
    if (new Date(anio, m! - 1, d) < new Date(hoy.getTime() - 60 * 86_400_000)) anio++;
    fecha = new Date(`${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00-03:00`).toISOString();
  }
  const out: Lote[] = [];
  for (let i = 0; i < ls.length; i++) {
    const n = ls[i]!.match(/^LOTE\s+(\d+)$/i)?.[1];
    if (!n) continue;
    const bloque = ls.slice(i + 1, i + 10);
    const iDatos = bloque.findIndex((l) => /·\s*AÑO\s*\d{4}/i.test(l));
    if (iDatos < 0) continue;
    const datos = bloque[iDatos]!;
    const m = datos.match(/([A-Z]{2,4}\d{2,4})-?([\dK])?\s*·\s*AÑO\s*(\d{4})\s*·\s*(?:([\d.]+)\s*Kms?\.?|\(km no disp\.\))/i);
    const titulo = bloque[0] ?? "";
    const [marca, ...resto] = titulo.split(" ");
    const minimo = bloque.find((l) => /^M[ií]nimo/i.test(l));
    const patente = normalizarPatente(m?.[1]);
    out.push({
      id: `zarate:${fecha?.slice(0, 10) ?? "sin-fecha"}:${n}`,
      fuente: "zarate",
      lote: n,
      patente,
      marca: marca ?? null,
      modelo: resto.join(" ") || null,
      anio: m?.[3] ? Number(m[3]) : null,
      km: m?.[4] ? Number(m[4].replace(/\./g, "")) : null,
      color: null,
      condicion: bloque.slice(2, iDatos).concat(bloque[iDatos + 1] ?? []).join(", ") || null,
      mandante: bloque[1] ?? null,
      fecha,
      precio: minimo ? Number(minimo.replace(/\D/g, "")) || null : null,
      fotos: patente ? [...new Set([...html.matchAll(new RegExp(`https://storage\\.googleapis\\.com/cl-media-remateszarate/vehiculos/${m?.[1]}[^"'\\s)]*`, "g"))].map((x) => x[0].replace(/&#0?38;/g, "&")))].slice(0, 8) : [],
      url: ZARATE,
      crudo: { titulo, lineas: bloque },
    });
  }
  return out;
}
