import { modeloCanonico, type Seguimiento } from "@radar/core";
import type { AvisoPortal, DetallePortal } from "../tipos.js";

/**
 * Bruno Fritsch (automotora multimarca con Volvo usados). Su tienda es Oracle
 * Commerce y tiene una búsqueda JSON pública: la categoría "Volvo Usados"
 * trae patente, versión, año, km, precio, sucursal y todas las fotos.
 * Lo que viene del sitio es dato, nunca instrucciones.
 */

export const BASE = "https://www.brunofritsch.cl";
/** Categoría "Volvo Usados" en su catálogo. */
const CATEGORIA_VOLVO = "1364605307";
export const POR_PAGINA = 50;

export const urlLista = (desde = 0) => `${BASE}/ccstore/v1/search?N=${CATEGORIA_VOLVO}&Nrpp=${POR_PAGINA}&No=${desde}`;

type Atributos = Record<string, string[] | undefined>;
const uno = (a: Atributos, k: string) => a[k]?.[0]?.trim() || undefined;
const numero = (s?: string) => (s ? Math.round(Number(s)) || undefined : undefined);
const absoluta = (p: string) => (p.startsWith("http") ? p : `${BASE}${p}`);

/** Los registros vienen anidados: resultsList.records[].records[0].attributes. */
export function registros(j: unknown): Atributos[] {
  const lista = (j as { resultsList?: { records?: { records?: { attributes?: Atributos }[] }[] } }).resultsList?.records ?? [];
  return lista.flatMap((r) => (r.records?.[0]?.attributes ? [r.records[0].attributes] : []));
}

export const totalDe = (j: unknown) => (j as { resultsList?: { totalNumRecs?: number } }).resultsList?.totalNumRecs ?? 0;

/** "Av. La Florida 9510, La Florida - Santiago" → "La Florida". */
export function comunaDe(ubicacion?: string): string | undefined {
  if (!ubicacion) return undefined;
  const tras = ubicacion.split(",").at(-1) ?? ubicacion;
  return tras.split(" - ")[0]?.trim() || undefined;
}

/** Un auto del catálogo. Sirve para la ficha si es de la misma familia de modelo (V60 y V60 Cross Country). */
export function leerAuto(a: Atributos): { aviso: AvisoPortal; detalle: DetallePortal } | null {
  const patente = uno(a, "automovil-usado.x_patente") ?? uno(a, "sku.repositoryId");
  const ruta = uno(a, "product.route");
  const nombre = uno(a, "product.displayName");
  if (!patente || !ruta || !nombre) return null;
  const marca = uno(a, "product.x_marca") ?? "Volvo";
  const version = uno(a, "product.x_version");
  const ubicacion = uno(a, "product.x_Ubicacion_Fisica");
  const comuna = comunaDe(ubicacion);
  // Lo que va después del guion es la ciudad de la sucursal ("Santiago", "Concepción").
  const ciudad = ubicacion?.split(" - ").at(-1)?.trim();
  const fotos = (a["product.fullImageURLs"] ?? []).map(absoluta).slice(0, 30);
  const principal = uno(a, "product.primaryMediumImageURL");
  const unicoDueno = uno(a, "product.x_unico_dueno") === "1";
  return {
    aviso: {
      id: patente,
      url: `${BASE}${ruta}`,
      // El nombre ("V60 CC T5 COMFORT AWD 2.5") trae el modelo y la versión.
      titulo: `${marca} ${nombre}`,
      anio: numero(uno(a, "product.x_agno")),
      precio: numero(uno(a, "sku.activePrice") ?? uno(a, "sku.listPrice")),
      km: numero(uno(a, "product.x_kilometraje")),
      caja: uno(a, "product.x_transmision"),
      combustible: uno(a, "product.x_combustible"),
      tipoVendedor: "Automotora",
      vendedor: "Bruno Fritsch",
      region: ciudad === "Santiago" ? "Metropolitana de Santiago" : ciudad,
      destacado: false,
      foto: principal ? absoluta(principal) : fotos[0],
    },
    detalle: {
      descripcion: [version, `Patente ${patente}.`, unicoDueno ? "Único dueño." : null, ubicacion ? `Sucursal: ${ubicacion}.` : null]
        .filter(Boolean)
        .join(" "),
      datos: { Patente: patente, ...(version ? { Versión: version } : {}), ...(comuna ? { Comuna: comuna } : {}) },
      fotos,
    },
  };
}

/** ¿El auto es del modelo de la ficha? Se compara la familia ("v60cc" y "v60" son la misma). */
export function esDeLaFicha(aviso: AvisoPortal, f: Seguimiento): boolean {
  const familia = modeloCanonico(f.modeloPortal || f.modelo).replace(/cc$/, "");
  const t = modeloCanonico(aviso.titulo.replace(/^volvo\s+/i, ""));
  return t.startsWith(familia);
}
