/**
 * Diagnóstico de la búsqueda de Facebook: corre una consulta en varias
 * variantes y dice cuántos avisos da, dónde aparece un aviso dado y por qué se
 * detuvo la bajada. No guarda avisos ni cuenta como pasada.
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, PROXY_URL, BUSCAR_ID, CONSULTA, MAX_PRECIO.
 */
import { appendFile } from "node:fs/promises";
import { clienteServicio } from "@radar/db";
import { cargarSesion } from "./fuentes/facebook/cuentas.js";
import { abrirNavegador, pausa, scrollHumano } from "./lib/navegador.js";

const db = clienteServicio();
const buscado = process.env.BUSCAR_ID ?? "";
const consulta = process.env.CONSULTA || "Volvo V40";
const { data: cuentas } = await db.from("cuentas_facebook").select("id, nombre").eq("estado", "activa").limit(1);
if (!cuentas?.[0]) throw new Error("No hay cuenta de Facebook activa");
const s = await abrirNavegador();
const informe: string[] = [`# Prueba de búsqueda en Facebook`, "", `Consulta base: «${consulta}». Aviso buscado: ${buscado || "(ninguno)"}`, ""];
try {
  if (!(await cargarSesion(db, s.context, cuentas[0].id))) throw new Error("La cuenta no tiene sesión guardada");
  const variantes = [
    { nombre: "más nuevos primero", q: consulta, orden: "creation_time_descend" },
    { nombre: "por relevancia", q: consulta, orden: "" },
    { nombre: "precio de menor a mayor", q: consulta, orden: "price_ascend" },
  ];
  const page = await s.context.newPage();
  for (const [i, v] of variantes.entries()) {
    if (i > 0) await pausa(8000, 14000);
    const p = new URLSearchParams({ query: v.q, exact: "false", radius: "65" });
    if (process.env.MAX_PRECIO) p.set("maxPrice", process.env.MAX_PRECIO);
    if (v.orden) p.set("sortBy", v.orden);
    await page.goto(`https://www.facebook.com/marketplace/santiago/search/?${p}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await pausa(3000, 5000);
    await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15_000 }).catch(() => {});
    let motivo = "tope de 80 bajadas", antes = -1, quietas = 0;
    for (let k = 0; k < 80; k++) {
      const ahora = await page.locator('a[href*="/marketplace/item/"]').count().catch(() => 0);
      if (await page.getByText(/fuera de tu búsqueda|outside your search/i).count().catch(() => 0)) { motivo = `apareció «resultados fuera de tu búsqueda» en la bajada ${k}`; break; }
      quietas = ahora === antes ? quietas + 1 : 0;
      if (quietas >= 3) { motivo = `no llegaron más avisos (bajada ${k})`; break; }
      antes = ahora;
      await scrollHumano(page, 2);
    }
    const res = await page.evaluate((id) => {
      const fin = [...document.querySelectorAll("span, h2, h3, div[role=heading]")].find((e) => /fuera de tu búsqueda|outside your search|resultados relacionados/i.test(e.textContent ?? ""));
      const ids: string[] = [];
      const todos: string[] = [];
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace/item/"]')) {
        const x = a.href.match(/\/marketplace\/item\/(\d+)/)?.[1];
        if (!x || todos.includes(x)) continue;
        todos.push(x);
        if (!(fin && fin.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)) ids.push(x);
      }
      return { dentro: ids.length, total: todos.length, pos: ids.indexOf(id), posTotal: todos.indexOf(id) };
    }, buscado);
    informe.push(
      `## ${v.nombre}`,
      `- Avisos de la búsqueda: ${res.dentro} (más ${res.total - res.dentro} "relacionados" después)`,
      `- Se detuvo porque: ${motivo}`,
      `- Aviso buscado: ${res.pos >= 0 ? `en la búsqueda, posición ${res.pos + 1}` : res.posTotal >= 0 ? `solo entre los relacionados (posición ${res.posTotal + 1})` : "no aparece"}`,
      "",
    );
  }
} finally {
  await s.cerrar();
}
console.log(informe.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, informe.join("\n"));
