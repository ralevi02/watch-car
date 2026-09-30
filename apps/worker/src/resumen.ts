/**
 * Resumen diario de avisos (cuando en la app se elige "Un resumen al día"):
 * una sola notificación con lo nuevo que calza y las bajas de precio desde el
 * resumen anterior. Corre cada hora en GitHub Actions y solo manda a la hora elegida.
 *
 * También avisa si una fuente lleva muchas horas sin traer avisos y, los
 * domingos, manda el resumen de la semana por ficha.
 *
 * Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_URL.
 * FORZAR=1 manda el resumen del día aunque no sea la hora; SEMANAL=1, el de la semana.
 */
import { resolve } from "node:path";
import { clienteServicio, type Json } from "@radar/db";
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
const ahoraChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
const horaChile = ahoraChile.getHours();
const leerAjuste = async <T,>(clave: string) => ((await db.from("ajustes").select("valor").eq("clave", clave).maybeSingle()).data?.valor ?? null) as T | null;
// En seco (PUSH_SECO=1) no se guarda nada: así una prueba no bloquea el aviso de verdad.
const guardarAjuste = async (clave: string, valor: Json) => {
  if (process.env.PUSH_SECO !== "1") await db.from("ajustes").upsert({ clave, valor, actualizado_en: new Date().toISOString() });
};

// ── 1. Fuente caída: una fuente activa que lleva muchas horas sin traer avisos (se avisa una vez al día) ──
const UMBRAL_HORAS: Record<string, number> = { chileautos: 12, facebook: 30, remates: 50 };
const { data: fuentes } = await db.from("fuentes").select("id, nombre, activa").eq("activa", true);
const alertadas = (await leerAjuste<Record<string, string>>("alerta_fuentes")) ?? {};
const caidas: string[] = [];
for (const f of fuentes ?? []) {
  const { data: ultima } = await db.from("pasadas").select("inicio").eq("fuente_id", f.id).eq("estado", "ok").gt("avisos_vistos", 0).order("inicio", { ascending: false }).limit(1).maybeSingle();
  // Una fuente que nunca trajo nada (MercadoLibre sin conectar, por ejemplo) no se reporta como caída.
  if (!ultima) continue;
  const horas = (Date.now() - new Date(ultima.inicio).getTime()) / 3_600_000;
  const umbral = UMBRAL_HORAS[f.id] ?? 36;
  const avisadaHace = alertadas[f.id] ? (Date.now() - new Date(alertadas[f.id]!).getTime()) / 3_600_000 : Infinity;
  if (horas > umbral && avisadaHace > 24) {
    caidas.push(`${f.nombre} (${Math.round(horas)} h)`);
    alertadas[f.id] = new Date().toISOString();
  }
}
if (caidas.length) {
  const r = await enviarPush(db, [
    { titulo: caidas.length === 1 ? "Una fuente no trae avisos" : "Fuentes sin avisos", cuerpo: `Sin avisos nuevos desde hace rato: ${caidas.join(", ")}. Revisa el registro en Fuentes.`, url: APP_URL ? `${APP_URL}/fuentes?seccion=registro` : undefined, etiqueta: "fuentes-caidas" },
  ]);
  await guardarAjuste("alerta_fuentes", alertadas);
  console.log(`Fuentes caídas: ${caidas.join(", ")} (aviso a ${r.enviadas} teléfonos).`);
}

// ── 2. Resumen de la semana: el domingo a la hora de los avisos (en cualquier modo) ──
const semanal = await leerAjuste<{ en?: string }>("semanal_enviado");
const haceUnaSemana = Date.now() - 7 * 86_400_000;
if ((ahoraChile.getDay() === 0 && horaChile === hora && (!semanal?.en || new Date(semanal.en).getTime() < Date.now() - 5 * 86_400_000)) || process.env.SEMANAL === "1") {
  const { data: fichas } = await db.from("busquedas").select("id, nombre").eq("activa", true);
  const lineas: string[] = [];
  for (const b of fichas ?? []) {
    const { data: filas } = await db.from("resultados").select("avisos!inner(id, primera_vez, ultima_vez, estado, precio)").eq("busqueda_id", b.id).neq("veredicto", "fuera");
    const avisos = (filas ?? []).map((f) => f.avisos);
    const nuevos = avisos.filter((a) => new Date(a.primera_vez).getTime() > haceUnaSemana).length;
    const idos = avisos.filter((a) => a.estado !== "activo" && new Date(a.ultima_vez).getTime() > haceUnaSemana).length;
    // Precio mediano de los que siguen, hoy y hace una semana (según el historial).
    const activos = avisos.filter((a) => a.estado === "activo" && a.precio);
    let tendencia = "";
    if (activos.length >= 4) {
      const { data: hist } = await db.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", activos.map((a) => a.id)).lte("visto_en", new Date(haceUnaSemana).toISOString()).order("visto_en");
      const antes = new Map<string, number>();
      for (const h of hist ?? []) antes.set(h.aviso_id, h.precio);
      const pares = activos.filter((a) => antes.has(a.id));
      if (pares.length >= 4) {
        const med = (xs: number[]) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)]!;
        const cambio = (med(pares.map((a) => a.precio!)) - med(pares.map((a) => antes.get(a.id)!))) / med(pares.map((a) => antes.get(a.id)!));
        if (Math.abs(cambio) >= 0.01) tendencia = `, precio ${cambio < 0 ? "bajando" : "subiendo"} ${Math.abs(Math.round(cambio * 100))}%`;
      }
    }
    if (nuevos || idos || tendencia) lineas.push(`${b.nombre}: ${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"}, ${idos} ${idos === 1 ? "se fue" : "se fueron"}${tendencia}`);
  }
  if (lineas.length) {
    const r = await enviarPush(db, [{ titulo: "Tu semana", cuerpo: lineas.slice(0, 3).join(". ") + ".", url: APP_URL ? `${APP_URL}/resultados` : undefined, etiqueta: "semana" }]);
    console.log(`Resumen semanal: ${lineas.join(" | ")} (a ${r.enviadas} teléfonos).`);
  }
  await guardarAjuste("semanal_enviado", { en: new Date().toISOString() });
}

// ── Recordatorios de "Mi auto": el día 1 del mes de la revisión técnica, y en marzo el permiso y el SOAP ──
const MES_REVISION: Record<string, number> = { "9": 1, "0": 2, "1": 4, "2": 5, "3": 6, "4": 7, "5": 8, "6": 9, "7": 10, "8": 11 };
if (ahoraChile.getDate() === 1 && horaChile === hora) {
  const mio = await leerAjuste<{ patente?: string }>("mi_auto");
  const { data: comprado } = await db.from("marcas").select("auto_id").eq("contacto", "comprado").limit(1).maybeSingle();
  const yaEsteMes = (await leerAjuste<{ mes?: string }>("recordatorio_mes"))?.mes === `${ahoraChile.getFullYear()}-${ahoraChile.getMonth() + 1}`;
  if (comprado && !yaEsteMes) {
    const mes = ahoraChile.getMonth() + 1;
    const digito = mio?.patente?.replace(/\D/g, "").at(-1);
    const notas = [
      ...(digito && MES_REVISION[digito] === mes ? ["Este mes te toca la revisión técnica de tu auto."] : []),
      ...(mes === 3 ? ["Este mes se paga el permiso de circulación y el SOAP."] : []),
    ];
    if (notas.length) {
      await enviarPush(db, [{ titulo: "Mi auto", cuerpo: notas.join(" "), url: APP_URL ? `${APP_URL}/` : undefined, etiqueta: "mi-auto" }]);
      console.log(`Recordatorio de Mi auto: ${notas.join(" ")}`);
    }
    await guardarAjuste("recordatorio_mes", { mes: `${ahoraChile.getFullYear()}-${ahoraChile.getMonth() + 1}` });
  }
}

// ── 3. Resumen del día (solo en modo resumen, a la hora elegida) ──
if (!FORZAR && (modo !== "resumen" || horaChile !== hora)) {
  console.log(`Resumen del día: nada que hacer (modo ${modo}, hora elegida ${hora}, ahora son las ${horaChile}).`);
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
await guardarAjuste("resumen_enviado", { en: new Date().toISOString() });
