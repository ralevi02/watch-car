import type { Sesion } from "../lib/navegador.js";
import { capturar, detectarBloqueo, pausa } from "../lib/navegador.js";
import type { ResultadoPrueba } from "../lib/tipos.js";

/**
 * Chileautos: ¿responde desde esta IP?, ¿cuántos avisos se ven?, ¿qué JSON
 * interno pide la página? (para leer ese JSON en vez del HTML en la fase 1).
 *
 * Probamos dos formatos de URL de búsqueda porque no sabemos cuál usa hoy el
 * sitio; el resumen dice cuál funcionó.
 */
const PRUEBAS = [
  { nombre: "Chileautos · portada", url: "https://www.chileautos.cl/" },
  { nombre: "Chileautos · búsqueda por ruta", url: "https://www.chileautos.cl/vehiculos/volvo/v40/" },
  {
    nombre: "Chileautos · búsqueda con filtros",
    url: "https://www.chileautos.cl/vehiculos/?q=(And.Marca.Volvo._.Modelo.V40.)",
  },
  // Un aviso real de la búsqueda de septiembre; puede estar vendido, igual sirve para ver si carga.
  { nombre: "Chileautos · detalle de aviso", url: "https://www.chileautos.cl/vehiculos/detalles/volvo/CL-AD-20184300/" },
];

export async function probarChileautos(s: Sesion): Promise<ResultadoPrueba[]> {
  const resultados: ResultadoPrueba[] = [];
  for (const p of PRUEBAS) {
    const page = await s.context.newPage();
    const m = s.medir();
    const t0 = Date.now();
    const r: ResultadoPrueba = { fuente: "chileautos", nombre: p.nombre, url: p.url, bloqueo: null, avisos: 0, kb: 0, ms: 0, json: [], muestras: [], notas: [] };
    try {
      const resp = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      r.status = resp?.status();
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => r.notas.push("La red no quedó en reposo en 15 s"));
      await pausa(1500, 3000);
      r.urlFinal = page.url();
      r.titulo = await page.title();
      const texto = await page.evaluate(() => document.body?.innerText ?? "");
      r.bloqueo = detectarBloqueo(r.status, r.titulo, texto);

      const info = await page.evaluate(() => {
        const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/vehiculos/detalles/"]')];
        const unicos = [...new Map(links.map((a) => [a.href.split("?")[0], a])).values()];
        const ldTipos = [...document.querySelectorAll('script[type="application/ld+json"]')].map((sc) => {
          try {
            const j = JSON.parse(sc.textContent ?? "null");
            return Array.isArray(j) ? j.map((x) => x?.["@type"]).join(",") : String(j?.["@type"] ?? "?");
          } catch {
            return "json-ld ilegible";
          }
        });
        const estados = ["__NEXT_DATA__", "__NUXT__", "__INITIAL_STATE__", "__APOLLO_STATE__", "__PRELOADED_STATE__"].filter(
          (k) => (window as unknown as Record<string, unknown>)[k] !== undefined || document.getElementById(k) !== null,
        );
        return {
          total: unicos.length,
          muestras: unicos.slice(0, 5).map((a) => ({ url: a.href.split("?")[0] ?? a.href, texto: (a.innerText || "").replace(/\s+/g, " ").trim().slice(0, 140) })),
          ldTipos,
          estados,
        };
      });
      r.avisos = info.total;
      r.muestras = info.muestras;
      if (info.ldTipos.length) r.notas.push(`JSON-LD en la página: ${info.ldTipos.join(" | ")}`);
      if (info.estados.length) r.notas.push(`Estado embebido: ${info.estados.join(", ")}`);
      if (r.urlFinal !== p.url) r.notas.push(`Redirigió a ${r.urlFinal}`);
    } catch (e) {
      r.error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
    r.captura = await capturar(page, p.nombre);
    r.kb = m.kb();
    r.json = m.json();
    r.ms = Date.now() - t0;
    resultados.push(r);
    await page.close();
    await pausa(3000, 7000);
  }
  return resultados;
}
