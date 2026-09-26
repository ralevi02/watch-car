/**
 * Lectura rápida del título de un aviso, sin IA: motor, tracción y si dice
 * Cross Country. Sirve para ordenar y decidir qué detalles abrir; la
 * normalización con Gemini tiene la última palabra.
 */
export interface LecturaTitulo {
  motor?: string;
  traccion?: "AWD" | "FWD";
  crossCountry: boolean;
}

export function leerTitulo(titulo: string): LecturaTitulo {
  const t = titulo.toUpperCase();
  const motor = t.match(/\b([TDB][2-6])\b/)?.[1];
  const traccion = /\b(AWD|4X4|4WD)\b/.test(t) ? "AWD" : /\b(4X2|2WD|FWD)\b/.test(t) ? "FWD" : undefined;
  const crossCountry = /CROSS\s*COUNTRY|\bCC\b/.test(t);
  return { motor, traccion, crossCountry };
}
