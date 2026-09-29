/**
 * Vuelve a evaluar todos los avisos guardados contra las fichas activas, sin
 * entrar a los portales ni llamar a la IA. Sirve cuando cambian las reglas de
 * evaluar() o la ficha. También ajusta la duda de modelo (dudaDeModelo) en lo
 * que se normalizó antes de esa regla.
 *
 * Con --ia, antes de evaluar vuelve a normalizar con Gemini los avisos que hoy
 * aparecen en Resultados y no tienen tipo (auto, repuesto…): sirve cuando cambian
 * las instrucciones de la IA. Gasta cuota de Gemini (un lote cada 20 avisos).
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY.
 */
import { resolve } from "node:path";
import { dudaDeModelo, Seguimiento } from "@radar/core";
import { clienteServicio } from "@radar/db";
import { evaluarAvisos, normalizarPendientes } from "./guardar.js";

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* en GitHub Actions no hay .env */
}
const db = clienteServicio();

// La duda de modelo con la regla actual: no se duda si el aviso dice Cross Country; en Facebook un V40 a secas sí.
const { data: todos } = await db.from("avisos").select("id, fuente_id, titulo, descripcion, modelo, por_confirmar").not("modelo", "is", null);
const { data: corregidos } = await db.from("correcciones").select("aviso_id").eq("campo", "modelo");
const yaCorregido = new Set((corregidos ?? []).map((c) => c.aviso_id));
let cambiados = 0;
for (const a of todos ?? []) {
  if (yaCorregido.has(a.id)) continue;
  const nuevo = dudaDeModelo(a.modelo!, a.por_confirmar, a, a.fuente_id === "facebook");
  if (nuevo.length === a.por_confirmar.length && nuevo.every((c) => a.por_confirmar.includes(c))) continue;
  await db.from("avisos").update({ por_confirmar: nuevo }).eq("id", a.id);
  cambiados++;
}
console.log(`Duda de modelo ajustada en ${cambiados} avisos`);

if (process.argv.includes("--ia")) {
  const { data: visibles } = await db.from("resultados").select("avisos!inner(id_externo, fuente_id, tipo)").neq("veredicto", "fuera").is("avisos.tipo", null);
  const porFuente = new Map<string, Set<string>>();
  for (const r of visibles ?? []) porFuente.set(r.avisos.fuente_id, (porFuente.get(r.avisos.fuente_id) ?? new Set()).add(r.avisos.id_externo));
  for (const [fuente, ids] of porFuente) {
    const n = await normalizarPendientes(db, fuente, [...ids], { forzar: true });
    console.log(`${fuente}: ${n.normalizados} de ${ids.size} avisos normalizados de nuevo${n.error ? ` (${n.error})` : ""}`);
  }
}

const { data: busquedas } = await db.from("busquedas").select("id, nombre, ficha").eq("activa", true);
for (const b of busquedas ?? []) {
  const ficha = Seguimiento.safeParse(b.ficha);
  if (!ficha.success) continue;
  const totales = { calza: 0, advertencia: 0, fuera: 0 };
  for (const fuente of ficha.data.fuentes) {
    const { data: avisos } = await db.from("avisos").select("id_externo").eq("fuente_id", fuente).neq("estado", "vendido");
    const ids = (avisos ?? []).map((a) => a.id_externo);
    for (let i = 0; i < ids.length; i += 150) {
      const r = await evaluarAvisos(db, fuente, b.id, ficha.data, ids.slice(i, i + 150), []);
      for (const k of Object.keys(totales) as (keyof typeof totales)[]) totales[k] += r.veredictos[k];
    }
  }
  console.log(`${b.nombre}: ${totales.calza} calzan, ${totales.advertencia} para revisar, ${totales.fuera} fuera`);
}
