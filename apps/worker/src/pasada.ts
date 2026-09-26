/**
 * Pasada de Chileautos: por cada búsqueda activa que incluya Chileautos,
 * recolecta los avisos y los guarda en Supabase. Corre en GitHub Actions con
 * cron (chileautos.yml) o a mano.
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, TIPO (corta | completa | prueba),
 * MAX_PAGINAS (5), DETALLES (5 por búsqueda), PROXY_URL (opcional).
 */
import { appendFile } from "node:fs/promises";
import { evaluar, Seguimiento } from "@radar/core";
import { clienteServicio, type Json } from "@radar/db";
import { abrirNavegador, pausa } from "./lib/navegador.js";
import { aNormalizado, datosDeLista, guardarPasada, type ResumenGuardado } from "./fuentes/chileautos/guardar.js";
import { recolectarChileautos, type ResultadoChileautos } from "./fuentes/chileautos/recolector.js";

const TIPO = process.env.TIPO === "corta" || process.env.TIPO === "completa" ? process.env.TIPO : "prueba";
const MAX_PAGINAS = Number(process.env.MAX_PAGINAS || 5);
const DETALLES = Number(process.env.DETALLES || 5);
const RUN = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : undefined;

const miles = (n: number | null) => (n === null ? "?" : n.toLocaleString("es-CL"));

async function main() {
  const db = clienteServicio();

  const { data: busquedas, error } = await db.from("busquedas").select("id, nombre, ficha").eq("activa", true);
  if (error) throw new Error(`Supabase (búsquedas): ${error.message}`);
  const fichas = busquedas.flatMap((b) => {
    const f = Seguimiento.safeParse(b.ficha);
    if (!f.success) {
      console.warn(`Ficha inválida en "${b.nombre}": ${f.error.issues[0]?.message}`);
      return [];
    }
    return f.data.fuentes.includes("chileautos") ? [{ id: b.id, nombre: b.nombre, ficha: f.data }] : [];
  });
  if (!fichas.length) {
    console.log("No hay búsquedas activas con Chileautos.");
    return;
  }

  // Avisos que ya tienen detalle: no se vuelven a abrir.
  const { data: conDetalleFilas } = await db.from("avisos").select("id_externo").eq("fuente_id", "chileautos").not("descripcion", "is", null);
  const conDetalle = new Set((conDetalleFilas ?? []).map((x) => x.id_externo));

  const informe: string[] = [`# Chileautos · pasada ${TIPO}`, ""];
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
      let fallo: string | undefined;
      try {
        r = await recolectarChileautos(s, b.ficha, {
          maxPaginas: MAX_PAGINAS,
          elegirDetalles: (avisos) =>
            avisos
              .filter((a) => !conDetalle.has(a.id) && evaluar(aNormalizado(datosDeLista(a)), b.ficha).tipo !== "fuera")
              .slice(0, DETALLES),
        });
        if (r.avisos.length) g = await guardarPasada(db, b.id, b.ficha, r, pasada.id);
      } catch (e) {
        fallo = e instanceof Error ? e.message : String(e);
      }

      const estado = fallo ? "error" : r?.bloqueo ? "bloqueo" : !r?.avisos.length ? "error" : "ok";
      if (estado !== "ok") fallidas++;
      const detalle: Json = {
        run: RUN ?? null,
        url: r?.url ?? null,
        bloqueo: r?.bloqueo ?? null,
        errores: [...(r?.errores ?? []), ...(fallo ? [fallo] : [])],
        total_portal: r?.totalAvisos ?? null,
        detalles_abiertos: r ? Object.keys(r.detalles).length : 0,
        resumen: g ? { ...g, nuevosInteresantes: g.nuevosInteresantes.map((x) => x.id) } : null,
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
        `- **Avisos:** ${r?.avisos.length ?? 0} vistos de ${r?.totalAvisos ?? "?"} · ${g?.nuevos ?? 0} nuevos · ${g?.bajasDePrecio ?? 0} bajas de precio · ${g?.noVistos ?? 0} no aparecieron`,
        ...(g ? [`- **Veredictos:** ${g.veredictos.calza} calzan · ${g.veredictos.advertencia} con advertencia · ${g.veredictos.fuera} fuera`] : []),
        `- **Detalles abiertos:** ${r ? Object.keys(r.detalles).length : 0} · **Tráfico:** ${r ? (r.kb / 1024).toFixed(1) : 0} MB`,
        ...[...(r?.errores ?? []), ...(fallo ? [fallo] : [])].map((e) => `- **Error:** ${e}`),
        ...(g?.nuevosInteresantes.length
          ? ["", "Nuevos que calzan o entran con advertencia:", "", ...g.nuevosInteresantes.map((x) => `- [${x.titulo}](${x.url}) · $${miles(x.precio)} · ${x.veredicto}`)]
          : []),
        "",
      );
    }
  } finally {
    await s.cerrar();
  }

  const texto = informe.join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, texto + "\n");
  console.log(texto);
  if (fallidas === fichas.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
