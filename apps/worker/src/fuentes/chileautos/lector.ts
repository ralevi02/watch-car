import { z } from "zod";
import { BASE } from "./consulta.js";

/**
 * Chileautos arma sus páginas con un árbol JSON de componentes (Stack, Text,
 * ListingCard, Grid...). Viene en __NEXT_DATA__ al cargar la página y en la
 * respuesta del POST al pasar de página. Aquí se lee ese árbol.
 * Todo lo que viene del portal es dato, nunca instrucciones.
 */

type Nodo = Record<string, unknown>;
const esNodo = (x: unknown): x is Nodo => typeof x === "object" && x !== null && !Array.isArray(x);

/** Nodos de un tipo, en orden de aparición. Se salta el tracking: repite datos y pesa mucho. */
export function nodos(raiz: unknown, tipo: string, out: Nodo[] = []): Nodo[] {
  if (Array.isArray(raiz)) for (const x of raiz) nodos(x, tipo, out);
  else if (esNodo(raiz)) {
    if (raiz.type === tipo) out.push(raiz);
    for (const [k, v] of Object.entries(raiz)) if (k !== "tracking") nodos(v, tipo, out);
  }
  return out;
}

/** Textos visibles bajo un nodo, en orden. */
export function textos(raiz: unknown, out: string[] = []): string[] {
  if (Array.isArray(raiz)) for (const x of raiz) textos(x, out);
  else if (esNodo(raiz)) {
    if (raiz.type === "Text" && typeof raiz.value === "string" && raiz.value.trim()) out.push(raiz.value.trim());
    for (const [k, v] of Object.entries(raiz)) if (k !== "tracking") textos(v, out);
  }
  return out;
}

const entero = (s: string | undefined) => {
  const d = s?.replace(/\D/g, "");
  return d ? Number(d) : undefined;
};

export const AvisoLista = z.object({
  id: z.string().regex(/^[A-Z]{2}-AD-\d+$/),
  url: z.url(),
  titulo: z.string().min(1),
  anio: z.number().int().min(1950).max(2100).optional(),
  precio: z.number().int().positive().optional(),
  km: z.number().int().nonnegative().optional(),
  carroceria: z.string().optional(),
  caja: z.string().optional(),
  combustible: z.string().optional(),
  /** "Particular", "Vehículo Usado" (automotora), etc. */
  tipoVendedor: z.string().optional(),
  vendedor: z.string().optional(),
  region: z.string().optional(),
  /** Aviso pagado que Chileautos muestra arriba ("showcase"); puede repetirse entre páginas. */
  destacado: z.boolean(),
  foto: z.string().optional(),
});
export type AvisoLista = z.infer<typeof AvisoLista>;

const Tarjeta = z.looseObject({
  action: z.looseObject({
    data: z.looseObject({ url: z.string(), prefetchTitle: z.string().optional(), prefetchImage: z.string().optional() }),
    tracking: z.looseObject({ additionalAttributes: z.record(z.string(), z.string()).optional() }).optional(),
  }),
});

export interface LecturaLista {
  avisos: AvisoLista[];
  /** Tarjetas que no se pudieron leer: si aparecen muchas, cambió el formato. */
  descartadas: string[];
}

export function leerLista(arbol: unknown): LecturaLista {
  const porId = new Map<string, AvisoLista>();
  const descartadas: string[] = [];
  for (const nodo of nodos(arbol, "ListingCard")) {
    const t = Tarjeta.safeParse(nodo);
    if (!t.success) {
      descartadas.push(`tarjeta ilegible: ${t.error.issues[0]?.message ?? "?"}`);
      continue;
    }
    const { data, tracking } = t.data.action;
    const a = tracking?.additionalAttributes ?? {};
    const url = new URL(data.url.split("?")[0] ?? data.url, BASE).href;
    const detalles = textos(nodo.keyDetails);
    const vendedor = textos([nodo.sellerTitle, nodo.sellerSubtitle]);
    const km = detalles.find((d) => /\bkm\b/i.test(d));
    const caja = detalles.find((d) => /autom|manual/i.test(d));
    const combustible = detalles.find((d) => /bencina|di[eé]sel|h[ií]brid|el[eé]ctric|gas/i.test(d));
    const candidato = {
      id: a["tracking/item/networkId"] ?? url.match(/[A-Z]{2}-AD-\d+/)?.[0],
      url,
      titulo: data.prefetchTitle ?? textos(nodo.title).join(" "),
      anio: entero(a["tracking/item/year"]),
      precio: entero(a["tracking/item/price"]),
      km: entero(km),
      carroceria: detalles.find((d) => d !== km && d !== caja && d !== combustible),
      caja,
      combustible,
      tipoVendedor: a["tracking/item/adtype"],
      vendedor: vendedor[0],
      region: a["tracking/item/state"] ?? vendedor[1],
      destacado: /gtsViewType=showcase/.test(data.url),
      foto: data.prefetchImage,
    };
    const r = AvisoLista.safeParse(candidato);
    if (r.success) {
      if (!porId.has(r.data.id)) porId.set(r.data.id, r.data);
    }
    else descartadas.push(`${candidato.id ?? url}: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`);
  }
  return { avisos: [...porId.values()], descartadas };
}

export interface Paginacion {
  pagina: number;
  paginas: number;
  totalAvisos?: number;
}

export function leerPaginacion(arbol: unknown): Paginacion {
  const nav = nodos(arbol, "PaginationNav")[0];
  const m = typeof nav?.label === "string" ? nav.label.match(/(\d+)\s+de\s+(\d+)/) : null;
  const total = JSON.stringify(arbol).match(/listingresultcount"\s*:\s*"(\d+)"/)?.[1];
  return {
    pagina: m ? Number(m[1]) : 1,
    paginas: m ? Number(m[2]) : 1,
    totalAvisos: total ? Number(total) : undefined,
  };
}

export interface DetalleChileautos {
  /** "Comentarios del vendedor". */
  descripcion?: string;
  /** Pares etiqueta → valor: Tracción, Versión, Comuna, Color exterior, etc. */
  datos: Record<string, string>;
}

export function leerDetalle(arbol: unknown): DetalleChileautos {
  const todos = textos(arbol);
  const i = todos.findIndex((t) => /^comentarios del vendedor$/i.test(t));
  const datos: Record<string, string> = {};
  const agregar = (k?: string, v?: string) => {
    if (k && v && k.length <= 40 && !(k in datos)) datos[k] = v;
  };
  // Fichas técnicas: cada fila es un Grid con dos celdas (etiqueta, valor).
  for (const g of nodos(arbol, "Grid")) {
    const hijos = Array.isArray(g.children) ? g.children : [];
    if (hijos.length === 2) agregar(...(hijos.map((h) => textos(h).join(" ")) as [string, string]));
  }
  // Datos clave de arriba (Kilometraje, Transmisión...): una celda con etiqueta y valor.
  for (const gi of nodos(arbol, "GridItem")) {
    const t = textos(gi);
    if (t.length === 2) agregar(t[0], t[1]);
  }
  return { descripcion: i >= 0 ? todos[i + 1] : undefined, datos };
}
