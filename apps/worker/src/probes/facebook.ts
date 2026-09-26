import type { Page } from "patchright";
import type { Sesion } from "../lib/navegador.js";
import { capturar, detectarBloqueo, pausa, scrollHumano } from "../lib/navegador.js";
import type { ResultadoPrueba } from "../lib/tipos.js";

/**
 * Facebook Marketplace SIN iniciar sesión: ¿cuántos avisos muestra antes del
 * muro de login?, ¿respeta los filtros de la URL?, ¿se puede leer el detalle
 * de un aviso (km, descripción)?
 *
 * Esta prueba no usa ninguna cuenta. La versión con cuenta secundaria llega
 * en la fase 2.
 */
const PRUEBAS = [
  { nombre: "Facebook · página pública V40 Santiago", url: "https://www.facebook.com/marketplace/santiagocl/volvo-v40/" },
  { nombre: "Facebook · página pública V60 Santiago", url: "https://www.facebook.com/marketplace/santiagocl/volvo-v60/" },
  {
    nombre: "Facebook · búsqueda con filtros",
    url: "https://www.facebook.com/marketplace/santiago/search/?query=volvo%20v40&minYear=2017&maxPrice=14000000&sortBy=creation_time_descend&exact=false",
  },
];

async function contarAvisos(page: Page) {
  return page.evaluate(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace/item/"]')];
    const porId = new Map<string, HTMLAnchorElement>();
    for (const a of links) {
      const id = a.href.match(/\/marketplace\/item\/(\d+)/)?.[1];
      if (id && !porId.has(id)) porId.set(id, a);
    }
    return {
      total: porId.size,
      muestras: [...porId.entries()].slice(0, 6).map(([id, a]) => ({
        url: `https://www.facebook.com/marketplace/item/${id}/`,
        texto: (a.innerText || "").replace(/\s+/g, " ").trim().slice(0, 140),
      })),
    };
  });
}

async function hayMuroLogin(page: Page) {
  if (/\/login|checkpoint/.test(page.url())) return true;
  return page.evaluate(() => {
    const t = document.body?.innerText ?? "";
    const form = document.querySelector('form[action*="login"], input[name="email"], input[name="pass"]');
    return Boolean(form) || /inicia sesión en facebook|log in to facebook|ver más en facebook|see more on facebook/i.test(t);
  });
}

/** Intenta cerrar el cuadro de "inicia sesión" que aparece al bajar. */
async function cerrarDialogo(page: Page) {
  const cerrar = page.locator('[aria-label="Cerrar"], [aria-label="Close"]').first();
  if (await cerrar.isVisible().catch(() => false)) {
    await cerrar.click().catch(() => {});
    await pausa(800, 1500);
    return true;
  }
  await page.keyboard.press("Escape").catch(() => {});
  return false;
}

export async function probarFacebook(s: Sesion): Promise<ResultadoPrueba[]> {
  const resultados: ResultadoPrueba[] = [];
  let primerAviso: string | undefined;

  for (const p of PRUEBAS) {
    const page = await s.context.newPage();
    const m = s.medir();
    const t0 = Date.now();
    const r: ResultadoPrueba = { fuente: "facebook", nombre: p.nombre, url: p.url, bloqueo: null, avisos: 0, kb: 0, ms: 0, json: [], muestras: [], notas: [] };
    try {
      const resp = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      r.status = resp?.status();
      await pausa(3000, 5000);
      r.urlFinal = page.url();
      r.titulo = await page.title();
      const texto = await page.evaluate(() => document.body?.innerText ?? "");
      r.bloqueo = detectarBloqueo(r.status, r.titulo, texto);

      const antes = await contarAvisos(page);
      r.avisos = antes.total;
      r.muestras = antes.muestras;

      if (await cerrarDialogo(page)) r.notas.push("Apareció un cuadro de login y se pudo cerrar");
      await scrollHumano(page, 6);
      await cerrarDialogo(page);
      const despues = await contarAvisos(page);
      r.avisosTrasScroll = despues.total;
      if (despues.muestras.length > r.muestras.length) r.muestras = despues.muestras;
      r.muroLogin = await hayMuroLogin(page);
      if (r.urlFinal !== p.url) r.notas.push(`Redirigió a ${r.urlFinal}`);
      primerAviso ??= r.muestras[0]?.url;
    } catch (e) {
      r.error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
    r.captura = await capturar(page, p.nombre);
    r.kb = m.kb();
    r.json = m.json().filter((j) => !j.url.includes("/ajax/bz")).slice(0, 15);
    r.ms = Date.now() - t0;
    resultados.push(r);
    await page.close();
    await pausa(4000, 8000);
  }

  // Detalle de un aviso: ¿se ven el km y la descripción sin sesión?
  if (primerAviso) {
    const page = await s.context.newPage();
    const m = s.medir();
    const t0 = Date.now();
    const r: ResultadoPrueba = { fuente: "facebook", nombre: "Facebook · detalle de un aviso", url: primerAviso, bloqueo: null, avisos: 0, kb: 0, ms: 0, json: [], muestras: [], notas: [] };
    try {
      const resp = await page.goto(primerAviso, { waitUntil: "domcontentloaded", timeout: 45_000 });
      r.status = resp?.status();
      await pausa(3000, 5000);
      await cerrarDialogo(page);
      r.urlFinal = page.url();
      r.titulo = await page.title();
      const texto = await page.evaluate(() => document.body?.innerText ?? "");
      r.bloqueo = detectarBloqueo(r.status, r.titulo, texto);
      r.muroLogin = await hayMuroLogin(page);
      const km = texto.match(/.{0,60}(kil[oó]metros|\bkm\b).{0,60}/i)?.[0];
      const precio = texto.match(/\$\s?[\d.]{5,}/)?.[0];
      r.avisos = 1;
      r.muestras = [{ url: primerAviso, texto: [precio && `Precio: ${precio}`, km && `Km: …${km.trim()}…`].filter(Boolean).join(" · ") || undefined }];
      r.notas.push(km ? "Se ve el kilometraje sin sesión" : "No se encontró el kilometraje en el texto");
      r.notas.push(/descripci[oó]n|detalles del vendedor|description/i.test(texto) ? "Hay sección de descripción/detalles" : "No se vio la descripción");
    } catch (e) {
      r.error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
    r.captura = await capturar(page, r.nombre);
    r.kb = m.kb();
    r.json = m.json().slice(0, 10);
    r.ms = Date.now() - t0;
    resultados.push(r);
    await page.close();
  }
  return resultados;
}
