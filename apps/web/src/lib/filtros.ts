import type { Filtro, ResultadoAuto } from "@/lib/datos";

export const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "nuevos", etiqueta: "Nuevos" },
  { id: "bajo", etiqueta: "Bajó de precio" },
  { id: "advertencia", etiqueta: "Con advertencia" },
  { id: "favoritos", etiqueta: "Favoritos" },
  { id: "descartados", etiqueta: "Descartados" },
];

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

export function filtrar(todos: ResultadoAuto[], filtro: Filtro, busqueda?: string) {
  const deLaBusqueda = todos.flatMap((r) => paraBusqueda(r, busqueda) ?? []);
  const visibles = deLaBusqueda
    .filter((r) => pasa(r, filtro))
    .sort((x, y) => Number(y.marca?.estado === "favorito") - Number(x.marca?.estado === "favorito") || (x.precio ?? Infinity) - (y.precio ?? Infinity));
  const cuentas = Object.fromEntries(FILTROS.map((f) => [f.id, deLaBusqueda.filter((r) => pasa(r, f.id)).length])) as Record<Filtro, number>;
  return { visibles, cuentas };
}
