/**
 * Señales de que un aviso puede ser una estafa. Ninguna por sí sola lo
 * prueba; juntas (dos o más) merecen cuidado.
 */
const PATRONES: [string, RegExp][] = [
  ["Pide abono o reserva", /\b(abono|reserva(r|lo)?\s+(con|el)|adelanto|dep[oó]sit(o|ar)\s+(previo|antes)|transfer(ir|encia)\s+antes)\b/i],
  ["Vendedor lejos o envío", /\b(estoy (fuera|de viaje|en el (sur|norte|extranjero))|fuera de santiago|lo env[ií]o|te lo (mando|env[ií]o)|env[ií]o a (todo )?chile|despacho a regiones)\b/i],
  ["Solo por chat", /\b(solo (por )?(whats?app|wsp|mensaje|chat)|no (contesto|atiendo) llamadas)\b/i],
  ["Número extranjero", /\+(?!56)\d{1,3}[\s-]?\d{3}/],
  ["Urgencia", /\b(urgente|hoy mismo|por viaje|remato)\b/i],
];

export function senalesEnTexto(...textos: (string | null | undefined)[]): string[] {
  const t = textos.filter(Boolean).join(" \n ");
  return PATRONES.filter(([, re]) => re.test(t)).map(([nombre]) => nombre);
}

/** La cuenta de Facebook del vendedor se creó este año o el anterior. */
export const cuentaNueva = (desde: number | null | undefined, hoy = new Date()) => Boolean(desde && desde >= hoy.getFullYear() - 1);
