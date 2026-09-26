/**
 * Prueba de un lector (FUENTE=chileautos | kavak | yapo) con una ficha (por
 * defecto el V40 Cross Country de ejemplo), sin tocar Supabase: deja en
 * out/<fuente>/ resultado.json y resumen.md, y el resumen en la corrida.
 *
 * Variables: FUENTE, FICHA_JSON (ficha en JSON), MAX_PAGINAS (3), DETALLES (3),
 * BLOQUEAR_TERCEROS ("1" = cortar publicidad; por defecto no).
 */
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EJEMPLO_V40CC, evaluar, leerTitulo, Seguimiento, type AvisoNormalizado, type Veredicto } from "@radar/core";
import { abrirNavegador, OUT } from "./lib/navegador.js";
import { DOMINIOS_CHILEAUTOS, recolectarChileautos } from "./fuentes/chileautos/recolector.js";
import { recolectarKavak } from "./fuentes/kavak/recolector.js";
import type { AvisoPortal, Recolector } from "./fuentes/tipos.js";
import { recolectarYapo } from "./fuentes/yapo/recolector.js";

const ficha = process.env.FICHA_JSON ? Seguimiento.parse(JSON.parse(process.env.FICHA_JSON)) : EJEMPLO_V40CC;
const maxPaginas = Number(process.env.MAX_PAGINAS || 3);
const cuantosDetalles = Number(process.env.DETALLES || 3);
const bloquearTerceros = process.env.BLOQUEAR_TERCEROS === "1";
const FUENTE = process.env.FUENTE || "chileautos";
const RECOLECTORES: Record<string, Recolector> = { chileautos: recolectarChileautos, kavak: recolectarKavak, yapo: recolectarYapo };
const elegido = RECOLECTORES[FUENTE];
if (!elegido) throw new Error(`Fuente sin prueba: ${FUENTE}`);
const recolectar: Recolector = elegido;
const DIR = join(OUT, FUENTE);

/** Lectura mínima sin IA, para evaluar contra la ficha. Gemini la reemplazará. */
function prenormalizar(a: AvisoPortal): AvisoNormalizado & { crossCountry: boolean } {
  const t = leerTitulo(a.titulo);
  return {
    anio: a.anio,
    km: a.km,
    precio: a.precio,
    motor: t.motor,
    traccion: t.traccion,
    caja: a.caja ? (/autom/i.test(a.caja) ? "automatica" : "manual") : undefined,
    crossCountry: t.crossCountry,
  };
}

const ORDEN: Record<Veredicto["tipo"], number> = { calza: 0, advertencia: 1, fuera: 2 };
const ETIQUETA: Record<Veredicto["tipo"], string> = { calza: "✅ Calza", advertencia: "⚠️ Advertencia", fuera: "❌ Fuera" };
const miles = (n?: number) => (n === undefined ? "?" : n.toLocaleString("es-CL"));

async function main() {
  await mkdir(DIR, { recursive: true });
  const s = await abrirNavegador(bloquearTerceros && FUENTE === "chileautos" ? { soloDominios: DOMINIOS_CHILEAUTOS } : {});
  let r;
  try {
    r = await recolectar(s, ficha, {
      maxPaginas,
      // Abrir primero los que calzan y dicen Cross Country: son los que más importa leer bien.
      elegirDetalles: (avisos) =>
        avisos
          .map((a) => ({ a, n: prenormalizar(a), v: evaluar(prenormalizar(a), ficha) }))
          .filter((x) => x.v.tipo !== "fuera")
          .sort((x, y) => Number(y.n.crossCountry) - Number(x.n.crossCountry) || ORDEN[x.v.tipo] - ORDEN[y.v.tipo])
          .slice(0, cuantosDetalles)
          .map((x) => x.a),
    });
  } finally {
    await s.cerrar();
  }

  const filas = r.avisos
    .map((a) => ({ a, n: prenormalizar(a), v: evaluar(prenormalizar(a), ficha) }))
    .sort((x, y) => ORDEN[x.v.tipo] - ORDEN[y.v.tipo] || (x.a.precio ?? 0) - (y.a.precio ?? 0));
  const cuenta = (t: Veredicto["tipo"]) => filas.filter((f) => f.v.tipo === t).length;

  const lineas = [
    `# ${FUENTE} · prueba del lector`,
    ``,
    `Ficha: **${ficha.nombre}** · ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })} · Origen: ${process.env.GITHUB_ACTIONS ? "GitHub Actions" : "local"} · Proxy: ${s.usaProxy ? "sí" : "no"} · Terceros bloqueados: ${bloquearTerceros ? "sí" : "no"}`,
    ``,
    `Búsqueda: ${r.url}`,
    ``,
    `- **Bloqueo:** ${r.bloqueo ?? "no"}`,
    `- **Avisos:** ${r.avisos.length} leídos de ${r.totalAvisos ?? "?"} (páginas ${r.paginasLeidas} de ${r.paginasTotales})`,
    `- **Veredicto (sin IA):** ${cuenta("calza")} calzan · ${cuenta("advertencia")} con advertencia · ${cuenta("fuera")} fuera`,
    `- **Detalles abiertos:** ${Object.keys(r.detalles).length}`,
    `- **Tráfico:** ${(r.kb / 1024).toFixed(1)} MB en ${(r.ms / 1000).toFixed(0)} s`,
    ...(r.descartadas.length ? [`- **Tarjetas ilegibles:** ${r.descartadas.length} (ej. ${r.descartadas[0]})`] : []),
    ...r.errores.map((e) => `- **Error:** ${e}`),
    ``,
    `## Avisos`,
    ``,
    `| Veredicto | Año | Título | Km | Precio | Vendedor | Región | CC en título |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...filas.map(({ a, n, v }) =>
      [
        v.tipo === "calza" ? ETIQUETA.calza : `${ETIQUETA[v.tipo]}: ${v.motivos.join("; ")}`,
        a.anio ?? "?",
        `[${a.titulo}](${a.url})${a.destacado ? " (destacado)" : ""}`,
        miles(a.km),
        `$${miles(a.precio)}`,
        a.vendedor ?? a.tipoVendedor ?? "?",
        a.region ?? "?",
        n.crossCountry ? "Sí" : "No",
      ].join(" | "),
    ).map((f) => `| ${f} |`),
    ``,
    `## Detalles`,
    ``,
    ...Object.entries(r.detalles).flatMap(([id, d]) => {
      const a = r.avisos.find((x) => x.id === id);
      const clave = ["Versión", "Tracción", "Transmisión", "Comuna", "Color exterior"]
        .filter((k) => d.datos[k])
        .map((k) => `${k}: ${d.datos[k]}`);
      return [
        `**${a?.titulo ?? id}** · ${Object.keys(d.datos).length} datos`,
        ``,
        `- ${clave.join(" · ") || "Sin datos clave"}`,
        `- Descripción: ${d.descripcion ? d.descripcion.replace(/\s+/g, " ").slice(0, 400) + (d.descripcion.length > 400 ? "…" : "") : "no encontrada"}`,
        ``,
      ];
    }),
  ];

  const resumen = lineas.join("\n");
  await writeFile(join(DIR, "resultado.json"), JSON.stringify({ ficha, ...r }, null, 2));
  await writeFile(join(DIR, "resumen.md"), resumen);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, resumen + "\n");
  console.log(resumen);
  if (r.bloqueo || r.avisos.length === 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
