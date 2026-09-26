import type { Seguimiento } from "@radar/core";
import type { AvisoPortal } from "../tipos.js";

/**
 * Yapo. Lista por modelo en /autos-usados/<marca>/<modelo> (20 por página;
 * la página N es /autos-usados.N/<marca>/<modelo>). Cada tarjeta es un link
 * /autos-usados/<slug>/<id> con líneas: vendedor (si es automotora), precio
 * "$ 11,870,000", región "Región Metropolitana, La Granja", año, "75,000 km",
 * caja, título y descripción.
 */

export const BASE = "https://www.yapo.cl";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function urlBusqueda(f: Seguimiento, pagina = 1): string {
  return `${BASE}/autos-usados${pagina > 1 ? `.${pagina}` : ""}/${slug(f.marca)}/${slug(f.modeloPortal || f.modelo)}`;
}

const RUIDO = /^(\d+ \/ \d+|previous slide|next slide|resaltado|contactar|llamar|-\d+%)$/i;
const RE_PRECIO = /^\$\s?[\d.,]{5,}$/;

export function leerTarjeta(id: string, url: string, texto: string): (AvisoPortal & { descripcion?: string }) | null {
  const lineas = texto.split("\n").map((l) => l.trim()).filter((l) => l && !RUIDO.test(l));
  const iPrecio = lineas.findIndex((l) => RE_PRECIO.test(l));
  if (iPrecio < 0) return null;
  const precio = Number(lineas[iPrecio]!.replace(/\D/g, ""));
  const vendedor = iPrecio > 0 ? lineas[iPrecio - 1] : undefined;
  const despues = lineas.slice(iPrecio + 1).filter((l) => !RE_PRECIO.test(l));
  const anio = despues.find((l) => /^(19|20)\d{2}$/.test(l));
  const km = despues.find((l) => /^[\d.,]+\s*km$/i.test(l));
  const caja = despues.find((l) => /^(manual|autom[aá]tic[ao])$/i.test(l));
  const region = despues.find((l) => l !== anio && l !== km && l !== caja && l.length < 60 && !/^\d/.test(l));
  const titulo = despues.find((l) => l !== region && l !== anio && l !== km && l !== caja && l.length < 120);
  const descripcion = despues.find((l) => l.length >= 120);
  if (!titulo) return null;
  return {
    id,
    url,
    titulo,
    precio: precio >= 100_000 ? precio : undefined,
    anio: anio ? Number(anio) : undefined,
    km: km ? Number(km.replace(/\D/g, "")) : undefined,
    caja,
    region: region?.split(",")[0]?.trim(),
    vendedor,
    tipoVendedor: vendedor ? "Automotora" : "Particular",
    destacado: /resaltado/i.test(texto),
    descripcion,
  };
}
