/**
 * Prueba local de la normalización con Gemini sobre un resultado.json de la
 * prueba del lector (no vuelve a entrar a Chileautos).
 *
 * Uso: pnpm normalizar:prueba ruta/a/resultado.json
 * Lee GOOGLE_GENERATIVE_AI_API_KEY del .env de la raíz.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EJEMPLO_V40CC, evaluar, Seguimiento } from "@radar/core";
import { OUT } from "./lib/navegador.js";
import { datosDeDetalle, datosDeLista } from "./guardar.js";
import type { AvisoLista, DetalleChileautos } from "./fuentes/chileautos/lector.js";
import { normalizar, type EntradaNormalizacion } from "./normalizar.js";

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* sin .env */
}

const ruta = process.argv[2];
if (!ruta) throw new Error("Falta la ruta al resultado.json");
const datos = JSON.parse(await readFile(ruta, "utf8")) as { ficha?: unknown; avisos: AvisoLista[]; detalles: Record<string, DetalleChileautos> };
const ficha = datos.ficha ? Seguimiento.parse(datos.ficha) : EJEMPLO_V40CC;

const entradas: EntradaNormalizacion[] = datos.avisos.map((a) => {
  const l = datosDeLista(a);
  const d = datos.detalles[a.id] ? datosDeDetalle(datos.detalles[a.id]!) : undefined;
  return {
    id: a.id,
    titulo: a.titulo,
    precio: l.precio,
    anio: l.anio,
    km: l.km,
    caja: a.caja,
    combustible: l.combustible,
    carroceria: l.carroceria,
    region: l.region,
    tipoVendedor: a.tipoVendedor,
    vendedor: l.vendedor,
    comuna: d?.comuna,
    version: datos.detalles[a.id]?.datos["Versión"],
    traccion: datos.detalles[a.id]?.datos["Tracción"],
    descripcion: d?.descripcion,
  };
});

const t0 = Date.now();
const normalizados = await normalizar(entradas);
const seg = ((Date.now() - t0) / 1000).toFixed(0);

const filas = datos.avisos.map((a) => {
  const n = normalizados.get(a.id);
  const v = n
    ? evaluar(
        { modelo: n.modelo, porConfirmar: n.porConfirmar, anio: n.anio ?? undefined, km: n.km ?? undefined, precio: a.precio, motor: n.motor ?? undefined, traccion: n.traccion ?? undefined, caja: n.caja ?? undefined },
        ficha,
      )
    : undefined;
  return { a, n, v };
});
const orden = { calza: 0, advertencia: 1, fuera: 2 } as const;
filas.sort((x, y) => (x.v ? orden[x.v.tipo] : 3) - (y.v ? orden[y.v.tipo] : 3));

const lineas = [
  `# Normalización con Gemini · prueba`,
  ``,
  `${normalizados.size} de ${datos.avisos.length} avisos normalizados en ${seg} s. Ficha: ${ficha.nombre}.`,
  ``,
  `| Veredicto | Título | Modelo | Versión | Motor | Caja | Tracción | Alertas | Por confirmar |`,
  `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  ...filas.map(({ a, n, v }) =>
    `| ${v ? (v.tipo === "calza" ? "Calza" : `${v.tipo}: ${v.motivos.join("; ")}`) : "sin normalizar"} | ${a.titulo} | ${n?.modelo ?? ""} | ${n?.version ?? ""} | ${n?.motor ?? ""} | ${n?.caja ?? ""} | ${n?.traccion ?? ""} | ${n ? [...n.alertas, n.alertaDetalle].filter(Boolean).join(": ") : ""} | ${n?.porConfirmar.join(", ") ?? ""} |`,
  ),
];
const dir = join(OUT, "normalizacion");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "resumen.md"), lineas.join("\n"));
await writeFile(join(dir, "normalizados.json"), JSON.stringify(Object.fromEntries(normalizados), null, 2));
console.log(lineas.join("\n"));
