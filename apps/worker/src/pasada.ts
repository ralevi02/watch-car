/**
 * Pasada de Chileautos: por cada búsqueda activa que incluya Chileautos,
 * recolecta los avisos, los guarda en Supabase, los normaliza con Gemini, junta
 * duplicados, los evalúa contra la ficha y avisa por push lo nuevo que calza.
 * Corre en GitHub Actions con cron (chileautos.yml) o a mano.
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_URL, TIPO (corta | completa | prueba),
 * MAX_PAGINAS (5), DETALLES (5 por búsqueda), PROXY_URL (opcional).
 */
import { appendFile } from "node:fs/promises";
import { evaluar, Seguimiento } from "@radar/core";
import { clienteServicio, type Json } from "@radar/db";
import { abrirNavegador, pausa } from "./lib/navegador.js";
import {
  aNormalizado,
  datosDeLista,
  deduplicar,
  evaluarAvisos,
  guardarPasada,
  normalizarPendientes,
  type ResumenEvaluacion,
  type ResumenGuardado,
} from "./fuentes/chileautos/guardar.js";
import { recolectarChileautos, type ResultadoChileautos } from "./fuentes/chileautos/recolector.js";
import { enviarPush, type Notificacion } from "./push.js";

const TIPO = process.env.TIPO === "corta" || process.env.TIPO === "completa" ? process.env.TIPO : "prueba";
const MAX_PAGINAS = Number(process.env.MAX_PAGINAS || 5);
const DETALLES = Number(process.env.DETALLES || 5);
const APP_URL = process.env.APP_URL?.replace(/\/$/, "");
const RUN = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

const miles = (n: number | null) => (n === null ? "?" : n.toLocaleString("es-CL"));
const mensaje = (e: unknown) => (e instanceof Error ? e.message.split("\n")[0] ?? e.message : String(e));

async function main() {
  const db = clienteServicio();

  const { data: busquedas, error } = await db.from("busquedas").select("id, nombre, ficha, alertas").eq("activa", true);
  if (error) throw new Error(`Supabase (búsquedas): ${error.message}`);
  const fichas = busquedas.flatMap((b) => {
    const f = Seguimiento.safeParse(b.ficha);
    if (!f.success) {
      console.warn(`Ficha inválida en "${b.nombre}": ${f.error.issues[0]?.message}`);
      return [];
    }
    return f.data.fuentes.includes("chileautos") ? [{ id: b.id, nombre: b.nombre, alertas: b.alertas, ficha: f.data }] : [];
  });
  if (!fichas.length) {
    console.log("No hay búsquedas activas con Chileautos.");
    return;
  }

  // Avisos que ya tienen detalle: no se vuelven a abrir.
  const { data: conDetalleFilas } = await db.from("avisos").select("id_externo").eq("fuente_id", "chileautos").not("descripcion", "is", null);
  const conDetalle = new Set((conDetalleFilas ?? []).map((x) => x.id_externo));

  const informe: string[] = [`# Chileautos · pasada ${TIPO}`, ""];
  const notificaciones: Notificacion[] = [];
  let fallidas = 0;
  const s = await abrirNavegador();
  try {
    for (const [i, b] of fichas.entries()) {
      if (i > 0) await pausa(8000, 15000);
      const { data: pasada, error: e1 } = await db
        .from("pasadas")
        .insert({ fuente_id: "chileautos", busqueda_id: b.id, tipo: TIPO, detalle: { run: RUN ?? null } })
        .select("id")
        .single();
      if (e1) throw new Error(`Supabase (crear pasada): ${e1.message}`);

      let r: ResultadoChileautos | undefined;
      let g: ResumenGuardado | undefined;
      let ev: ResumenEvaluacion | undefined;
      let normalizados = 0;
      let juntados = 0;
      const avisosPasada: string[] = [];
      try {
        r = await recolectarChileautos(s, b.ficha, {
          maxPaginas: MAX_PAGINAS,
          elegirDetalles: (avisos) =>
            avisos
              .filter((a) => !conDetalle.has(a.id) && evaluar(aNormalizado(datosDeLista(a)), b.ficha).tipo !== "fuera")
              .slice(0, DETALLES),
        });
        if (r.avisos.length) {
          const ids = r.avisos.map((a) => a.id);
          g = await guardarPasada(db, b.id, b.ficha, r, pasada.id);
          const n = await normalizarPendientes(db, ids);
          normalizados = n.normalizados;
          if (n.error) avisosPasada.push(n.error);
          juntados = await deduplicar(db, g.nuevosIds);
          ev = await evaluarAvisos(db, b.id, b.ficha, ids, g.nuevosIds);
        }
      } catch (e) {
        avisosPasada.push(mensaje(e));
      }

      const errores = [...(r?.errores ?? []), ...avisosPasada];
      const estado = !r || (!r.avisos.length && !r.bloqueo) ? "error" : r.bloqueo ? "bloqueo" : "ok";
      if (estado !== "ok") fallidas++;

      // Qué avisar por push.
      if (b.alertas && ev) {
        for (const x of ev.nuevosInteresantes.slice(0, 5)) {
          notificaciones.push({
            titulo: x.veredicto === "calza" ? `Nuevo: ${b.nombre}` : `Nuevo con advertencia: ${b.nombre}`,
            cuerpo: `${x.titulo} · $${miles(x.precio)}`,
            url: APP_URL ? `${APP_URL}/resultados?aviso=${x.id}` : x.url,
            etiqueta: `aviso-${x.id}`,
          });
        }
        if (ev.nuevosInteresantes.length > 5) {
          notificaciones.push({ titulo: b.nombre, cuerpo: `Y ${ev.nuevosInteresantes.length - 5} avisos nuevos más`, url: APP_URL ? `${APP_URL}/resultados` : undefined });
        }
      }
      if (b.alertas && g?.bajasDePrecio.length) {
        const { data: fuera } = await db
          .from("resultados")
          .select("aviso_id")
          .eq("busqueda_id", b.id)
          .eq("veredicto", "fuera")
          .in(
            "aviso_id",
            g.bajasDePrecio.map((x) => x.id),
          );
        const descartados = new Set((fuera ?? []).map((x) => x.aviso_id));
        for (const x of g.bajasDePrecio.filter((x) => !descartados.has(x.id))) {
          notificaciones.push({
            titulo: `Bajó de precio: ${b.nombre}`,
            cuerpo: `${x.titulo} · de $${miles(x.antes)} a $${miles(x.ahora)}`,
            url: APP_URL ? `${APP_URL}/resultados?aviso=${x.id}` : x.url,
            etiqueta: `precio-${x.id}`,
          });
        }
      }
      if (estado === "bloqueo") {
        notificaciones.push({ titulo: "Chileautos bloqueó la pasada", cuerpo: `${r?.bloqueo}. Se reintenta en la próxima; si se repite, hay que activar el proxy.`, etiqueta: "bloqueo-chileautos" });
      }

      const detalle: Json = {
        run: RUN ?? null,
        url: r?.url ?? null,
        bloqueo: r?.bloqueo ?? null,
        errores,
        total_portal: r?.totalAvisos ?? null,
        detalles_abiertos: r ? Object.keys(r.detalles).length : 0,
        normalizados,
        juntados,
        bajas_de_precio: g?.bajasDePrecio.length ?? 0,
        no_vistos: g?.noVistos ?? 0,
        veredictos: ev?.veredictos ?? null,
      };
      await db
        .from("pasadas")
        .update({
          estado,
          fin: new Date().toISOString(),
          avisos_vistos: r?.avisos.length ?? 0,
          avisos_nuevos: g?.nuevos ?? 0,
          paginas: r?.paginasLeidas ?? 0,
          kb: r?.kb ?? null,
          detalle,
        })
        .eq("id", pasada.id);

      informe.push(
        `## ${b.nombre}`,
        "",
        `- **Estado:** ${estado}${r?.bloqueo ? ` (${r.bloqueo})` : ""}`,
        `- **Avisos:** ${r?.avisos.length ?? 0} vistos de ${r?.totalAvisos ?? "?"} · ${g?.nuevos ?? 0} nuevos · ${g?.bajasDePrecio.length ?? 0} bajas de precio · ${g?.noVistos ?? 0} no aparecieron`,
        `- **IA:** ${normalizados} normalizados · ${juntados} duplicados juntados`,
        ...(ev ? [`- **Veredictos:** ${ev.veredictos.calza} calzan · ${ev.veredictos.advertencia} con advertencia · ${ev.veredictos.fuera} fuera`] : []),
        `- **Detalles abiertos:** ${r ? Object.keys(r.detalles).length : 0} · **Tráfico:** ${r ? (r.kb / 1024).toFixed(1) : 0} MB`,
        ...errores.map((e) => `- **Aviso:** ${e}`),
        ...(ev?.nuevosInteresantes.length
          ? ["", "Nuevos que calzan o entran con advertencia:", "", ...ev.nuevosInteresantes.map((x) => `- [${x.titulo}](${x.url}) · $${miles(x.precio)} · ${x.veredicto}`)]
          : []),
        "",
      );
    }
  } finally {
    await s.cerrar();
  }

  const push = await enviarPush(db, notificaciones);
  informe.push(`Notificaciones: ${push.enviadas} enviadas de ${notificaciones.length}${push.error ? ` (${push.error})` : ""}.`);

  const texto = informe.join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, texto + "\n");
  console.log(texto);
  if (fallidas === fichas.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
