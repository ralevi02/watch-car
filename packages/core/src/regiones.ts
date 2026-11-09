/**
 * Región de Chile a partir de cómo la escribe cada portal ("Santiago, RM",
 * "Metropolitana de Santiago", "RM (Metropolitana)", "Viña del Mar, VS",
 * "Bío Bío") o la ficha ("Metropolitana", "Valparaíso").
 */
const REGIONES: [codigo: string, nombre: string, patron: RegExp][] = [
  ["AP", "Arica y Parinacota", /arica/i],
  ["TA", "Tarapacá", /tarapac|iquique/i],
  ["AN", "Antofagasta", /antofagasta|calama/i],
  ["AT", "Atacama", /atacama|copiap/i],
  ["CO", "Coquimbo", /coquimbo|la serena/i],
  ["VS", "Valparaíso", /valpara[ií]so|vi[ñn]a del mar/i],
  ["RM", "Metropolitana", /metropolitana|santiago/i],
  ["LI", "O'Higgins", /o'?\s?higgins|libertador|rancagua/i],
  ["ML", "Maule", /maule|talca/i],
  ["NB", "Ñuble", /[ñn]uble|chill[aá]n/i],
  ["BI", "Biobío", /b[ií]o\s?-?\s?b[ií]o|concepci[oó]n/i],
  ["AR", "Araucanía", /araucan|temuco/i],
  ["LR", "Los Ríos", /los r[ií]os|valdivia/i],
  ["LL", "Los Lagos", /los lagos|puerto montt|osorno/i],
  ["AI", "Aysén", /ays[eé]n|coyhaique/i],
  ["MA", "Magallanes", /magallanes|punta arenas/i],
];
const CODIGOS = new Set(REGIONES.map(([c]) => c));

export function regionDe(texto: string | null | undefined): string | undefined {
  if (!texto) return undefined;
  const codigo = texto.match(/(?:,|\()\s*([A-Z]{2})\s*\)?\s*$/)?.[1] ?? texto.trim().match(/^([A-Z]{2})\b/)?.[1];
  if (codigo && CODIGOS.has(codigo)) return codigo;
  return REGIONES.find(([, , p]) => p.test(texto))?.[0];
}

export const nombreRegion = (codigo: string) => REGIONES.find(([c]) => c === codigo)?.[1] ?? codigo;

/** ¿El aviso está en alguna de las regiones de la ficha? Sin regiones en la ficha, o sin saber dónde está el aviso, sí. */
export function enZona(regionAviso: string | null | undefined, regionesFicha: string[]): boolean {
  if (!regionesFicha.length) return true;
  const r = regionDe(regionAviso);
  return !r || regionesFicha.some((x) => regionDe(x) === r);
}
