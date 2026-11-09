import type { Page } from "patchright";
import type { Seguimiento } from "@radar/core";
import { capturar, pausa, scrollHumano, type Sesion } from "../../lib/navegador.js";
import type { AvisoPortal, OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { detectarMuro, leerDetalle, leerTarjeta, planBusquedas, urlBusqueda, urlVehiculos } from "./lector.js";

type Grilla = Awaited<ReturnType<typeof leerGrilla>>;
/** Las fichas de una misma pasada comparten búsquedas: no se repite la misma URL. */
const yaBuscadas = new Map<string, Grilla>();

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
 * navegador. Ritmo humano: pausas y scroll. Con FB_BARRIDO=completo recorre el
 * plan entero (tramos de precio y los dos órdenes); si no, solo lo más nuevo.
 */
export async function recolectarFacebook(s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion & { ciudad?: string } = {}): Promise<ResultadoRecoleccion> {
  const m = s.medir();
  const t0 = Date.now();
  const r: ResultadoRecoleccion = { url: "", paginasLeidas: 0, paginasTotales: 0, avisos: [], detalles: {}, descartadas: [], bloqueo: null, errores: [], capturas: [], kb: 0, ms: 0 };
  const vistos = new Map<string, AvisoPortal>();
  const maxBusquedas = op.maxPaginas ?? 5;
  // Respuestas internas de Facebook (GraphQL), para el diagnóstico si no aparece nada.
  const red: string[] = [];
  let muestraBusqueda: string | undefined;
  // Una pestaña nueva por búsqueda: la misma pestaña de Marketplace se pone cada vez más lenta.
  const abrirPestana = async () => {
    const p = await s.context.newPage();
    p.on("response", async (res) => {
      if (!res.url().includes("/api/graphql") || red.length >= 25) return;
      const nombre = res.request().headers()["x-fb-friendly-name"] ?? "?";
      const cuerpo = await res.text().catch(() => "");
      if (/search/i.test(nombre) && !muestraBusqueda) muestraBusqueda = `${nombre}: ${cuerpo.slice(0, 3000)}`;
      red.push(`${nombre} ${res.status()} ${Math.round(cuerpo.length / 1024)}KB${/"errors"\s*:/.test(cuerpo) ? " con errores" : ""}${/marketplace_search|listing/i.test(cuerpo) ? " con avisos" : ""}`);
    });
    return p;
  };
  let page = await abrirPestana();

  try {
    const plan = planBusquedas(ficha, process.env.FB_BARRIDO === "completo").slice(0, maxBusquedas);
    const urlDe = (b: (typeof plan)[number]) => urlBusqueda(ficha, b.consulta, op.ciudad, b.precio, b.orden);
    r.url = urlDe(plan[0]!);
    let cargadas = 0;
    for (const [i, b] of plan.entries()) {
      const url = urlDe(b);
      let grilla = yaBuscadas.get(url);
      let vehiculos: { url: string; enlaces: number } | undefined;
      if (!grilla) {
        if (cargadas > 0) {
          await pausa(5000, 11000);
          await page.close();
          page = await abrirPestana();
        }
        cargadas++;
        const t = Date.now();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await pausa(3000, 6000);
        await revisarMuro(page);
        await cerrarDialogos(page);
        // Los avisos llegan después de la página: se esperan hasta 15 s.
        await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15_000 }).catch(() => {});
        // La grilla carga más avisos al bajar: se baja hasta el final (dos vueltas sin avisos nuevos,
        // o hasta el título "Resultados fuera de tu búsqueda"), con tope de 30 vueltas y 2 minutos.
        let bajadas = 0;
        for (let antes = -1, quietas = 0; bajadas < 30 && quietas < 2 && Date.now() - t < 120_000; bajadas++) {
          const ahora = await page.locator('a[href*="/marketplace/item/"]').count().catch(() => 0);
          const fin = await page.getByText(/fuera de tu búsqueda|outside your search/i).count().catch(() => 0);
          if (fin > 0) break;
          quietas = ahora === antes ? quietas + 1 : 0;
          antes = ahora;
          await scrollHumano(page, 2);
        }
        grilla = await leerGrilla(page);
        // La búsqueda general a veces sale vacía: se prueba dentro de Vehículos.
        if (grilla.length === 0 && i === 0) {
          const urlV = urlVehiculos(ficha, b.consulta, op.ciudad, b.precio);
          await pausa(4000, 8000);
          await page.goto(urlV, { waitUntil: "domcontentloaded", timeout: 45_000 });
          await pausa(3000, 6000);
          await revisarMuro(page);
          await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15_000 }).catch(() => {});
          await scrollHumano(page, 3);
          grilla = await leerGrilla(page);
          vehiculos = { url: urlV, enlaces: grilla.length };
        }
        yaBuscadas.set(url, grilla);
        const tramo = b.precio ? ` ${Math.round((b.precio.min ?? 0) / 1e5) / 10}-${Math.round((b.precio.max ?? 0) / 1e5) / 10} M` : "";
        console.log(`Facebook ${i + 1}/${plan.length} «${b.consulta}»${tramo} ${b.orden}: ${grilla.length} avisos, ${bajadas} bajadas, ${Math.round((Date.now() - t) / 1000)} s`);
      }
      r.paginasLeidas++;
      for (const { c, aviso } of grilla) {
        if (!aviso) r.descartadas.push(`${c.id}: ${c.texto.replace(/\s+/g, " ").slice(0, 80)}`);
        else if (!vistos.has(aviso.id)) vistos.set(aviso.id, aviso);
      }
      if (i === 0 && vistos.size === 0) {
        const c = await capturar(page, "facebook-sin-resultados");
        if (c) r.capturas.push(c);
        r.diagnostico = { ...(await diagnosticar(page, r.descartadas)), red: [...red], vehiculos, muestraBusqueda };
        // Página cargada, sesión viva, pero Facebook no pidió ni mostró avisos: se lo guarda para él.
        if (!red.some((x) => /marketplace/i.test(x)) && (vehiculos?.enlaces ?? 0) === 0) {
          r.errores.push(
            process.env.PROXY_URL || process.env.IP_RESIDENCIAL === "1"
              ? "Facebook no mostró avisos a esta cuenta (puede estar restringida para Marketplace)"
              : "Facebook no muestra avisos desde la IP de GitHub: corre desde el homelab",
          );
        }
      }
    }
    r.paginasTotales = plan.length;
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
      // En el detalle solo interesa el texto: sin fotos ni videos se gasta mucho menos proxy.
      await p.route("**/*", (ruta) => (["image", "media"].includes(ruta.request().resourceType()) ? ruta.abort() : ruta.fallback()));
      try {
        await p.goto(a.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await pausa(3000, 5000);
        await revisarMuro(p);
        await cerrarDialogos(p);
        // "Ver más" en la descripción.
        await p.getByRole("button", { name: /ver más|see more/i }).first().click({ timeout: 2000 }).catch(() => {});
        const { texto, fotos } = await p.evaluate(() => {
          const main = (document.querySelector('[role="main"]') as HTMLElement | null) ?? document.body;
          // Las fotos del aviso: imágenes grandes del CDN (aunque no se bajen, el src está). Las chicas son perfiles.
          const fotos = [...main.querySelectorAll<HTMLImageElement>('img[src*="scontent"], img[src*="fbcdn"]')]
            .filter((img) => /foto de producto|product photo/i.test(img.alt) || img.getBoundingClientRect().width >= 120)
            .map((img) => img.src);
          return { texto: main.innerText, fotos: [...new Set(fotos)].slice(0, 20) };
        });
        r.detalles[a.id] = { ...leerDetalle(texto), ...(fotos.length ? { fotos } : {}) };
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
