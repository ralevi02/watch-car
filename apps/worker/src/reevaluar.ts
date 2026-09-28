/**
 * Vuelve a evaluar todos los avisos guardados contra las fichas activas, sin
 * entrar a los portales ni llamar a la IA. Sirve cuando cambian las reglas de
 * evaluar() o la ficha. También marca con el modelo por confirmar los "V40"
 * o "V60" a secas de Facebook que se normalizaron antes de esa regla.
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY.
 */
import { resolve } from "node:path";
import { puedeSerCrossCountry, Seguimiento } from "@radar/core";
import { clienteServicio } from "@radar/db";
import { evaluarAvisos } from "./guardar.js";

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* en GitHub Actions no hay .env */
}
const db = clienteServicio();

const { data: fb } = await db.from("avisos").select("id, modelo, por_confirmar").eq("fuente_id", "facebook");
let marcados = 0;
for (const a of fb ?? []) {
  if (!a.modelo || !puedeSerCrossCountry(a.modelo) || a.por_confirmar.includes("modelo")) continue;
  await db.from("avisos").update({ por_confirmar: [...a.por_confirmar, "modelo"] }).eq("id", a.id);
  marcados++;
}
console.log(`Facebook: ${marcados} avisos quedaron con el modelo por confirmar`);

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
