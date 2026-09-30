import type { Seguimiento } from "@radar/core";
import type { AvisoPortal, DetallePortal } from "../tipos.js";

/**
 * MercadoLibre por la API oficial (el sitio pide iniciar sesión incluso para
 * ver la lista). Categoría MLC1744: Autos, motos y otros → Autos y camionetas.
 */
export const API = "https://api.mercadolibre.com";
export const CATEGORIA = "MLC1744";

export function urlBusqueda(f: Seguimiento, offset = 0): string {
  const p = new URLSearchParams({ category: CATEGORIA, q: `${f.marca} ${f.modeloPortal || f.modelo}`, limit: "50", offset: String(offset) });
  const min = f.precio.min;
  const max = f.precio.maxConAdvertencia ?? f.precio.max;
  if (min || max) p.set("price", `${min ?? "*"}-${max ?? "*"}`);
  return `${API}/sites/MLC/search?${p.toString()}`;
}

interface Atributo {
  id: string;
  value_name?: string | null;
}

export interface ResultadoML {
  id: string;
  title: string;
  price?: number | null;
  currency_id?: string;
  permalink: string;
  thumbnail?: string;
  attributes?: Atributo[];
  address?: { state_name?: string; city_name?: string };
  location?: { state?: { name?: string }; city?: { name?: string } };
  seller?: { nickname?: string; car_dealer?: boolean; tags?: string[] };
}

const attr = (r: ResultadoML, id: string) => r.attributes?.find((a) => a.id === id)?.value_name ?? undefined;
const entero = (s?: string) => (s ? Number(s.replace(/\D/g, "")) || undefined : undefined);

/** Un aviso por ID, con la API: lo único que MercadoLibre deja leer desde 2025 (la búsqueda responde 403). */
export async function leerItem(id: string, token: string): Promise<{ aviso: AvisoPortal; detalle: DetallePortal }> {
  const h = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const r = await fetch(`${API}/items/${id}`, { headers: h });
  if (!r.ok) throw new Error(`MercadoLibre no entregó el aviso ${id} (HTTP ${r.status})`);
  const item = (await r.json()) as ResultadoML & { pictures?: { secure_url?: string; url?: string }[]; seller_address?: { state?: { name?: string } } };
  const d = await fetch(`${API}/items/${id}/description`, { headers: h }).then((x) => (x.ok ? (x.json() as Promise<{ plain_text?: string }>) : null)).catch(() => null);
  const { aviso, detalle } = leerResultado({ ...item, location: item.location ?? item.seller_address });
  const fotos = (item.pictures ?? []).map((f) => f.secure_url ?? f.url?.replace(/^http:/, "https:")).filter((u): u is string => Boolean(u));
  return {
    aviso: { ...aviso, foto: fotos[0] ?? aviso.foto },
    detalle: { ...detalle, ...(d?.plain_text ? { descripcion: d.plain_text } : {}), ...(fotos.length ? { fotos } : {}) },
  };
}

export function leerResultado(r: ResultadoML): { aviso: AvisoPortal; detalle: DetallePortal } {
  const trim = attr(r, "TRIM");
  const esDealer = r.seller?.car_dealer || r.seller?.tags?.some((t) => /car_dealer|dealer/i.test(t));
  const datos: Record<string, string> = {};
  for (const [k, id] of [["Versión", "TRIM"], ["Motor", "ENGINE"], ["Tracción", "TRACTION_CONTROL"], ["Combustible", "FUEL_TYPE"], ["Puertas", "DOORS"]] as const) {
    const v = attr(r, id);
    if (v) datos[k] = v;
  }
  return {
    aviso: {
      id: r.id,
      url: r.permalink,
      titulo: [r.title, trim && !r.title.toLowerCase().includes(trim.toLowerCase()) ? trim : null].filter(Boolean).join(" "),
      anio: entero(attr(r, "VEHICLE_YEAR")),
      km: entero(attr(r, "KILOMETERS")),
      precio: r.currency_id === "CLF" || !r.price ? undefined : Math.round(r.price),
      caja: attr(r, "TRANSMISSION"),
      combustible: attr(r, "FUEL_TYPE"),
      region: r.address?.state_name ?? r.location?.state?.name,
      vendedor: r.seller?.nickname,
      tipoVendedor: esDealer ? "Automotora" : "Particular",
      destacado: false,
      foto: r.thumbnail?.replace(/^http:/, "https:"),
    },
    detalle: { datos },
  };
}
