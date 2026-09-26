import type { Seguimiento } from "@radar/core";
import type { AvisoPortal } from "../tipos.js";

/**
 * Kavak (automotora con precio fijo). La lista por modelo está en
 * /cl/usados/<marca>/<modelo> y cada tarjeta trae sus datos en textos cortos:
 * "Volvo • V40" / "2016 • 87.000 km • 1.6 T4 COMFORT CROSS COUNTRY • Automático" /
 * "Precio desde" / "$" / "9.368.900" / "Metropolitana de Santiago".
 * El id viene en data-testid="card-product-545050".
 */

export const BASE = "https://www.kavak.com";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function urlBusqueda(f: Seguimiento): string {
  return `${BASE}/cl/usados/${slug(f.marca)}/${slug(f.modeloPortal || f.modelo)}`;
}

export function leerTarjeta(id: string, url: string, textos: string[]): AvisoPortal | null {
  const t = textos.map((x) => x.trim()).filter(Boolean);
  const detalle = t.find((x) => /^(19|20)\d{2}\s*•/.test(x));
  const cabecera = t.find((x) => x.includes("•") && x !== detalle);
  if (!detalle || !cabecera) return null;
  const partes = detalle.split("•").map((x) => x.trim());
  const iPrecio = t.findIndex((x) => /^[\d.]{5,}$/.test(x));
  const precio = iPrecio >= 0 ? Number(t[iPrecio]!.replace(/\D/g, "")) : undefined;
  const km = partes.find((p) => /km$/i.test(p));
  const caja = partes.find((p) => /autom|manual/i.test(p));
  const version = partes.find((p) => p !== partes[0] && p !== km && p !== caja);
  return {
    id,
    url,
    titulo: [partes[0], cabecera.replace(/\s*•\s*/, " "), version].filter(Boolean).join(" "),
    anio: Number(partes[0]),
    km: km ? Number(km.replace(/\D/g, "")) : undefined,
    caja,
    precio,
    region: iPrecio >= 0 ? t.slice(iPrecio + 1).find((x) => !/^\$$/.test(x)) : undefined,
    vendedor: "Kavak",
    tipoVendedor: "Automotora",
    destacado: false,
  };
}
