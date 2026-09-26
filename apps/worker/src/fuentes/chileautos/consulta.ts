import type { Seguimiento } from "@radar/core";

export const BASE = "https://www.chileautos.cl";

/** Valor dentro de una expresión: se escapan espacios y tildes; puntos y paréntesis son parte de la sintaxis. */
const valor = (s: string) => encodeURIComponent(s.trim());

function rango(campo: string, min?: number, max?: number) {
  if (min === undefined && max === undefined) return null;
  return `${campo}.range(${min ?? ""}..${max ?? ""}).`;
}

/**
 * URL de búsqueda con la sintaxis de Chileautos (heredada de carsales), ej.:
 * (And.(C.Marca.Volvo._.Modelo.V40.)_.Ano.range(2017..)._.Precio.range(..15400000).)
 *
 * Se filtra hasta el máximo "con advertencia" para que esos avisos también
 * lleguen; la evaluación contra la ficha los marca después.
 */
export function urlBusqueda(f: Seguimiento): string {
  const base = `(C.Marca.${valor(f.marca)}._.Modelo.${valor(f.modeloPortal || f.modelo)}.)`;
  const filtros = [
    rango("Ano", f.anio.min, f.anio.maxConAdvertencia ?? f.anio.max),
    rango("Precio", f.precio.min, f.precio.maxConAdvertencia ?? f.precio.max),
    rango("Kilometraje", f.km.min, f.km.maxConAdvertencia ?? f.km.max),
  ].filter(Boolean);
  const q = filtros.length ? `(And.${[base, ...filtros].join("_.")})` : base;
  return `${BASE}/vehiculos/?q=${q}`;
}
