/**
 * Fase 0: pruebas previas. Responde tres preguntas antes de construir nada:
 *  1. ¿Chileautos responde desde GitHub Actions (con o sin proxy)?
 *  2. ¿Cuántos avisos muestra Facebook Marketplace sin iniciar sesión?
 *  3. ¿La API de búsqueda de MercadoLibre sigue abierta?
 *
 * Deja en out/: report.json (todo), resumen.md (lo importante) y capturas/.
 * En GitHub Actions el resumen aparece también en la página de la corrida.
 */
import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { abrirNavegador, OUT } from "./lib/navegador.js";
import type { ResultadoPrueba } from "./lib/tipos.js";
import { probarChileautos } from "./probes/chileautos.js";
import { probarFacebook } from "./probes/facebook.js";
import { probarMercadoLibre } from "./probes/mercadolibre.js";

const solo = (process.env.SOLO ?? "chileautos,facebook,mercadolibre").split(",").map((x) => x.trim());

function veredictoChileautos(rs: ResultadoPrueba[]) {
  const busquedas = rs.filter((r) => r.nombre.includes("búsqueda"));
  const ok = busquedas.filter((r) => !r.bloqueo && !r.error && r.avisos > 0);
  if (ok.length) return `Responde. ${ok.map((r) => `«${r.nombre.split("· ")[1]}»: ${r.avisos} avisos`).join("; ")}.`;
  if (rs.every((r) => r.error)) return `No se pudo conectar (${rs[0]?.error ?? "sin detalle"}).`;
  const bloqueos = rs.map((r) => r.bloqueo).filter(Boolean);
  if (bloqueos.length) return `Bloqueado (${[...new Set(bloqueos)].join(", ")}). Probar con proxy.`;
  return "Cargó, pero no se encontraron avisos: revisar las capturas y el formato de URL.";
}

function veredictoFacebook(rs: ResultadoPrueba[]) {
  if (rs.length && rs.every((r) => r.error)) return `No se pudo conectar (${rs[0]?.error ?? "sin detalle"}).`;
  const listas = rs.filter((r) => !r.nombre.includes("detalle"));
  const max = Math.max(0, ...listas.map((r) => Math.max(r.avisos, r.avisosTrasScroll ?? 0)));
  const muro = listas.some((r) => r.muroLogin);
  const bloqueos = listas.map((r) => r.bloqueo).filter(Boolean);
  const detalle = rs.find((r) => r.nombre.includes("detalle"));
  const partes = [
    bloqueos.length ? `Bloqueos: ${[...new Set(bloqueos)].join(", ")}.` : "",
    `Hasta ${max} avisos sin sesión${muro ? ", con muro de login" : ""}.`,
    detalle ? detalle.notas.join(". ") + "." : "No se llegó a abrir un aviso.",
  ];
  return partes.filter(Boolean).join(" ");
}

function veredictoML(rs: ResultadoPrueba[]) {
  return rs.map((r) => `${r.nombre.split("· ")[1]}: ${r.error ? `error (${r.error})` : r.bloqueo ? r.bloqueo : `OK, ${r.avisos} resultados`}`).join(" · ");
}

function tabla(rs: ResultadoPrueba[]) {
  const filas = rs.map((r) =>
    [
      r.nombre,
      r.status ?? "—",
      r.error ? `Error: ${r.error}` : r.bloqueo ?? "No",
      r.avisosTrasScroll !== undefined ? `${r.avisos} → ${r.avisosTrasScroll}` : r.avisos,
      r.muroLogin === undefined ? "—" : r.muroLogin ? "Sí" : "No",
      r.kb,
      (r.ms / 1000).toFixed(1),
    ].join(" | "),
  );
  return ["| Prueba | HTTP | Bloqueo | Avisos | Muro login | KB | Seg |", "| --- | --- | --- | --- | --- | --- | --- |", ...filas.map((f) => `| ${f} |`)].join("\n");
}

async function main() {
  const todos: ResultadoPrueba[] = [];
  let usaProxy = false;
  const necesitaNavegador = solo.includes("chileautos") || solo.includes("facebook");

  if (necesitaNavegador) {
    const s = await abrirNavegador();
    usaProxy = s.usaProxy;
    try {
      if (solo.includes("chileautos")) todos.push(...(await probarChileautos(s)));
      if (solo.includes("facebook")) todos.push(...(await probarFacebook(s)));
    } finally {
      await s.cerrar();
    }
  }
  if (solo.includes("mercadolibre")) todos.push(...(await probarMercadoLibre()));

  const de = (f: ResultadoPrueba["fuente"]) => todos.filter((r) => r.fuente === f);
  const lineas = [
    `# Fase 0 · resultados`,
    ``,
    `Fecha: ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })} · Proxy: ${usaProxy ? "sí" : "no"} · Origen: ${process.env.GITHUB_ACTIONS ? "GitHub Actions" : "local"}`,
    ``,
    `## Veredicto`,
    ``,
    ...[
      solo.includes("chileautos") ? `- **Chileautos:** ${veredictoChileautos(de("chileautos"))}` : "",
      solo.includes("facebook") ? `- **Facebook sin sesión:** ${veredictoFacebook(de("facebook"))}` : "",
      solo.includes("mercadolibre") ? `- **MercadoLibre:** ${veredictoML(de("mercadolibre"))}` : "",
    ].filter(Boolean),
    ``,
    `## Detalle`,
    ``,
    tabla(todos),
    ``,
    `## Pistas de API interna (respuestas JSON)`,
    ``,
    ...todos
      .filter((r) => r.json.length)
      .flatMap((r) => [`**${r.nombre}**`, "", ...r.json.slice(0, 8).map((j) => `- ${j.status} · ${j.kb} KB · \`${j.url}\``), ""]),
    `## Notas y muestras`,
    ``,
    ...todos.flatMap((r) => [
      `**${r.nombre}**${r.captura ? ` · captura: \`${r.captura}\`` : ""}`,
      ...r.notas.map((n) => `- ${n}`),
      ...r.muestras.slice(0, 3).map((mu) => `- ${mu.texto ? `${mu.texto} · ` : ""}${mu.url}`),
      "",
    ]),
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));

  const resumen = lineas.join("\n");
  await writeFile(join(OUT, "report.json"), JSON.stringify({ usaProxy, resultados: todos }, null, 2));
  await writeFile(join(OUT, "resumen.md"), resumen);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, resumen + "\n");
  console.log(resumen);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
