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
  return u.toString();
}

export type Orden = "nuevos" | "relevancia";
export interface BusquedaFb {
  consulta: string;
  precio?: { min?: number; max?: number };
  orden: Orden;
}

/**
 * Facebook entrega como máximo unos 24 resultados por búsqueda, así que una sola
 * búsqueda nunca trae todo (los avisos de hace semanas quedan fuera). El barrido
 * completo reparte el modelo base en tramos de precio de un millón (cada uno en
 * los dos órdenes) y en búsquedas con el año en el texto, y junta todo. El corto
 * solo mira lo más nuevo.
 */
export function planBusquedas(f: Seguimiento, completo: boolean): BusquedaFb[] {
  const [conVersion, base] = consultas(f).length > 1 ? consultas(f) : [undefined, consultas(f)[0]!];
  const directas = [conVersion, base].filter((q): q is string => Boolean(q)).flatMap((consulta) =>
    completo ? (["nuevos", "relevancia"] as const).map((orden) => ({ consulta, orden })) : [{ consulta, orden: "nuevos" as const }],
  );
  if (!completo) return directas;
  const tramos = tramosDePrecio(f.precio.min, f.precio.maxConAdvertencia ?? f.precio.max);
  const porPrecio = tramos.flatMap((precio) => (["relevancia", "nuevos"] as const).map((orden) => ({ consulta: base, precio, orden })));
  const porAnio = aniosDe(f).map((anio) => ({ consulta: `${base} ${anio}`, orden: "relevancia" as const }));
  return [...directas, ...porAnio, ...porPrecio];
}

/** Años a buscar con el año en el texto: los de la ficha y uno antes (los que casi calzan), como mucho ocho. */
function aniosDe(f: Seguimiento): number[] {
  const hasta = f.anio.maxConAdvertencia ?? f.anio.max ?? new Date().getFullYear();
  const desde = f.anio.min !== undefined ? f.anio.min - 1 : hasta - 7;
  return Array.from({ length: Math.max(0, Math.min(8, hasta - desde + 1)) }, (_, i) => desde + i);
}

export function urlBusqueda(f: Seguimiento, consulta: string, ciudad = "santiago", precio?: { min?: number; max?: number }, orden: Orden = "nuevos"): string {
  const p = new URLSearchParams();
  p.set("query", consulta);
  const minAnio = f.anio.min;
  const maxAnio = f.anio.maxConAdvertencia ?? f.anio.max;
  const minPrecio = precio?.min ?? f.precio.min;
  const maxPrecio = precio?.max ?? f.precio.maxConAdvertencia ?? f.precio.max;
  // Año y km NO van a Facebook: esos filtros dejan fuera los avisos publicados
  // como artículo común (sin año ni km en campos propios). Se aplican después, al leer cada aviso.
  void minAnio;
  void maxAnio;
  if (minPrecio) p.set("minPrice", String(minPrecio));
  if (maxPrecio) p.set("maxPrice", String(maxPrecio));
  p.set("exact", "false");
  if (orden === "nuevos") p.set("sortBy", "creation_time_descend");
  // En km. Amplio a propósito: lo que queda fuera de la zona de la ficha no se descarta, aparece con aviso.
  p.set("radius", process.env.FB_RADIO_KM || "500");
  return `${BASE}/marketplace/${ciudad}/search/?${p.toString()}`;
}

/** Tramos de precio para repartir una búsqueda que llega al tope (~24 resultados). */
export function tramosDePrecio(min: number | undefined, max: number | undefined, paso = 1_000_000): { min?: number; max?: number }[] {
  if (!max) return [{ min, max }];
  const tramos: { min: number; max: number }[] = [];
  for (let desde = min ?? Math.round((max * 0.4) / paso) * paso; desde < max; desde += paso) tramos.push({ min: desde, max: desde + paso >= max ? max : desde + paso - 1 });
  return tramos;
}

const RE_PRECIO = /^(?:CLP\s*)?\$\s?\d[\d.]*(?:\s*CLP)?$|^CLP\s?\d[\d.]*$/i;
const RE_KM = /(\d[\d.,]*)\s*(mil|k)?\s*(?:km|kil[oó]metros)\b/i;
/** La línea del km en la tarjeta es solo eso ("120 mil km"); si el título trae km, sigue siendo título. */
const RE_LINEA_KM = /^(?:\d[\d.,]*)\s*(?:mil|k)?\s*(?:km|kil[oó]metros)$/i;
/** Etiquetas de Facebook que no son parte del aviso. */
const RE_ETIQUETA = /^(gratis|reci[eé]n publicado|nuevo|disponible|vendido|pendiente|env[ií]o gratis|just listed|free)$/i;
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
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    // A veces el texto llega pegado: "$13.990.0002016 Volvo v60…" y "…dieselSantiago, RM".
    .flatMap((l) => l.replace(/^((?:CLP\s*)?\$\s?\d{1,3}(?:\.\d{3})*)(?=(?:19|20)\d{2}\b|[^\d.\s])/i, "$1\n").split("\n"))
    .flatMap((l) => l.replace(/([a-záéíóúñ\d])([A-ZÁÉÍÓÚÑ][\p{L} ]+, [A-Z]{2,3})$/u, "$1\n$2").split("\n"))
    .map((l) => l.trim())
    .filter((l) => l && !RE_ETIQUETA.test(l));
  const precios = lineas.filter((l) => RE_PRECIO.test(l));
  const kmLinea = lineas.find((l) => RE_LINEA_KM.test(l));
  const resto = lineas.filter((l) => !RE_PRECIO.test(l) && l !== kmLinea);
  const titulo = resto[0];
  if (!titulo) return null;
  const precio = precios[0] ? entero(precios[0]) : undefined;
  const anio = titulo.match(RE_ANIO)?.[1];
  const km = kmLinea ?? (RE_KM.test(titulo) ? titulo : undefined);
  return {
    id,
    url: `${BASE}/marketplace/item/${id}/`,
    titulo,
    // Precios de mentira ($1, $100) se guardan igual: son señal de que no es un auto.
    precio: precio && precio > 0 ? precio : undefined,
    anio: anio ? Number(anio) : undefined,
    km: km ? kmDeTexto(km) : undefined,
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
