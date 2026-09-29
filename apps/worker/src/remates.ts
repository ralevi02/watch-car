/**
 * Remates de siniestrados (Karcal y Zárate): guarda los lotes de las marcas de
 * las fichas y los cruza con los avisos. Si un auto a la venta salió de un
 * remate (misma patente, o mismo modelo, año y km poco más), queda marcado en
 * el aviso y, si es nuevo y está en Resultados, se avisa.
 * Sin navegador: 3 o 4 pedidos por corrida, una vez al día.
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_*, APP_URL, GITHUB_RUN_URL.
 */
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { coincideRemate, normalizarPatente, patentesEnTexto, Seguimiento } from "@radar/core";
import { clienteServicio, type Json } from "@radar/db";
import { claveKarcal, KARCAL, leerKarcal, leerZarate, scriptsDe, ZARATE, type Lote } from "./fuentes/remates/lector.js";
import { esperar } from "./lib/navegador.js";
import { enviarPush, type Notificacion } from "./push.js";

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* en GitHub Actions no hay .env */
}
const db = clienteServicio();
const APP_URL = process.env.APP_URL;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const informe: string[] = ["# Remates", ""];
const errores: string[] = [];

const { data: fuente } = await db.from("fuentes").select("activa").eq("id", "remates").single();
if (!fuente?.activa) {
  console.log("Remates está desactivado en Fuentes.");
  process.exit(0);
}
const { data: busquedas } = await db.from("busquedas").select("ficha").eq("activa", true);
const marcas = [...new Set((busquedas ?? []).flatMap((b) => { const f = Seguimiento.safeParse(b.ficha); return f.success ? [f.data.marca.toLowerCase()] : []; }))];
const { data: pasada } = await db.from("pasadas").insert({ fuente_id: "remates", tipo: process.env.TIPO || "corta", detalle: { run: process.env.GITHUB_RUN_URL ?? null } }).select("id").single();

async function texto(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
  if (!r.ok) throw new Error(`${new URL(url).host} respondió HTTP ${r.status}`);
  return r.text();
}

async function karcal(): Promise<Lote[]> {
  const html = await texto(KARCAL);
  let clave: ReturnType<typeof claveKarcal> = null;
  for (const src of scriptsDe(html).slice(0, 30)) {
    await esperar(400);
    clave = claveKarcal(await texto(new URL(src, KARCAL).toString()).catch(() => ""));
    if (clave) break;
  }
  if (!clave) throw new Error("Karcal: no encontré la clave del buscador en su sitio (¿cambió la página?)");
  const lotes: Lote[] = [];
  for (const marca of marcas) {
    await esperar(1500);
    const r = await fetch(`https://${clave.app}-dsn.algolia.net/1/indexes/karcal_cars/query`, {
      method: "POST",
      headers: { "X-Algolia-Application-Id": clave.app, "X-Algolia-API-Key": clave.clave, "Content-Type": "application/json", Origin: KARCAL, "User-Agent": UA },
      body: JSON.stringify({ query: marca, hitsPerPage: 500, attributesToHighlight: [] }),
    });
    if (!r.ok) throw new Error(`Karcal (buscador) respondió HTTP ${r.status}`);
    const j = (await r.json()) as { hits?: Parameters<typeof leerKarcal>[0][] };
    lotes.push(...(j.hits ?? []).map(leerKarcal).filter((l) => l.marca?.toLowerCase() === marca));
  }
  return lotes;
}

async function zarate(): Promise<Lote[]> {
  return leerZarate(await texto(ZARATE)).filter((l) => l.marca && marcas.includes(l.marca.toLowerCase()));
}

const lotes: Lote[] = [];
for (const [nombre, f] of [["Karcal", karcal], ["Zárate", zarate]] as const) {
  try {
    const l = await f();
    lotes.push(...l);
    informe.push(`- ${nombre}: ${l.length} lotes de ${marcas.join(", ")}`);
  } catch (e) {
    errores.push(e instanceof Error ? e.message : String(e));
    informe.push(`- ${nombre}: error (${e instanceof Error ? e.message : String(e)})`);
  }
}

if (lotes.length) {
  const ahora = new Date().toISOString();
  const filas = lotes.map((l) => ({ ...l, crudo: l.crudo as Json, visto_en: ahora }));
  for (let i = 0; i < filas.length; i += 200) {
    const { error } = await db.from("remates").upsert(filas.slice(i, i + 200), { onConflict: "id" });
    if (error) errores.push(`Supabase (remates): ${error.message}`);
  }
}

// ── Cruce con los avisos ────────────────────────────────────────────────────
const { data: todosLotes } = await db.from("remates").select("id, fuente, lote, patente, marca, modelo, anio, km, fecha, condicion, url");
const { data: avisos } = await db
  .from("avisos")
  .select("id, fuente_id, id_externo, titulo, descripcion, marca, modelo, anio, km, primera_vez, remate")
  .neq("estado", "vendido");
const nuevos: { avisoId: string; titulo: string; lote: NonNullable<typeof todosLotes>[number]; tipo: "patente" | "posible" }[] = [];
let marcados = 0;
for (const a of avisos ?? []) {
  const patentes = [...patentesEnTexto(a.titulo, a.descripcion), ...(a.fuente_id === "brunofritsch" ? [normalizarPatente(a.id_externo)].filter((x): x is string => Boolean(x)) : [])];
  let mejor: { lote: NonNullable<typeof todosLotes>[number]; tipo: "patente" | "posible" } | null = null;
  for (const l of todosLotes ?? []) {
    const tipo = coincideRemate({ marca: a.marca, modelo: a.modelo, anio: a.anio, km: a.km, primeraVez: a.primera_vez, patentes }, l);
    if (!tipo) continue;
    if (!mejor || (tipo === "patente" && mejor.tipo !== "patente") || (tipo === mejor.tipo && Math.abs((a.km ?? 0) - (l.km ?? 0)) < Math.abs((a.km ?? 0) - (mejor.lote.km ?? 0)))) mejor = { lote: l, tipo };
  }
  const valor = mejor
    ? { tipo: mejor.tipo, fuente: mejor.lote.fuente, lote: mejor.lote.lote, fecha: mejor.lote.fecha, condicion: mejor.lote.condicion, km: mejor.lote.km, url: mejor.lote.url, patente: mejor.lote.patente }
    : null;
  const antes = a.remate as { tipo?: string; url?: string } | null;
  if (JSON.stringify(antes ?? null) === JSON.stringify(valor)) {
    if (valor) marcados++;
    continue;
  }
  await db.from("avisos").update({ remate: valor }).eq("id", a.id);
  if (valor) {
    marcados++;
    if (!antes || antes.tipo !== valor.tipo) nuevos.push({ avisoId: a.id, titulo: a.titulo, lote: mejor!.lote, tipo: mejor!.tipo });
  }
}
informe.push("", `Avisos que coinciden con un remate: ${marcados} (${nuevos.length} nuevos).`);

// Solo se avisa de lo que está en Resultados (no de avisos que ya quedaron fuera).
const notis: Notificacion[] = [];
if (nuevos.length) {
  const { data: visibles } = await db.from("resultados").select("aviso_id").neq("veredicto", "fuera").in("aviso_id", nuevos.map((n) => n.avisoId));
  const enResultados = new Set((visibles ?? []).map((v) => v.aviso_id));
  for (const n of nuevos.filter((x) => enResultados.has(x.avisoId))) {
    notis.push({
      titulo: n.tipo === "patente" ? "Salió de remate" : "¿Salió de remate?",
      cuerpo: `${n.titulo}: ${n.tipo === "patente" ? "misma patente que" : "parecido a"} un lote de ${n.lote.fuente === "karcal" ? "Karcal" : "Zárate"}${n.lote.condicion ? ` (${n.lote.condicion.split(",")[0]})` : ""}.`,
      url: APP_URL ? `${APP_URL}/resultados?aviso=${n.avisoId}` : undefined,
      etiqueta: `remate-${n.avisoId}`,
      tipo: "sistema",
    });
  }
}
const push = await enviarPush(db, notis);
informe.push(`Notificaciones: ${push.enviadas} enviadas de ${notis.length}.`, ...errores.map((e) => `- **Aviso:** ${e}`));

if (pasada) {
  await db
    .from("pasadas")
    .update({ estado: errores.length && !lotes.length ? "error" : "ok", fin: new Date().toISOString(), avisos_vistos: lotes.length, avisos_nuevos: nuevos.length, detalle: { run: process.env.GITHUB_RUN_URL ?? null, errores, coinciden: marcados, nota: `${marcados} avisos coinciden con un remate` } })
    .eq("id", pasada.id);
}
const salida = informe.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, salida + "\n");
console.log(salida);
