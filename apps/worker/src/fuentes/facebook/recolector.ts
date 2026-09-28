import type { Page } from "patchright";
import type { Seguimiento } from "@radar/core";
import { capturar, pausa, scrollHumano, type Sesion } from "../../lib/navegador.js";
import type { AvisoPortal, OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { consultas, detectarMuro, leerDetalle, leerTarjeta, tramosDePrecio, urlBusqueda, urlVehiculos } from "./lector.js";

/** Facebook muestra ~24 resultados por búsqueda; si llega cerca del tope, se barre por tramos de precio. */
const TOPE_RESULTADOS = 20;

export class MuroFacebook extends Error {
  constructor(public tipo: "login" | "checkpoint" | "bloqueo") {
    super(tipo === "login" ? "Facebook pidió iniciar sesión" : tipo === "checkpoint" ? "Facebook pidió verificar la cuenta" : "Facebook bloqueó la cuenta");
  }
}

async function revisarMuro(page: Page) {
  const texto = await page.evaluate(() => document.body?.innerText.slice(0, 4000) ?? "").catch(() => "");
  const formulario = await page.locator('input[name="pass"], form[action*="login"]').count().catch(() => 0);
  const muro = detectarMuro(page.url(), texto, formulario > 0);
  if (muro) throw new MuroFacebook(muro);
}

async function cerrarDialogos(page: Page) {
  const cerrar = page.locator('[aria-label="Cerrar"], [aria-label="Close"]').first();
  if (await cerrar.isVisible().catch(() => false)) await cerrar.click().catch(() => {});
}

/** Tarjetas de la grilla hasta el título "Resultados fuera de tu búsqueda". */
async function leerGrilla(page: Page) {
  const crudas = await page.evaluate(() => {
    const fin = [...document.querySelectorAll("span, h2, h3, div[role=heading]")].find((e) =>
      /fuera de tu búsqueda|outside your search|resultados relacionados/i.test(e.textContent ?? ""),
    );
    const vistos = new Set<string>();
    const out: { id: string; texto: string; foto?: string }[] = [];
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace/item/"]')) {
      if (fin && fin.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) continue;
      const id = a.href.match(/\/marketplace\/item\/(\d+)/)?.[1];
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      out.push({ id, texto: a.innerText, foto: a.querySelector("img")?.getAttribute("src") ?? undefined });
    }
    return out;
  });
  return crudas.map((c) => {
    const aviso = leerTarjeta(c.id, c.texto);
    return { c, aviso: aviso ? { ...aviso, foto: c.foto } : null };
  });
}

/** Qué muestra la página cuando no se leyó ningún aviso (para ajustar el lector). */
async function diagnosticar(page: Page, descartadas: string[]): Promise<NonNullable<ResultadoRecoleccion["diagnostico"]>> {
  const info = await page
    .evaluate(() => ({
      titulo: document.title,
      texto: (document.body?.innerText ?? "").slice(0, 4000),
      enlaces: document.querySelectorAll('a[href*="/marketplace/item/"]').length,
      muestra: [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace"]')].slice(0, 12).map((a) => a.getAttribute("href") ?? ""),
    }))
    .catch(() => ({ titulo: "", texto: "", enlaces: 0, muestra: [] as string[] }));
  const captura = await page.screenshot({ fullPage: false }).catch(() => undefined);
  return { url: page.url(), titulo: info.titulo, texto: info.texto, enlaces: info.enlaces, muestraEnlaces: info.muestra, descartadas: descartadas.slice(0, 10), captura };
}

/**
 * Una pasada de Facebook para una ficha, con la sesión ya cargada en el
 * navegador. Ritmo humano: pausas, scroll y pocas páginas.
 */
export async function recolectarFacebook(s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion & { ciudad?: string } = {}): Promise<ResultadoRecoleccion> {
  const m = s.medir();
  const t0 = Date.now();
  const r: ResultadoRecoleccion = { url: "", paginasLeidas: 0, paginasTotales: 0, avisos: [], detalles: {}, descartadas: [], bloqueo: null, errores: [], capturas: [], kb: 0, ms: 0 };
  const vistos = new Map<string, AvisoPortal>();
  const page = await s.context.newPage();
  const maxBusquedas = op.maxPaginas ?? 5;
  // Respuestas internas de Facebook (GraphQL), para el diagnóstico si no aparece nada.
  const red: string[] = [];
  page.on("response", async (res) => {
    if (!res.url().includes("/api/graphql") || red.length >= 25) return;
    const nombre = res.request().headers()["x-fb-friendly-name"] ?? "?";
    const cuerpo = await res.text().catch(() => "");
    red.push(`${nombre} ${res.status()} ${Math.round(cuerpo.length / 1024)}KB${/"errors"\s*:/.test(cuerpo) ? " con errores" : ""}${/marketplace_search|listing/i.test(cuerpo) ? " con avisos" : ""}`);
  });

  try {
    const cola = consultas(ficha).map((q) => ({ q, tramo: undefined as { min?: number; max?: number } | undefined }));
    r.url = urlBusqueda(ficha, cola[0]?.q ?? ficha.modelo, op.ciudad);
    while (cola.length && r.paginasLeidas < maxBusquedas) {
      const { q, tramo } = cola.shift()!;
      if (r.paginasLeidas > 0) await pausa(5000, 11000);
      await page.goto(urlBusqueda(ficha, q, op.ciudad, tramo), { waitUntil: "domcontentloaded", timeout: 45_000 });
      await pausa(3000, 6000);
      await revisarMuro(page);
      await cerrarDialogos(page);
      // Los avisos llegan después de la página: se esperan hasta 15 s.
      await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15_000 }).catch(() => {});
      await scrollHumano(page, 4);
      let grilla = await leerGrilla(page);
      // La búsqueda general a veces sale vacía: se prueba dentro de Vehículos.
      let vehiculos: { url: string; enlaces: number } | undefined;
      if (grilla.length === 0) {
        const url = urlVehiculos(ficha, q, op.ciudad, tramo);
        await pausa(4000, 8000);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await pausa(3000, 6000);
        await revisarMuro(page);
        await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15_000 }).catch(() => {});
        await scrollHumano(page, 3);
        grilla = await leerGrilla(page);
        vehiculos = { url, enlaces: grilla.length };
      }
      r.paginasLeidas++;
      for (const { c, aviso } of grilla) {
        if (!aviso) r.descartadas.push(`${c.id}: ${c.texto.replace(/\s+/g, " ").slice(0, 80)}`);
        else if (!vistos.has(aviso.id)) vistos.set(aviso.id, aviso);
      }
      // Tope alcanzado sin tramo: se reparte la misma consulta en tramos de precio.
      if (!tramo && grilla.length >= TOPE_RESULTADOS) {
        for (const t of tramosDePrecio(ficha.precio.min, ficha.precio.maxConAdvertencia ?? ficha.precio.max)) cola.push({ q, tramo: t });
      }
      if (r.paginasLeidas === 1 && vistos.size === 0) {
        const c = await capturar(page, "facebook-sin-resultados");
        if (c) r.capturas.push(c);
        r.diagnostico = { ...(await diagnosticar(page, r.descartadas)), red: [...red], vehiculos };
      }
    }
    r.paginasTotales = r.paginasLeidas + cola.length;
  } catch (e) {
    if (e instanceof MuroFacebook) r.bloqueo = e.message;
    else r.errores.push(`Búsqueda: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    const c = await capturar(page, "facebook-error");
    if (c) r.capturas.push(c);
  } finally {
    await page.close();
  }

  r.avisos = [...vistos.values()];

  if (!r.bloqueo) {
    for (const a of op.elegirDetalles?.(r.avisos) ?? []) {
      await pausa(6000, 12000);
      const p = await s.context.newPage();
      try {
        await p.goto(a.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await pausa(3000, 5000);
        await revisarMuro(p);
        await cerrarDialogos(p);
        // "Ver más" en la descripción.
        await p.getByRole("button", { name: /ver más|see more/i }).first().click({ timeout: 2000 }).catch(() => {});
        const texto = await p.evaluate(() => (document.querySelector('[role="main"]') as HTMLElement | null)?.innerText ?? document.body.innerText);
        r.detalles[a.id] = leerDetalle(texto);
      } catch (e) {
        if (e instanceof MuroFacebook) {
          r.bloqueo = e.message;
          break;
        }
        r.errores.push(`Detalle ${a.id}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      } finally {
        await p.close();
      }
    }
  }

  r.kb = m.kb();
  r.ms = Date.now() - t0;
  return r;
}
