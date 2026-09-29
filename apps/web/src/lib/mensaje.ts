import type { Llamada, ResultadoAuto } from "@/lib/datos";

/** Preguntas en orden de importancia; cada una se salta si el aviso o la llamada ya lo responden. */
const PREGUNTAS: { id: string; texto: (r: ResultadoAuto) => string; yaSe: (r: ResultadoAuto, texto: string, datos: Record<string, string>) => boolean }[] = [
  { id: "km", texto: () => "¿Cuántos km tiene?", yaSe: (r, _t, d) => r.km !== null || Boolean(d.km) },
  {
    id: "cc",
    texto: (r) => `¿Es la versión Cross Country o el ${r.modelo?.replace(/\s*cross country/i, "")} normal?`,
    yaSe: (r, t) => !r.porConfirmar.includes("modelo") || /cross\s*country/i.test(t),
  },
  { id: "caja", texto: () => "¿Es automático?", yaSe: (r, t) => r.caja !== null || /autom[aá]tic|mec[aá]nic|manual/i.test(t) },
  { id: "duenos", texto: () => "¿Cuántos dueños ha tenido?", yaSe: (_r, t, d) => Boolean(d.duenos) || /due[nñ]o/i.test(t) },
  {
    id: "mantenciones",
    texto: () => "¿Las mantenciones son en la marca? ¿Tienes los registros?",
    yaSe: (_r, t, d) => Boolean(d.mantenciones) || /mantenci[oó]n[^.]{0,40}(concesionari|marca|al d[ií]a|volvo|registr)/i.test(t),
  },
  { id: "correa", texto: () => "¿Cuándo se cambió la correa de distribución?", yaSe: (_r, t, d) => Boolean(d.correa) || /correa|distribuci[oó]n/i.test(t) },
  { id: "choques", texto: () => "¿Ha tenido choques o reparaciones de carrocería?", yaSe: (_r, t, d) => Boolean(d.choques) || /choque|chocad|siniestr/i.test(t) },
  { id: "papeles", texto: () => "¿Tiene los papeles al día y sin prenda?", yaSe: (_r, t, d) => Boolean(d.papeles) || /prenda|papeles al d[ií]a/i.test(t) },
  { id: "precio", texto: () => "¿El precio es conversable?", yaSe: (_r, t, d) => Boolean(d.precio) || /conversable|negociable|no se aceptan ofertas|precio fijo/i.test(t) },
];

/** "¿Cuántos km tiene?" → "¿cuántos km tiene?" */
const minuscula = (p: string) => (p.startsWith("¿") ? `¿${p.charAt(1).toLowerCase()}${p.slice(2)}` : p);

/**
 * Mensaje corto para el vendedor, como lo escribiría una persona: pregunta si
 * sigue disponible y hasta cuatro cosas que el aviso no dice.
 */
export function mensajeVendedor(r: ResultadoAuto, descripcion: string | null, llamadas: Llamada[] = []): string {
  const texto = [r.titulo, descripcion].filter(Boolean).join(" ");
  const datos = Object.assign({}, ...llamadas.map((l) => l.datos)) as Record<string, string>;
  const preguntas = PREGUNTAS.filter((p) => !p.yaSe(r, texto, datos))
    .slice(0, 4)
    .map((p) => p.texto(r));
  const auto = [r.modelo ?? "auto", r.anio].filter(Boolean).join(" ");
  const saludo = `Hola, ¿sigue disponible el ${auto}?`;
  if (!preguntas.length) return `${saludo} Me interesa, ¿cuándo se podría ver?`;
  return [saludo, preguntas.length === 1 ? `Quería preguntarte ${minuscula(preguntas[0]!)}` : "Quería preguntarte:", ...(preguntas.length > 1 ? preguntas : []), "Gracias."].join("\n");
}

/** Un celular chileno escrito en la descripción, en formato para WhatsApp (569XXXXXXXX). */
export function telefonoDe(descripcion: string | null): string | null {
  const m = descripcion?.match(/(?:\+?56\s?)?(9)[\s.-]?(\d{4})[\s.-]?(\d{4})\b/);
  return m ? `56${m[1]}${m[2]}${m[3]}` : null;
}
