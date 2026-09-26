import type { Page } from "patchright";
import type { Seguimiento } from "@radar/core";
import { capturar, detectarBloqueo, pausa, type Sesion } from "../../lib/navegador.js";
import { urlBusqueda } from "./consulta.js";
import type { OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { leerDetalle, leerLista, leerPaginacion, type AvisoLista } from "./lector.js";

/** Dominios que la página necesita para cargar y pasar el anti-bot. El resto (publicidad, analítica) se corta. */
export const DOMINIOS_CHILEAUTOS = ["chileautos.cl", "csnstatic.com", "datadome.co", "captcha-delivery.com", "awswaf.com"];

export type ResultadoChileautos = ResultadoRecoleccion;

async function leerNextData(page: Page): Promise<unknown> {
  const txt = await page.evaluate(() => document.getElementById("__NEXT_DATA__")?.textContent ?? null);
  if (!txt) throw new Error("La página no trae __NEXT_DATA__");
  const j = JSON.parse(txt) as { props?: { pageProps?: { initialRoot?: { wide?: unknown } } } };
  const raiz = j.props?.pageProps?.initialRoot;
  // "wide" y "compact" son la misma página para escritorio y celular: basta una.
  return raiz?.wide ?? raiz ?? j;
}

async function revisarBloqueo(page: Page, status?: number) {
  const titulo = await page.title().catch(() => "");
  const texto = await page.evaluate(() => document.body?.innerText.slice(0, 4000) ?? "").catch(() => "");
  return detectarBloqueo(status, titulo, texto);
}

const mensaje = (e: unknown) => (e instanceof Error ? e.message.split("\n")[0] ?? e.message : String(e));

/**
 * Una pasada por una ficha: abre la búsqueda filtrada, recorre las páginas con
 * el botón "Siguiente" (como una persona; cada página nueva llega como JSON) y
 * abre algunos detalles. Ritmo humano entre cada paso.
 */
export async function recolectarChileautos(s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion = {}): Promise<ResultadoChileautos> {
  const maxPaginas = op.maxPaginas ?? 3;
  const url = urlBusqueda(ficha);
  const m = s.medir();
  const t0 = Date.now();
  const r: ResultadoChileautos = {
    url,
    paginasLeidas: 0,
    paginasTotales: 0,
    avisos: [],
    detalles: {},
    descartadas: [],
    bloqueo: null,
    errores: [],
    capturas: [],
    kb: 0,
    ms: 0,
  };
  const vistos = new Map<string, AvisoLista>();
  const agregar = (arbol: unknown) => {
    const lista = leerLista(arbol);
    for (const a of lista.avisos) if (!vistos.has(a.id)) vistos.set(a.id, a);
    r.descartadas.push(...lista.descartadas);
    const pag = leerPaginacion(arbol);
    r.paginasLeidas++;
    r.paginasTotales = pag.paginas;
    r.totalAvisos ??= pag.totalAvisos;
    return pag;
  };

  const page = await s.context.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await pausa(2500, 4500);
    let status = resp?.status();
    // Con un 403 el anti-bot hace una verificación automática en el navegador y
    // recarga la página. Se le da tiempo; si termina en captcha, queda como bloqueo.
    if (status === 403) {
      const listo = await page
        .waitForFunction(() => document.getElementById("__NEXT_DATA__") !== null, undefined, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (listo) status = 200;
      else r.errores.push("Llegó un 403 del anti-bot y la verificación automática no terminó en 20 s");
    }
    r.bloqueo = await revisarBloqueo(page, status);
    if (r.bloqueo) {
      const c = await capturar(page, "chileautos-bloqueo");
      if (c) r.capturas.push(c);
      return r;
    }

    let pag = agregar(await leerNextData(page));
    while (pag.pagina < pag.paginas && r.paginasLeidas < maxPaginas) {
      await pausa(3500, 7500);
      const siguiente = page.getByRole("button", { name: "Siguiente" }).first();
      await siguiente.scrollIntoViewIfNeeded();
      await pausa(600, 1400);
      const [respPagina] = await Promise.all([
        page.waitForResponse((x) => x.url().includes("search-pagination-changed") && x.request().method() === "POST", {
          timeout: 30_000,
        }),
        siguiente.click(),
      ]);
      if (!respPagina.ok()) throw new Error(`La página ${pag.pagina + 1} respondió HTTP ${respPagina.status()}`);
      pag = agregar(await respPagina.json());
    }
  } catch (e) {
    r.errores.push(`Búsqueda: ${mensaje(e)}`);
    const c = await capturar(page, "chileautos-error-busqueda");
    if (c) r.capturas.push(c);
  } finally {
    await page.close();
  }

  r.avisos = [...vistos.values()];

  for (const a of op.elegirDetalles?.(r.avisos) ?? []) {
    await pausa(4000, 8000);
    const p = await s.context.newPage();
    try {
      const resp = await p.goto(a.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await pausa(2000, 4000);
      const bloqueo = await revisarBloqueo(p, resp?.status());
      if (bloqueo) {
        r.bloqueo = bloqueo;
        r.errores.push(`Detalle ${a.id}: ${bloqueo}`);
        break;
      }
      r.detalles[a.id] = leerDetalle(await leerNextData(p));
    } catch (e) {
      r.errores.push(`Detalle ${a.id}: ${mensaje(e)}`);
    } finally {
      await p.close();
    }
  }

  r.kb = m.kb();
  r.ms = Date.now() - t0;
  return r;
}
