export interface AvisoMercado {
  autoId: string;
  precioInicial: number | null;
  primeraVez: string;
  ultimaVez: string;
  estado: string;
  /** Cambios de precio, del más antiguo al más nuevo. */
  precios: { precio: number; en: string }[];
}

export interface SemanaMercado {
  /** Lunes de la semana (ISO). */
  desde: string;
  mediana: number | null;
  aLaVenta: number;
  vendidos: number;
}

const SEMANA = 7 * 86_400_000;
const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : Math.round((o[m - 1]! + o[m]!) / 2);
};

function lunes(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/**
 * Semana a semana: el precio mediano de lo que estaba a la venta (con el precio que tenía
 * esa semana), cuántos había y cuántos dejaron de aparecer. Un auto en varios portales cuenta una vez.
 */
export function mercadoPorSemana(avisos: AvisoMercado[], semanas = 12, hoy = new Date()): { semanas: SemanaMercado[]; diasVenta: number | null; vendidosTotal: number } {
  const inicio = lunes(new Date(hoy.getTime() - (semanas - 1) * SEMANA));
  const vendido = (a: AvisoMercado) => a.estado === "posible_vendido" || a.estado === "vendido";
  // Lo que duró menos de 3 días casi nunca es una venta: suele ser una búsqueda que no volvió a pasar por ahí.
  const seVendio = (a: AvisoMercado) => vendido(a) && new Date(a.ultimaVez).getTime() - new Date(a.primeraVez).getTime() >= 3 * 86_400_000;
  const serie: SemanaMercado[] = [];
  for (let i = 0; i < semanas; i++) {
    const desde = inicio.getTime() + i * SEMANA;
    const hasta = desde + SEMANA;
    const porAuto = new Map<string, number>();
    let vendidos = 0;
    for (const a of avisos) {
      const aparece = new Date(a.primeraVez).getTime();
      const ultima = new Date(a.ultimaVez).getTime();
      if (aparece >= hasta || (vendido(a) && ultima < desde)) continue;
      if (seVendio(a) && ultima < hasta) vendidos++;
      const precio = a.precios.filter((p) => new Date(p.en).getTime() < hasta).at(-1)?.precio ?? a.precioInicial;
      if (precio && precio >= 1_000_000) porAuto.set(a.autoId, Math.min(porAuto.get(a.autoId) ?? Infinity, precio));
    }
    serie.push({ desde: new Date(desde).toISOString(), mediana: mediana([...porAuto.values()]), aLaVenta: porAuto.size, vendidos });
  }
  const dias = avisos.filter(seVendio).map((a) => (new Date(a.ultimaVez).getTime() - new Date(a.primeraVez).getTime()) / 86_400_000);
  const primera = serie.findIndex((s) => s.aLaVenta > 0);
  return { semanas: primera < 0 ? [] : serie.slice(primera), diasVenta: dias.length >= 3 ? Math.round(mediana(dias)!) : null, vendidosTotal: dias.length };
}
