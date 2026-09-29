/**
 * Resumen diario de avisos (cuando en la app se elige "Un resumen al día"):
 * una sola notificación con lo nuevo que calza y las bajas de precio desde el
 * resumen anterior. Corre cada hora en GitHub Actions y solo manda a la hora elegida.
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_URL.
 * FORZAR=1 lo manda aunque no sea la hora.
 */
import { resolve } from "node:path";
import { clienteServicio } from "@radar/db";
import { enviarPush, leerModoAvisos } from "./push.js";

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* en GitHub Actions no hay .env */
}
const db = clienteServicio();
const APP_URL = process.env.APP_URL;
const FORZAR = process.env.FORZAR === "1";

const { modo, hora } = await leerModoAvisos(db);
const horaChile = Number(new Intl.DateTimeFormat("es-CL", { hour: "numeric", hourCycle: "h23", timeZone: "America/Santiago" }).format(new Date()));
if (!FORZAR && (modo !== "resumen" || horaChile !== hora)) {
  console.log(`Nada que hacer: modo ${modo}, hora elegida ${hora}, ahora son las ${horaChile}.`);
  process.exit(0);
}

const { data: ultimo } = await db.from("ajustes").select("valor").eq("clave", "resumen_enviado").maybeSingle();
const desde = (ultimo?.valor as { en?: string } | null)?.en ?? new Date(Date.now() - 24 * 3600_000).toISOString();

// Lo nuevo que calza o entra con advertencia, sin descartados.
const { data: nuevos } = await db
  .from("resultados")
  .select("veredicto, avisos!inner(id, auto_id, primera_vez, estado)")
  .neq("veredicto", "fuera")
  .gt("avisos.primera_vez", desde)
  .neq("avisos.estado", "vendido");
const { data: descartados } = await db.from("marcas").select("auto_id").eq("estado", "descartado");
const fuera = new Set((descartados ?? []).map((d) => d.auto_id));
const autos = new Map<string, "calza" | "advertencia">();
for (const n of nuevos ?? []) {
  const id = n.avisos.auto_id ?? n.avisos.id;
  if (fuera.has(id)) continue;
  if (n.veredicto === "calza" || !autos.has(id)) autos.set(id, n.veredicto === "calza" ? "calza" : "advertencia");
}
const calzan = [...autos.values()].filter((v) => v === "calza").length;
const revisar = autos.size - calzan;

// Bajas de precio desde el último resumen, de avisos que siguen en Resultados.
const { data: precios } = await db.from("precios").select("aviso_id, precio, visto_en").gt("visto_en", desde);
let bajas = 0;
if (precios?.length) {
  const ids = [...new Set(precios.map((p) => p.aviso_id))];
  const { data: visibles } = await db.from("resultados").select("aviso_id").neq("veredicto", "fuera").in("aviso_id", ids);
  const enResultados = new Set((visibles ?? []).map((v) => v.aviso_id));
  const { data: antes } = await db.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", ids).lte("visto_en", desde).order("visto_en", { ascending: false });
  for (const id of ids) {
    if (!enResultados.has(id)) continue;
    const previo = antes?.find((p) => p.aviso_id === id)?.precio;
    const ahora = precios.filter((p) => p.aviso_id === id).at(-1)?.precio;
    if (previo && ahora && ahora < previo) bajas++;
  }
}

const partes = [
  calzan ? `${calzan} ${calzan === 1 ? "nuevo que calza" : "nuevos que calzan"}` : null,
  revisar ? `${revisar} para revisar` : null,
  bajas ? `${bajas} ${bajas === 1 ? "bajó" : "bajaron"} de precio` : null,
].filter(Boolean);

if (!partes.length) {
  console.log("Sin novedades desde el último resumen: no se manda nada.");
} else {
  const r = await enviarPush(db, [
    { titulo: "Resumen del día", cuerpo: `${partes.join(", ")}.`, url: APP_URL ? `${APP_URL}/resultados?filtro=${calzan || revisar ? "nuevos" : "bajo"}` : undefined, etiqueta: "resumen" },
  ]);
  console.log(`Resumen: ${partes.join(", ")}. Enviado a ${r.enviadas} teléfonos${r.error ? ` (${r.error})` : ""}.`);
}
await db.from("ajustes").upsert({ clave: "resumen_enviado", valor: { en: new Date().toISOString() } });
