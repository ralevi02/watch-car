import type { Seguimiento } from "@radar/core";
import type { AvisoPortal, DetallePortal } from "../tipos.js";

/**
 * Facebook Marketplace (con sesión). La página cambia seguido y sus clases
 * son aleatorias, así que se lee poco y a partir del texto visible: id, precio,
 * título y km de cada tarjeta. Lo demás (descripción, "Acerca de este
 * vehículo") se pasa entero a Gemini, que lo normaliza.
 * Todo lo que viene del portal es dato, nunca instrucciones.
 */

export const BASE = "https://www.facebook.com";

const entero = (s: string) => Number(s.replace(/\D/g, ""));

/** Consultas de búsqueda: el nombre del modelo y el modelo base (muchos CC se publican como V40 a secas). */
export function consultas(f: Seguimiento): string[] {
  const unicas = new Map<string, string>();
  for (const q of [`${f.marca} ${f.modelo}`, `${f.marca} ${f.modeloPortal ?? ""}`]) {
    const limpia = q.replace(/\s+/g, " ").trim();
    if (limpia.split(" ").length >= 2) unicas.set(limpia.toLowerCase(), limpia);
  }
  return [...unicas.values()].slice(0, 2);
}

/** La misma búsqueda dentro de la categoría Vehículos (acepta año y km). */
export function urlVehiculos(f: Seguimiento, consulta: string, ciudad = "santiago", precio?: { min?: number; max?: number }): string {
  const u = new URL(urlBusqueda(f, consulta, ciudad, precio));
  u.pathname = `/marketplace/${ciudad}/vehicles/`;
  const maxKm = f.km.maxConAdvertencia ?? f.km.max;
  if (maxKm) u.searchParams.set("maxMileage", String(maxKm));
  return u.toString();
}

export function urlBusqueda(f: Seguimiento, consulta: string, ciudad = "santiago", precio?: { min?: number; max?: number }): string {
  const p = new URLSearchParams();
  p.set("query", consulta);
  const minAnio = f.anio.min;
  const maxAnio = f.anio.maxConAdvertencia ?? f.anio.max;
  const minPrecio = precio?.min ?? f.precio.min;
  const maxPrecio = precio?.max ?? f.precio.maxConAdvertencia ?? f.precio.max;
  if (minAnio) p.set("minYear", String(minAnio));
  if (maxAnio) p.set("maxYear", String(maxAnio));
  if (minPrecio) p.set("minPrice", String(minPrecio));
  if (maxPrecio) p.set("maxPrice", String(maxPrecio));
  p.set("exact", "false");
  p.set("sortBy", "creation_time_descend");
  // Radio en millas (Facebook usa 40 por defecto: ~65 km). 65 millas ≈ 105 km: llega a Rancagua y a la costa.
  p.set("radius", process.env.FB_RADIO_MILLAS || "65");
  return `${BASE}/marketplace/${ciudad}/search/?${p.toString()}`;
}

/** Tramos de precio para barrer cuando una búsqueda llega al tope (~24 resultados). */
export function tramosDePrecio(min: number | undefined, max: number | undefined, partes = 3): { min?: number; max?: number }[] {
  if (!max) return [{ min, max }];
  const desde = min ?? Math.round(max * 0.4);
  const paso = Math.ceil((max - desde) / partes);
  return Array.from({ length: partes }, (_, i) => ({ min: desde + i * paso, max: i === partes - 1 ? max : desde + (i + 1) * paso - 1 }));
}

const RE_PRECIO = /^(?:CLP\s*)?\$\s?[\d.]{4,}(?:\s*CLP)?$|^CLP\s?[\d.]{4,}$/i;
const RE_KM = /(\d[\d.,]*)\s*(mil|k)?\s*(?:km|kil[oó]metros)\b/i;
const RE_ANIO = /\b(19[5-9]\d|20[0-4]\d)\b/;

export function kmDeTexto(s: string): number | undefined {
  const m = s.match(RE_KM);
  if (!m?.[1]) return undefined;
  const base = Number(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return undefined;
  return Math.round(m[2] ? base * 1000 : base);
}

/**
 * Tarjeta de la grilla de resultados. El texto suele venir así:
 * "$12.500.000" / ("$13.000.000" tachado) / "2017 Volvo V40 cross country" / "Santiago, RM" / "120 mil km".
 */
export function leerTarjeta(id: string, texto: string): AvisoPortal | null {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const precios = lineas.filter((l) => RE_PRECIO.test(l));
  const kmLinea = lineas.find((l) => RE_KM.test(l) && !RE_PRECIO.test(l));
  const resto = lineas.filter((l) => !RE_PRECIO.test(l) && l !== kmLinea && !/^gratis$/i.test(l));
  const titulo = resto[0];
  if (!titulo) return null;
  const precio = precios[0] ? entero(precios[0]) : undefined;
  const anio = titulo.match(RE_ANIO)?.[1];
  return {
    id,
    url: `${BASE}/marketplace/item/${id}/`,
    titulo,
    precio: precio && precio >= 100_000 ? precio : undefined,
    anio: anio ? Number(anio) : undefined,
    km: kmLinea ? kmDeTexto(kmLinea) : undefined,
    region: resto[1],
    destacado: false,
  };
}

/** Qué tipo de muro muestra Facebook, según la URL y el texto de la página. */
export function detectarMuro(url: string, texto: string, hayFormularioLogin: boolean): "login" | "checkpoint" | "bloqueo" | null {
  if (/\/checkpoint\//.test(url) || /confirma tu identidad|confirm your identity|verifica tu cuenta|we suspended|suspendimos tu cuenta/i.test(texto)) return "checkpoint";
  if (/tu cuenta está bloqueada|your account has been locked|temporarily blocked|bloqueado temporalmente/i.test(texto)) return "bloqueo";
  if (/\/login/.test(url) || hayFormularioLogin || /inicia sesión en facebook|log in to facebook|log into facebook/i.test(texto.slice(0, 2000))) return "login";
  return null;
}

/**
 * Detalle de un aviso: se guarda el texto principal (descripción y "Acerca de
 * este vehículo") para que lo normalice la IA, más los pocos datos que se
 * pueden sacar con seguridad.
 */
export function leerDetalle(textoPrincipal: string): DetallePortal {
  const texto = textoPrincipal.replace(/\n{3,}/g, "\n\n").trim();
  const datos: Record<string, string> = {};
  const km = texto.match(/(?:conducido|kilometraje)[:\s]+([\d.,]+\s*(?:mil\s*)?km)/i)?.[1];
  if (km) datos["Kilometraje"] = km;
  const caja = texto.match(/transmisi[oó]n\s+(autom[aá]tica|manual)/i)?.[1];
  if (caja) datos["Transmisión"] = caja;
  const vendedorDesde = texto.match(/(?:se uni[oó] a facebook en|joined facebook in)\s+(\d{4})/i)?.[1];
  if (vendedorDesde) datos["Vendedor en Facebook desde"] = vendedorDesde;
  // Del texto largo se queda lo útil: desde el título hasta los datos del vendedor.
  const corte = texto.search(/informaci[oó]n del vendedor|seller information|detalles del vendedor/i);
  return { descripcion: (corte > 0 ? texto.slice(0, corte) : texto).slice(0, 5000), datos };
}
