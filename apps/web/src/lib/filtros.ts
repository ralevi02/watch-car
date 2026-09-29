import type { Filtro, ResultadoAuto } from "@/lib/datos";

/** Las cuatro vistas del control segmentado; Guardados y Descartados van en el menú. */
export const SEGMENTOS: { id: Filtro; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "nuevos", etiqueta: "Nuevos" },
  { id: "bajo", etiqueta: "Bajaron" },
  { id: "advertencia", etiqueta: "Revisar" },
];
export const FILTROS: Filtro[] = ["todos", "nuevos", "bajo", "advertencia", "favoritos", "descartados", "casi", "contacto"];

const bajo = (r: ResultadoAuto) => r.precio !== null && r.precioInicial !== null && r.precio < r.precioInicial;

/** El resultado visto desde una ficha (o desde todas). */
function paraBusqueda(r: ResultadoAuto, busqueda?: string): ResultadoAuto | null {
  if (!busqueda) return r;
  const v = r.porBusqueda[busqueda];
  return v ? { ...r, veredicto: v.veredicto, motivos: v.motivos } : null;
}

function pasa(r: ResultadoAuto, filtro: Filtro) {
  const descartado = r.marca?.estado === "descartado";
  switch (filtro) {
    case "descartados":
      return descartado;
    case "favoritos":
      return r.marca?.estado === "favorito";
    case "contacto":
      return !descartado && Boolean(r.marca?.contacto) && r.marca?.contacto !== "comprado";
    case "casi":
      return !descartado;
    case "nuevos":
      return !descartado && r.nuevo;
    case "bajo":
      return !descartado && bajo(r);
    case "advertencia":
      return !descartado && r.veredicto === "advertencia";
    default:
      return !descartado;
  }
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function coincide(r: ResultadoAuto, texto: string) {
  if (!texto.trim()) return true;
  const donde = normalizar([r.titulo, r.modelo, r.version, r.motor, r.comuna, r.region, r.vendedor, r.anio].filter(Boolean).join(" "));
  return normalizar(texto)
    .split(/\s+/)
    .every((t) => donde.includes(t));
}

/** `casi` son los que quedaron fuera por poco: solo se ven con el filtro "casi". */
export function filtrar(todos: ResultadoAuto[], filtro: Filtro, busqueda?: string, texto = "", casi: ResultadoAuto[] = []) {
  const base = filtro === "casi" ? casi : todos;
  const deLaBusqueda = base.flatMap((r) => paraBusqueda(r, busqueda) ?? []).filter((r) => coincide(r, texto));
  const visibles = deLaBusqueda
    .filter((r) => pasa(r, filtro))
    .sort(
      (x, y) =>
        Number(y.marca?.estado === "favorito") - Number(x.marca?.estado === "favorito") ||
        Number(y.veredicto === "calza") - Number(x.veredicto === "calza") ||
        (x.precio ?? Infinity) - (y.precio ?? Infinity),
    );
  const cuentas = Object.fromEntries(FILTROS.map((f) => [f, deLaBusqueda.filter((r) => pasa(r, f)).length])) as Record<Filtro, number>;
  cuentas.casi = casi.flatMap((r) => paraBusqueda(r, busqueda) ?? []).filter((r) => coincide(r, texto) && pasa(r, "casi")).length;
  return { visibles, cuentas };
}

// ── Filtros y orden elegidos en la hoja "Filtros y orden" ────────────────────

export type Orden = "recomendado" | "precio" | "-precio" | "km" | "-anio" | "recientes" | "cerca";

export interface Afinar {
  precioMin?: number;
  precioMax?: number;
  anioMin?: number;
  kmMax?: number;
  caja?: "automatica" | "manual";
  traccion?: "AWD";
  vendedor?: "particular" | "automotora";
  /** Portales a mostrar; vacío = todos. */
  fuentes?: string[];
  distanciaMax?: number;
  conFoto?: boolean;
  sinAlertas?: boolean;
}

export const ORDENES: { id: Orden; etiqueta: string }[] = [
  { id: "recomendado", etiqueta: "Recomendado" },
  { id: "precio", etiqueta: "Precio más bajo" },
  { id: "-precio", etiqueta: "Precio más alto" },
  { id: "km", etiqueta: "Menos km" },
  { id: "-anio", etiqueta: "Más nuevo" },
  { id: "recientes", etiqueta: "Publicados hace poco" },
  { id: "cerca", etiqueta: "Más cerca de tu casa" },
];

/** Deja los que pasan los filtros. `distancia` da los km desde la casa (o null si no se sabe). */
export function afinar(lista: ResultadoAuto[], f: Afinar, distancia: (r: ResultadoAuto) => number | null): ResultadoAuto[] {
  return lista.filter((r) => {
    if (f.precioMin && (r.precio === null || r.precio < f.precioMin)) return false;
    if (f.precioMax && (r.precio === null || r.precio > f.precioMax)) return false;
    if (f.anioMin && (r.anio === null || r.anio < f.anioMin)) return false;
    if (f.kmMax && (r.km === null || r.km > f.kmMax)) return false;
    if (f.caja && r.caja !== f.caja) return false;
    if (f.traccion && r.traccion !== "AWD") return false;
    if (f.vendedor && r.tipoVendedor !== f.vendedor) return false;
    if (f.fuentes?.length && !r.enlaces.some((e) => f.fuentes!.includes(e.fuente))) return false;
    if (f.distanciaMax) {
      const d = distancia(r);
      if (d === null || d > f.distanciaMax) return false;
    }
    if (f.conFoto && !r.foto) return false;
    if (f.sinAlertas && (r.alertas.length > 0 || r.remate)) return false;
    return true;
  });
}

/** Ordena según lo elegido; "recomendado" deja el orden de siempre (guardados, calzan, precio). */
export function ordenar(lista: ResultadoAuto[], orden: Orden, distancia: (r: ResultadoAuto) => number | null): ResultadoAuto[] {
  if (orden === "recomendado") return lista;
  const ultimo = (x: number | null, asc: boolean) => (x === null ? (asc ? Infinity : -Infinity) : x);
  const clave: Record<Exclude<Orden, "recomendado">, (r: ResultadoAuto) => number> = {
    precio: (r) => ultimo(r.precio, true),
    "-precio": (r) => -ultimo(r.precio, false),
    km: (r) => ultimo(r.km, true),
    "-anio": (r) => -ultimo(r.anio, false),
    recientes: (r) => -new Date(r.primeraVez).getTime(),
    cerca: (r) => ultimo(distancia(r), true),
  };
  const k = clave[orden];
  return [...lista].sort((a, b) => k(a) - k(b));
}

/** Cuántos filtros hay puestos (para el número en el botón). */
export const cuantosFiltros = (f: Afinar) =>
  [f.precioMin, f.precioMax, f.anioMin, f.kmMax, f.caja, f.traccion, f.vendedor, f.fuentes?.length ? 1 : undefined, f.distanciaMax, f.conFoto, f.sinAlertas].filter(Boolean).length;
