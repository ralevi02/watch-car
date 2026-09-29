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
  const page = await s.context.newPage();
  // Sin fotos ni videos: la prueba solo cuenta avisos y gasta poco proxy.
  await page.route("**/*", (r) => (["image", "media", "font"].includes(r.request().resourceType()) ? r.abort() : r.fallback()));

  /** Abre la URL, baja hasta que no lleguen más avisos y dice cuántos hay y dónde está el buscado. */
  const contar = async (nombre: string, url: string) => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
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
    // La URL sin la parte de la ciudad, para reusarla en el lector (no trae datos personales).
    const u = new URL(page.url());
    informe.push(
      `## ${nombre}`,
      `- URL: ${u.pathname}${u.search}`,
      `- Avisos: ${res.dentro} (más ${res.total - res.dentro} "relacionados" después)`,
      `- Se detuvo porque: ${motivo}`,
      `- Aviso buscado: ${res.pos >= 0 ? `sí, posición ${res.pos + 1}` : res.posTotal >= 0 ? `solo entre los relacionados (posición ${res.posTotal + 1})` : "no aparece"}`,
      "",
    );
  };

  const base = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ exact: "false", radius: "65", ...extra });
    if (process.env.MAX_PRECIO) p.set("maxPrice", process.env.MAX_PRECIO);
    return p;
  };

  // 1. Búsqueda por texto (la de siempre), como referencia.
  await contar("Búsqueda por texto, más nuevos", `https://www.facebook.com/marketplace/santiago/search/?${base({ query: consulta, sortBy: "creation_time_descend" })}`);
  await pausa(8000, 14000);
  // 2. El mismo texto dentro de la categoría Vehículos.
  await contar("Categoría Vehículos con texto", `https://www.facebook.com/marketplace/santiago/vehicles/?${base({ query: consulta, sortBy: "creation_time_descend" })}`);
  await pausa(8000, 14000);

  // 3. Categoría Vehículos con los filtros de marca y modelo: se tocan como una persona y se lee la URL que queda.
  const [marca, ...resto] = consulta.split(" ");
  const modelo = resto.join(" ");
  await page.goto(`https://www.facebook.com/marketplace/santiago/vehicles/?${base({ sortBy: "creation_time_descend" })}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await pausa(4000, 6000);
  const elegir = async (campo: RegExp, valor: string) => {
    const abrir = page.getByRole("combobox", { name: campo }).or(page.getByRole("button", { name: campo })).or(page.getByText(campo)).first();
    await abrir.click({ timeout: 8000 });
    await pausa(1500, 2500);
    const opcion = page.getByRole("option", { name: new RegExp(`^${valor}$`, "i") }).or(page.getByRole("radio", { name: new RegExp(`^${valor}$`, "i") })).or(page.getByText(new RegExp(`^${valor}$`, "i"))).first();
    await opcion.click({ timeout: 8000 });
    await pausa(3000, 4500);
  };
  let filtros = "";
  try {
    // En pantallas angostas los filtros están detrás de un botón "Filtros".
    const botonFiltros = page.getByRole("button", { name: /^(filtros|filters)$/i }).or(page.getByText(/^(filtros|filters)$/i)).first();
    if (await botonFiltros.count()) {
      await botonFiltros.click({ timeout: 8000 });
      await pausa(2000, 3000);
    }
    await elegir(/^(marca|make)$/i, marca!);
    filtros = `marca ${marca}`;
    if (modelo) {
      await elegir(/^(modelo|model)$/i, modelo);
      filtros += `, modelo ${modelo}`;
    }
  } catch (e) {
    // Qué controles de filtro hay (solo sus etiquetas, que son textos de la interfaz de Facebook).
    const controles = await page
      .evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[role="combobox"], [role="button"], [role="listbox"], label, select, input')]
          .map((el) => (el.getAttribute("aria-label") || el.innerText || (el as HTMLInputElement).placeholder || "").trim().split("\n")[0]!)
          // Solo lo que es de filtros: nada de nombres de cuentas ni de avisos en el log público.
          .filter((t) => t && t.length < 40 && /marca|modelo|make|model|año|year|precio|price|kilometraje|mileage|tipo de veh|vehicle type|carrocer|body|transmis|filtr|categor/i.test(t)),
      )
      .catch(() => [] as string[]);
    informe.push(`Controles que se ven: ${[...new Set(controles)].slice(0, 60).join(" | ")}`, "");
    informe.push(`Filtros de marca/modelo: no se pudieron elegir${filtros ? ` más allá de ${filtros}` : ""} (${e instanceof Error ? e.message.split("\n")[0] : String(e)}).`, "");
  }
  if (filtros) await contar(`Categoría Vehículos con filtros (${filtros})`, page.url());
} finally {
  await s.cerrar();
}
console.log(informe.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, informe.join("\n"));
