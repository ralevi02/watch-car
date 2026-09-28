/**
 * Pasada de una fuente (FUENTE=chileautos | facebook): por cada búsqueda
 * activa que la incluya, recolecta avisos, los guarda en Supabase, los
 * normaliza con Gemini, junta duplicados, los evalúa contra la ficha, procesa
 * links compartidos y avisa por push lo nuevo que calza.
 * Corre en GitHub Actions con cron (chileautos.yml, facebook.yml) o a mano.
 *
 * Variables: FUENTE, SUPABASE_URL, SUPABASE_SECRET_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_URL, TIPO (corta | completa | prueba),
 * MAX_PAGINAS (5), DETALLES (5 por búsqueda), PROXY_URL.
 */
import { appendFile } from "node:fs/promises";
import { evaluar, Seguimiento } from "@radar/core";
import { clienteServicio, type ClienteDb, type Json } from "@radar/db";
import { procesarCompartidos } from "./compartidos.js";
import { recolectarChileautos } from "./fuentes/chileautos/recolector.js";
import { cargarSesion, elegirCuenta, leerConfig, registrarUso } from "./fuentes/facebook/cuentas.js";
import { recolectarFacebook } from "./fuentes/facebook/recolector.js";
import { recolectarKavak } from "./fuentes/kavak/recolector.js";
import { crearRecolectorML } from "./fuentes/mercadolibre/recolector.js";
import { recolectarYapo } from "./fuentes/yapo/recolector.js";
import { hashearFotos } from "./fotos.js";
import type { Recolector, ResultadoRecoleccion } from "./fuentes/tipos.js";
import { aNormalizado, datosDeLista, deduplicar, evaluarAvisos, guardarPasada, normalizarPendientes, type ResumenEvaluacion, type ResumenGuardado } from "./guardar.js";
import { abrirNavegador, pausa, type Sesion } from "./lib/navegador.js";
import { enviarPush, type Notificacion } from "./push.js";

const FUENTE = process.env.FUENTE || "chileautos";
const NOMBRE: Record<string, string> = { chileautos: "Chileautos", facebook: "Facebook", kavak: "Kavak", yapo: "Yapo", mercadolibre: "MercadoLibre" };
const TIPO = process.env.TIPO === "corta" || process.env.TIPO === "completa" ? process.env.TIPO : "prueba";
const MAX_PAGINAS = Number(process.env.MAX_PAGINAS || 5);
const DETALLES = Number(process.env.DETALLES || (FUENTE === "facebook" ? 4 : 5));
const APP_URL = process.env.APP_URL?.replace(/\/$/, "");
const RUN = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

const miles = (n: number | null) => (n === null ? "?" : n.toLocaleString("es-CL"));
const mensaje = (e: unknown) => (e instanceof Error ? e.message.split("\n")[0] ?? e.message : String(e));

/**
 * Si la corrida se pidió a mano (desde la app) y no hubo nada que recolectar,
 * se deja el motivo en el registro para que se vea en Fuentes. En las
 * corridas programadas no, para no llenar el registro.
 */
async function registrarSiEsManual(db: ClienteDb, estado: "ok" | "error", motivo: string) {
  if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch") return;
  const ahora = new Date().toISOString();
  const detalle = estado === "error" ? { run: RUN ?? null, errores: [motivo] } : { run: RUN ?? null, nota: motivo };
  await db.from("pasadas").insert({ fuente_id: FUENTE, tipo: TIPO, estado, inicio: ahora, fin: ahora, avisos_vistos: 0, avisos_nuevos: 0, detalle });
}

/** Guarda el diagnóstico en la base y la captura en el bucket privado "diagnostico". */
async function guardarDiagnostico(db: ClienteDb, pasadaId: string, d: NonNullable<ResultadoRecoleccion["diagnostico"]>): Promise<Json> {
  let captura: string | null = null;
  if (d.captura) {
    const ruta = `${FUENTE}/${pasadaId}.png`;
    const { error } = await db.storage.from("diagnostico").upload(ruta, d.captura, { contentType: "image/png", upsert: true });
    captura = error ? `error: ${error.message}` : ruta;
  }
  return { url: d.url, titulo: d.titulo, texto: d.texto, enlaces: d.enlaces, muestra_enlaces: d.muestraEnlaces, descartadas: d.descartadas, captura };
}

interface Preparada {
  recolectar: Recolector;
  /** Se llama con el navegador abierto (Facebook carga la sesión). Devuelve un motivo si no se puede seguir. */
  alAbrir?: (s: Sesion) => Promise<string | null>;
  /** Se llama al final con todos los resultados (Facebook registra el uso de la cuenta). */
  alTerminar?: (resultados: ResultadoRecoleccion[]) => Promise<Notificacion[]>;
}

async function preparar(db: ClienteDb): Promise<Preparada | { noCorre: string }> {
  if (FUENTE === "chileautos") return { recolectar: recolectarChileautos };
  if (FUENTE === "kavak" || FUENTE === "yapo" || FUENTE === "mercadolibre") {
    const { data: f } = await db.from("fuentes").select("activa").eq("id", FUENTE).single();
    if (!f?.activa) return { noCorre: `${NOMBRE[FUENTE]} está desactivado en Fuentes.` };
    // Probado en septiembre 2026: Kavak (CloudFront) y Yapo (Cloudflare) bloquean las IPs de GitHub.
    if (FUENTE !== "mercadolibre" && !process.env.PROXY_URL) return { noCorre: `${NOMBRE[FUENTE]} bloquea las IPs de GitHub: se necesita PROXY_URL.` };
    if (FUENTE === "kavak") return { recolectar: recolectarKavak };
    if (FUENTE === "yapo") return { recolectar: recolectarYapo };
    return { recolectar: crearRecolectorML(db) };
  }
  if (FUENTE !== "facebook") return { noCorre: `Fuente desconocida: ${FUENTE}` };

  const { activa, config } = await leerConfig(db);
  if (!activa) return { noCorre: "Facebook está desactivado en Fuentes." };
  if (!process.env.PROXY_URL && process.env.FB_SIN_PROXY !== "1") return { noCorre: "Falta PROXY_URL: Facebook no se corre sin la IP fija." };
  const cuenta = await elegirCuenta(db, config);
  if (!cuenta) return { noCorre: "No hay cuentas de Facebook activas con pasadas disponibles hoy." };
  console.log(`Cuenta de Facebook: ${cuenta.nombre}`);
  return {
    recolectar: (s, ficha, op) => recolectarFacebook(s, ficha, { ...op, ciudad: config.ciudad }),
    alAbrir: async (s) => ((await cargarSesion(db, s.context, cuenta.id)) ? null : `La cuenta ${cuenta.nombre} no tiene sesión guardada.`),
    alTerminar: async (resultados) => {
      const muro = resultados.find((r) => r.bloqueo)?.bloqueo;
      if (!muro) {
        await registrarUso(db, cuenta.id, { ok: true });
        return [];
      }
      const bloqueada = /bloque/i.test(muro);
      await registrarUso(db, cuenta.id, { ok: false, estado: bloqueada ? "bloqueada" : "necesita_reconexion", error: muro });
      return [
        {
          titulo: bloqueada ? `Facebook bloqueó la cuenta ${cuenta.nombre}` : `Reconecta la cuenta ${cuenta.nombre}`,
          cuerpo: `${muro}. Ábrela en Fuentes para reconectarla${config.rotacion ? "; mientras, se usan las otras cuentas" : ""}.`,
          url: APP_URL ? `${APP_URL}/fuentes` : undefined,
          etiqueta: `cuenta-${cuenta.id}`,
        },
      ];
    },
  };
}

async function main() {
  const db = clienteServicio();
  const prep = await preparar(db);
  if ("noCorre" in prep) {
    console.log(prep.noCorre);
    await registrarSiEsManual(db, "error", prep.noCorre);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `# ${NOMBRE[FUENTE] ?? FUENTE}\n\nNo se corrió: ${prep.noCorre}\n`);
    return;
  }

  const { data: busquedas, error } = await db.from("busquedas").select("id, nombre, ficha, alertas").eq("activa", true);
  if (error) throw new Error(`Supabase (búsquedas): ${error.message}`);
  const todas = busquedas.flatMap((b) => {
    const f = Seguimiento.safeParse(b.ficha);
    return f.success ? [{ id: b.id, nombre: b.nombre, alertas: b.alertas, ficha: f.data }] : [];
  });
  const fichas = todas.filter((b) => b.ficha.fuentes.includes(FUENTE as Seguimiento["fuentes"][number]));
  const { count: compartidosPendientes } = await db.from("compartidos").select("id", { count: "exact", head: true }).eq("fuente_id", FUENTE).eq("estado", "pendiente");
  if (!fichas.length && !compartidosPendientes) {
    console.log(`No hay búsquedas activas con ${FUENTE} ni links compartidos pendientes.`);
    await registrarSiEsManual(db, "ok", `Ningún seguimiento activo busca en ${NOMBRE[FUENTE] ?? FUENTE}.`);
    return;
  }

  // Avisos que ya tienen detalle: no se vuelven a abrir.
  const { data: conDetalleFilas } = await db.from("avisos").select("id_externo").eq("fuente_id", FUENTE).not("descripcion", "is", null);
  const conDetalle = new Set((conDetalleFilas ?? []).map((x) => x.id_externo));

  const informe: string[] = [`# ${NOMBRE[FUENTE] ?? FUENTE} · pasada ${TIPO}`, ""];
  const notificaciones: Notificacion[] = [];
  const resultados: ResultadoRecoleccion[] = [];
  let fallidas = 0;
  const s = await abrirNavegador();
  try {
    const motivo = await prep.alAbrir?.(s);
    if (motivo) {
      informe.push(`No se corrió: ${motivo}`);
      await registrarSiEsManual(db, "error", motivo);
      fichas.length = 0;
      fallidas = 1;
    }

    for (const [i, b] of fichas.entries()) {
      if (i > 0) await pausa(8000, 15000);
      const { data: pasada, error: e1 } = await db
        .from("pasadas")
        .insert({ fuente_id: FUENTE, busqueda_id: b.id, tipo: TIPO, detalle: { run: RUN ?? null } })
        .select("id")
        .single();
      if (e1) throw new Error(`Supabase (crear pasada): ${e1.message}`);

      let r: ResultadoRecoleccion | undefined;
      let g: ResumenGuardado | undefined;
      let ev: ResumenEvaluacion | undefined;
      let normalizados = 0;
      let juntados = 0;
      const avisosPasada: string[] = [];
      try {
        r = await prep.recolectar(s, b.ficha, {
          maxPaginas: MAX_PAGINAS,
          elegirDetalles: (avisos) =>
            avisos
              .filter((a) => !conDetalle.has(a.id) && evaluar(aNormalizado(datosDeLista(a)), b.ficha).tipo !== "fuera")
              .slice(0, DETALLES),
        });
        resultados.push(r);
        if (r.avisos.length) {
          const ids = r.avisos.map((a) => a.id);
          g = await guardarPasada(db, FUENTE, b.id, b.ficha, r, pasada.id);
          await hashearFotos(db, g.nuevosIds);
          const n = await normalizarPendientes(db, FUENTE, ids);
          normalizados = n.normalizados;
          if (n.error) avisosPasada.push(n.error);
          juntados = await deduplicar(db, g.nuevosIds);
          ev = await evaluarAvisos(db, FUENTE, b.id, b.ficha, ids, g.nuevosIds);
        }
      } catch (e) {
        avisosPasada.push(mensaje(e));
      }

      const errores = [...(r?.errores ?? []), ...avisosPasada];
      const estado = !r || (!r.avisos.length && !r.bloqueo && errores.length) ? "error" : r.bloqueo ? "bloqueo" : "ok";
      if (estado !== "ok") fallidas++;

      if (b.alertas && ev) {
        for (const x of ev.nuevosInteresantes.slice(0, 5)) {
          notificaciones.push({
            titulo: x.veredicto === "calza" ? `Nuevo: ${b.nombre}` : `Nuevo con advertencia: ${b.nombre}`,
            cuerpo: `${x.titulo} · $${miles(x.precio)} · ${NOMBRE[FUENTE] ?? FUENTE}`,
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
          .in("aviso_id", g.bajasDePrecio.map((x) => x.id));
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
      if (estado === "bloqueo" && FUENTE !== "facebook") {
        notificaciones.push({ titulo: `${NOMBRE[FUENTE] ?? FUENTE} bloqueó la pasada`, cuerpo: `${r?.bloqueo}. Se reintenta en la próxima; si se repite, hay que activar el proxy.`, etiqueta: `bloqueo-${FUENTE}` });
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
        diagnostico: r?.diagnostico ? await guardarDiagnostico(db, pasada.id, r.diagnostico) : null,
      };
      await db
        .from("pasadas")
        .update({ estado, fin: new Date().toISOString(), avisos_vistos: r?.avisos.length ?? 0, avisos_nuevos: g?.nuevos ?? 0, paginas: r?.paginasLeidas ?? 0, kb: r?.kb ?? null, detalle })
        .eq("id", pasada.id);

      informe.push(
        `## ${b.nombre}`,
        "",
        `- **Estado:** ${estado}${r?.bloqueo ? ` (${r.bloqueo})` : ""}`,
        `- **Avisos:** ${r?.avisos.length ?? 0} vistos de ${r?.totalAvisos ?? "?"} · ${g?.nuevos ?? 0} nuevos · ${g?.bajasDePrecio.length ?? 0} bajas de precio · ${g?.noVistos ?? 0} no aparecieron`,
        `- **IA:** ${normalizados} normalizados · ${juntados} duplicados juntados`,
        ...(ev ? [`- **Veredictos:** ${ev.veredictos.calza} calzan · ${ev.veredictos.advertencia} con advertencia · ${ev.veredictos.fuera} fuera`] : []),
        `- **Detalles abiertos:** ${r ? Object.keys(r.detalles).length : 0} · **Tráfico:** ${r ? (r.kb / 1024).toFixed(1) : 0} MB`,
        ...(r?.descartadas.length ? [`- **Tarjetas ilegibles:** ${r.descartadas.length} (ej. ${r.descartadas[0]})`] : []),
        ...errores.map((e) => `- **Aviso:** ${e}`),
        ...(ev?.nuevosInteresantes.length
          ? ["", "Nuevos que calzan o entran con advertencia:", "", ...ev.nuevosInteresantes.map((x) => `- [${x.titulo}](${x.url}) · $${miles(x.precio)} · ${x.veredicto}`)]
          : []),
        "",
      );
    }

    // Links compartidos desde el celular (si la sesión sigue sana).
    if (compartidosPendientes && !resultados.some((r) => r.bloqueo) && todas.length) {
      const { data: pasada } = await db.from("pasadas").insert({ fuente_id: FUENTE, tipo: "prueba", detalle: { run: RUN ?? null, compartidos: true } }).select("id").single();
      if (pasada) {
        const hechos = await procesarCompartidos(db, s, FUENTE, todas, pasada.id);
        await db.from("pasadas").update({ estado: "ok", fin: new Date().toISOString(), avisos_vistos: hechos }).eq("id", pasada.id);
        informe.push(`Links compartidos procesados: ${hechos} de ${compartidosPendientes}.`, "");
      }
    }
  } finally {
    await s.cerrar();
  }

  notificaciones.push(...((await prep.alTerminar?.(resultados)) ?? []));
  const push = await enviarPush(db, notificaciones);
  informe.push(`Notificaciones: ${push.enviadas} enviadas de ${notificaciones.length}${push.error ? ` (${push.error})` : ""}.`);

  const texto = informe.join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, texto + "\n");
  console.log(texto);
  if (fichas.length && fallidas >= fichas.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
