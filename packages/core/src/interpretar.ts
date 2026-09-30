/**
 * Entiende una búsqueda dicha o escrita en lenguaje natural ("V40 automático
 * bajo 12 millones del 2018 en adelante, cerca") y la pasa a filtros. Lo que
 * no reconoce queda como texto para buscar (modelo, versión, comuna).
 */
export interface BusquedaInterpretada {
  precioMin?: number;
  precioMax?: number;
  anioMin?: number;
  kmMax?: number;
  caja?: "automatica" | "manual";
  traccion?: "AWD";
  vendedor?: "particular" | "automotora";
  orden?: "precio" | "-precio" | "km" | "-anio" | "recientes" | "cerca";
  texto: string;
}

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

export function interpretarBusqueda(frase: string): BusquedaInterpretada {
  let t = ` ${frase.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")} `;
  const r: BusquedaInterpretada = { texto: "" };
  const quitar = (re: RegExp, f: (m: RegExpMatchArray) => void) => {
    const m = t.match(re);
    if (m) {
      f(m);
      t = t.replace(re, " ");
    }
  };
  const millones = "(\\d+(?:[.,]\\d+)?)\\s*(?:millones|millon|mill|palos|m)\\b";

  // Precio: "bajo/hasta/menos de 12 millones", "desde/más de 8 millones", "entre 8 y 12 millones".
  quitar(new RegExp(`\\bentre\\s+(\\d+(?:[.,]\\d+)?)\\s*(?:y|a)\\s*${millones}`), (m) => {
    r.precioMin = Math.round(num(m[1]!) * 1_000_000);
    r.precioMax = Math.round(num(m[2]!) * 1_000_000);
  });
  quitar(new RegExp(`\\b(?:bajo|hasta|menos de|maximo|max|por menos de|no mas de)\\s*(?:los\\s*)?\\$?\\s*${millones}`), (m) => (r.precioMax = Math.round(num(m[1]!) * 1_000_000)));
  quitar(new RegExp(`\\b(?:desde|sobre|mas de|minimo)\\s*\\$?\\s*${millones}`), (m) => (r.precioMin = Math.round(num(m[1]!) * 1_000_000)));

  // Km: "menos de 100 mil km", "hasta 80.000 kilómetros".
  quitar(/\b(?:bajo|hasta|menos de|maximo|max)?\s*(\d+(?:[.,]\d+)?)\s*(mil)?\s*(?:km|kms|kilometros)\b/, (m) => (r.kmMax = Math.round(num(m[1]!) * (m[2] ? 1000 : num(m[1]!) < 1000 ? 1000 : 1))));

  // Año: "2018 o más", "del 2018 en adelante", "desde 2018", o un año solo.
  quitar(/\b(?:desde|del|de|año)?\s*(19[89]\d|20[0-4]\d)\s*(?:o mas|o superior|en adelante|para arriba|\+)?/, (m) => (r.anioMin = Number(m[1])));

  quitar(/\b(automatic[oa]s?|automat|aut)\b/, () => (r.caja = "automatica"));
  quitar(/\b(mecanic[oa]s?|manual(es)?)\b/, () => (r.caja = "manual"));
  quitar(/\b(4x4|awd|4wd|traccion (integral|total))\b/, () => (r.traccion = "AWD"));
  quitar(/\b(de )?particular(es)?\b/, () => (r.vendedor = "particular"));
  quitar(/\b(de )?automotoras?\b/, () => (r.vendedor = "automotora"));

  quitar(/\b((mas )?barat[oa]s?( primero)?|por precio)\b/, () => (r.orden = "precio"));
  quitar(/\b(mas car[oa]s?)\b/, () => (r.orden = "-precio"));
  quitar(/\b(mas nuev[oa]s?)\b/, () => (r.orden = "-anio"));
  quitar(/\b(menos km|menos kilometraje|menos kilometros)\b/, () => (r.orden = "km"));
  quitar(/\b(recientes|mas recientes|nuevos avisos|recien publicad[oa]s?)\b/, () => (r.orden = "recientes"));
  quitar(/\b(cerca( de mi casa| mio| de aqui)?|mas cercan[oa]s?)\b/, () => (r.orden = "cerca"));

  // Lo que queda, sin palabras de relleno, se busca como texto (modelo, versión, comuna).
  const relleno = new Set(["un", "una", "el", "la", "los", "las", "de", "del", "en", "y", "o", "con", "que", "busco", "quiero", "muestrame", "ver", "autos", "auto", "carro", "volvo", "por", "a", "al", "para", "sea", "este", "primero", "primeros"]);
  r.texto = t
    .replace(/[,.;:!?¿¡]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !relleno.has(p))
    .join(" ");
  return r;
}
