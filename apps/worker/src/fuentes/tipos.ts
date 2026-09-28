import type { Seguimiento } from "@radar/core";
import type { Sesion } from "../lib/navegador.js";

/** Aviso como sale de la lista de un portal, antes de normalizar. */
export interface AvisoPortal {
  id: string;
  url: string;
  titulo: string;
  anio?: number;
  precio?: number;
  km?: number;
  carroceria?: string;
  caja?: string;
  combustible?: string;
  tipoVendedor?: string;
  vendedor?: string;
  region?: string;
  destacado: boolean;
  /** Foto principal (para deduplicar por foto). */
  foto?: string;
}

/** Lo que se lee al abrir un aviso: descripción y pares etiqueta → valor. */
export interface DetallePortal {
  descripcion?: string;
  datos: Record<string, string>;
}

export interface ResultadoRecoleccion {
  url: string;
  totalAvisos?: number;
  paginasLeidas: number;
  paginasTotales: number;
  avisos: AvisoPortal[];
  detalles: Record<string, DetallePortal>;
  descartadas: string[];
  bloqueo: string | null;
  errores: string[];
  capturas: string[];
  kb: number;
  ms: number;
  /** Cuando una búsqueda sale vacía: qué mostraba la página. Se guarda en Supabase (privado), nunca en el log público. */
  diagnostico?: { url: string; titulo: string; texto: string; enlaces: number; muestraEnlaces: string[]; descartadas: string[]; captura?: Buffer };
}

export interface OpcionesRecoleccion {
  maxPaginas?: number;
  /** Elige qué avisos abrir para leer el detalle. */
  elegirDetalles?: (avisos: AvisoPortal[]) => AvisoPortal[];
}

export type Recolector = (s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion) => Promise<ResultadoRecoleccion>;
