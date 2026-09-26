import type { Page } from "patchright";
import { capturar, detectarBloqueo, pausa, scrollHumano, type Sesion } from "../lib/navegador.js";
import type { AvisoPortal, DetallePortal, ResultadoRecoleccion } from "./tipos.js";

/**
 * Recolector para portales de lista simple (Kavak, Yapo): abre cada página de
 * resultados con ritmo humano, lee las tarjetas y, si el portal ya trae la
 * descripción en la lista, la guarda como detalle sin abrir el aviso.
 */
export async function recolectarLista(
  s: Sesion,
  op: {
    url: (pagina: number) => string;
    leer: (page: Page) => Promise<(AvisoPortal & { descripcion?: string })[]>;
    maxPaginas: number;
    /** Tarjetas por página: si llegan menos, no hay más páginas. */
    porPagina?: number;
    nombre: string;
  },
): Promise<ResultadoRecoleccion> {
  const m = s.medir();
  const t0 = Date.now();
  const r: ResultadoRecoleccion = { url: op.url(1), paginasLeidas: 0, paginasTotales: 0, avisos: [], detalles: {}, descartadas: [], bloqueo: null, errores: [], capturas: [], kb: 0, ms: 0 };
  const vistos = new Map<string, AvisoPortal>();
  const detalles: Record<string, DetallePortal> = {};
  const page = await s.context.newPage();
  try {
    for (let n = 1; n <= op.maxPaginas; n++) {
      if (n > 1) await pausa(4000, 8000);
      const resp = await page.goto(op.url(n), { waitUntil: "domcontentloaded", timeout: 45_000 });
      await pausa(2500, 4500);
      const titulo = await page.title().catch(() => "");
      const texto = await page.evaluate(() => document.body?.innerText.slice(0, 4000) ?? "").catch(() => "");
      r.bloqueo = detectarBloqueo(resp?.status(), titulo, texto);
      if (r.bloqueo) break;
      if (resp?.status() === 404) break;
      await scrollHumano(page, 3);
      const avisos = await op.leer(page);
      r.paginasLeidas++;
      for (const { descripcion, ...a } of avisos) {
        if (vistos.has(a.id)) continue;
        vistos.set(a.id, a);
        if (descripcion) detalles[a.id] = { descripcion, datos: {} };
      }
      if (avisos.length < (op.porPagina ?? Infinity)) break;
    }
    r.paginasTotales = r.paginasLeidas;
  } catch (e) {
    r.errores.push(`${op.nombre}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    const c = await capturar(page, `${op.nombre.toLowerCase()}-error`);
    if (c) r.capturas.push(c);
  } finally {
    await page.close();
  }
  r.avisos = [...vistos.values()];
  r.detalles = detalles;
  r.kb = m.kb();
  r.ms = Date.now() - t0;
  return r;
}
