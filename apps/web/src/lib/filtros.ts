import type { Filtro, ResultadoAuto } from "@/lib/datos";

/** Las cuatro vistas del control segmentado; Guardados y Descartados van en el menú. */
export const SEGMENTOS: { id: Filtro; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "nuevos", etiqueta: "Nuevos" },
  { id: "bajo", etiqueta: "Bajaron" },
  { id: "advertencia", etiqueta: "Revisar" },
];
export const FILTROS: Filtro[] = ["todos", "nuevos", "bajo", "advertencia", "favoritos", "descartados"];

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

export function filtrar(todos: ResultadoAuto[], filtro: Filtro, busqueda?: string, texto = "") {
  const deLaBusqueda = todos.flatMap((r) => paraBusqueda(r, busqueda) ?? []).filter((r) => coincide(r, texto));
  const visibles = deLaBusqueda
    .filter((r) => pasa(r, filtro))
    .sort(
      (x, y) =>
        Number(y.marca?.estado === "favorito") - Number(x.marca?.estado === "favorito") ||
        Number(y.veredicto === "calza") - Number(x.veredicto === "calza") ||
        (x.precio ?? Infinity) - (y.precio ?? Infinity),
    );
  const cuentas = Object.fromEntries(FILTROS.map((f) => [f, deLaBusqueda.filter((r) => pasa(r, f)).length])) as Record<Filtro, number>;
  return { visibles, cuentas };
}
