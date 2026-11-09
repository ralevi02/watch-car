/**
 * Worker del homelab: corre todas las fuentes, los remates y las fotos con IA con
 * sus horarios en hora de Chile y la IP de la casa, toma lo que la app pide a mano
 * (corridas_pedidas) y las reconexiones, y deja un latido en Supabase para que
 * resumen.yml avise si el homelab se cae. Una tarea a la vez: comparten el Chrome
 * de la pantalla virtual :99.
 *
 * Variables: las de pasada.ts, más VNC_URL_PUBLICA (la URL de `tailscale serve`
 * hacia websockify) y KUMA_<FUENTE> opcionales (push de Uptime Kuma).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { clienteServicio } from "@radar/db";

const db = clienteServicio();
const PEDIBLES = ["chileautos", "facebook", "kavak", "yapo", "mercadolibre", "brunofritsch", "remates"] as const;
type Fuente = (typeof PEDIBLES)[number] | "fotos-ia";
const SCRIPT: Partial<Record<Fuente, string>> = { remates: "remates", "fotos-ia": "fotos-ia" };
const BARRIDO_FACEBOOK = { FB_BARRIDO: "completo", MAX_PAGINAS: "80", DETALLES: "15" };

const PROGRAMA: { fuente: Fuente; horas: string[]; env?: Record<string, string> }[] = [
  { fuente: "chileautos", horas: ["08:23", "11:23", "14:23", "17:23", "20:23", "23:23"], env: { MAX_PAGINAS: "5", DETALLES: "5" } },
  { fuente: "remates", horas: ["10:30"] },
  { fuente: "fotos-ia", horas: ["12:00"], env: { FOTOS_IA_MAX: "10" } },
  { fuente: "brunofritsch", horas: ["12:05", "19:35"] },
  { fuente: "kavak", horas: ["12:10", "19:40"] },
  { fuente: "yapo", horas: ["12:15", "19:45"] },
  { fuente: "mercadolibre", horas: ["12:20", "19:50"] },
  { fuente: "facebook", horas: ["07:30"], env: BARRIDO_FACEBOOK },
  { fuente: "facebook", horas: ["13:00", "20:30"], env: { MAX_PAGINAS: "4", DETALLES: "8" } },
];

type Tarea = { tipo: "pasada"; fuente: Fuente; pedidoId?: string; env?: Record<string, string> } | { tipo: "reconexion"; id: string };

const cola: Tarea[] = [];
const enCola = new Set<string>();
const disparados = new Set<string>();
let actual: ChildProcess | null = null;
let ocupado = false;

const clave = (t: Tarea) => (t.tipo === "pasada" ? `pasada:${t.fuente}` : `reconexion:${t.id}`);

function encolar(t: Tarea) {
  if (enCola.has(clave(t))) return false;
  enCola.add(clave(t));
  if (t.tipo === "reconexion") cola.unshift(t);
  else cola.push(t);
  return true;
}

function horaChile(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

function revisarPrograma() {
  const { dia, hora } = horaChile();
  for (const p of PROGRAMA) {
    const marca = `${p.fuente}@${dia} ${hora}`;
    if (p.horas.includes(hora) && !disparados.has(marca)) {
      disparados.add(marca);
      if (encolar({ tipo: "pasada", fuente: p.fuente, env: { TIPO: p.env === BARRIDO_FACEBOOK ? "completa" : "corta", ...p.env } })) console.log(`Programada: ${p.fuente} (${hora})`);
    }
  }
  if (disparados.size > 500) disparados.clear();
}

async function revisarPedidos() {
  const { data: pedidos } = await db.from("corridas_pedidas").select("id, fuente").eq("estado", "pedida").order("pedida_en").limit(10);
  for (const p of pedidos ?? []) {
    if (!(PEDIBLES as readonly string[]).includes(p.fuente)) continue;
    const t: Tarea = { tipo: "pasada", fuente: p.fuente as Fuente, pedidoId: p.id, env: { TIPO: "prueba", MANUAL: "1", ...(p.fuente === "facebook" ? BARRIDO_FACEBOOK : {}) } };
    if (encolar(t)) await db.from("corridas_pedidas").update({ estado: "corriendo", tomada_en: new Date().toISOString() }).eq("id", p.id);
    else await db.from("corridas_pedidas").update({ estado: "ok", terminada_en: new Date().toISOString(), error: "Ya estaba en cola" }).eq("id", p.id);
  }
  const { data: recs } = await db
    .from("reconexiones")
    .select("id")
    .eq("estado", "pedida")
    .gt("creada_en", new Date(Date.now() - 15 * 60_000).toISOString())
    .order("creada_en")
    .limit(3);
  for (const r of recs ?? []) encolar({ tipo: "reconexion", id: r.id });
}

function correr(comando: string, args: string[], env: Record<string, string>, limiteMs: number): Promise<number> {
  return new Promise((listo) => {
    const hijo = spawn(comando, args, { env: { ...process.env, DISPLAY: ":99", HEADLESS: "0", IP_RESIDENCIAL: "1", ...env }, stdio: "inherit" });
    actual = hijo;
    const reloj = setTimeout(() => hijo.kill("SIGKILL"), limiteMs);
    hijo.on("exit", (codigo) => {
      clearTimeout(reloj);
      actual = null;
      listo(codigo ?? 1);
    });
  });
}

async function avisarKuma(fuente: string, ok: boolean, msg: string) {
  const url = process.env[`KUMA_${fuente.toUpperCase()}`];
  if (!url) return;
  const u = new URL(url);
  u.searchParams.set("status", ok ? "up" : "down");
  u.searchParams.set("msg", msg.slice(0, 100));
  await fetch(u, { signal: AbortSignal.timeout(10_000) }).catch(() => {});
}

async function ejecutar(t: Tarea) {
  if (t.tipo === "pasada") {
    console.log(`Corriendo ${t.fuente}${t.pedidoId ? " (pedida desde la app)" : ""}`);
    const limite = t.env?.FB_BARRIDO === "completo" ? 180 * 60_000 : 50 * 60_000;
    const codigo = await correr("pnpm", [SCRIPT[t.fuente] ?? "pasada"], { FUENTE: t.fuente, ...t.env }, limite);
    const ok = codigo === 0;
    if (t.pedidoId)
      await db
        .from("corridas_pedidas")
        .update({ estado: ok ? "ok" : "error", terminada_en: new Date().toISOString(), error: ok ? null : `La pasada terminó con código ${codigo}` })
        .eq("id", t.pedidoId);
    await avisarKuma(t.fuente, ok, ok ? "OK" : `código ${codigo}`);
    return;
  }
  const claveVnc = randomBytes(4).toString("hex");
  const vnc = spawn("x11vnc", ["-display", ":99", "-passwd", claveVnc, "-forever", "-shared", "-rfbport", "5900", "-quiet"], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1500));
  try {
    await correr("pnpm", ["reconectar"], { RECONEXION_ID: t.id, VNC_URL: process.env.VNC_URL_PUBLICA ?? "", VNC_CLAVE: claveVnc }, 35 * 60_000);
  } finally {
    vnc.kill();
  }
}

async function bucle() {
  if (ocupado) return;
  const t = cola.shift();
  if (!t) return;
  ocupado = true;
  try {
    await ejecutar(t);
  } catch (e) {
    console.error(e);
  } finally {
    enCola.delete(clave(t));
    ocupado = false;
  }
}

async function latido() {
  await db.from("ajustes").upsert({ clave: "latido_casa", valor: { en: new Date().toISOString(), cola: cola.length, ocupado }, actualizado_en: new Date().toISOString() });
}

await db
  .from("corridas_pedidas")
  .update({ estado: "error", terminada_en: new Date().toISOString(), error: "El homelab se reinició mientras corría" })
  .eq("estado", "corriendo");
await db
  .from("reconexiones")
  .update({ estado: "vencida", error: "El homelab no alcanzó a abrirla" })
  .eq("estado", "pedida")
  .lt("creada_en", new Date(Date.now() - 15 * 60_000).toISOString());
console.log(`Worker de la casa listo. Hora de Chile: ${horaChile().hora}.`);
await latido();

setInterval(revisarPrograma, 20_000);
setInterval(() => revisarPedidos().catch((e) => console.error("Supabase:", e)), 20_000);
setInterval(() => bucle().catch(console.error), 5_000);
setInterval(() => latido().catch(() => {}), 5 * 60_000);
await revisarPedidos();

for (const senal of ["SIGTERM", "SIGINT"] as const)
  process.on(senal, () => {
    actual?.kill("SIGTERM");
    process.exit(0);
  });
