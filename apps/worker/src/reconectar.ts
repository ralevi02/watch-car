/**
 * Reconexión de una cuenta de Facebook. El workflow "Facebook · reconectar"
 * levanta una pantalla virtual con vista remota (noVNC) detrás de un túnel
 * temporal de Cloudflare; este script abre ahí el mismo Chrome del worker (mismo
 * proxy e IP fija), deja el link y la clave en Supabase para que la app los
 * muestre, y cuando el usuario toca "Ya inicié sesión" guarda la sesión en Vault.
 * Nunca ve ni guarda la contraseña: solo las cookies de la sesión.
 *
 * Variables: RECONEXION_ID, SUPABASE_URL, SUPABASE_SECRET_KEY, PROXY_URL,
 * VNC_URL y VNC_CLAVE (las pone el workflow).
 */
import { clienteServicio } from "@radar/db";
import { cargarSesion, guardarSesion, haySesion } from "./fuentes/facebook/cuentas.js";
import { detectarMuro } from "./fuentes/facebook/lector.js";
import { abrirNavegador, esperar } from "./lib/navegador.js";
import { revisarProxy } from "./lib/proxy.js";

const ID = process.env.RECONEXION_ID;
const ESPERA_MAXIMA_MS = 25 * 60_000;
const RUN = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null;

async function main() {
  if (!ID) throw new Error("Falta RECONEXION_ID");
  if (!process.env.VNC_URL || !process.env.VNC_CLAVE) throw new Error("Faltan VNC_URL y VNC_CLAVE (las pone el workflow)");
  const db = clienteServicio();
  const actualizar = async (cambios: { estado?: string; url?: string | null; clave?: string | null; error?: string | null; run_url?: string | null }) => {
    const { error } = await db.from("reconexiones").update(cambios).eq("id", ID);
    if (error) throw new Error(`Supabase (reconexión): ${error.message}`);
  };

  const { data: rec, error } = await db.from("reconexiones").select("id, estado, cuenta_id, cuentas_facebook(nombre, secreto_id)").eq("id", ID).single();
  if (error || !rec) throw new Error(`No existe la reconexión ${ID}`);
  if (rec.estado !== "pedida") {
    console.log(`La reconexión está en estado ${rec.estado}; nada que hacer.`);
    return;
  }
  if (!process.env.PROXY_URL) console.warn("Sin PROXY_URL: el login saldrá desde la IP de GitHub, distinta a la del worker.");
  const malProxy = await revisarProxy(process.env.PROXY_URL);
  if (malProxy) {
    await actualizar({ estado: "error", error: malProxy });
    console.log(malProxy);
    return;
  }
  await actualizar({ estado: "abriendo", run_url: RUN });

  // Ventana del tamaño de la pantalla virtual, cómoda de manejar desde el celular.
  const s = await abrirNavegador({ args: ["--window-position=0,0", "--window-size=540,960"], bloquearRecursos: false });
  try {
    const conSesion = rec.cuentas_facebook?.secreto_id ? await cargarSesion(db, s.context, rec.cuenta_id) : false;
    const page = s.context.pages()[0] ?? (await s.context.newPage());
    await page.goto(conSesion ? "https://www.facebook.com/marketplace/" : "https://www.facebook.com/login/", { waitUntil: "domcontentloaded", timeout: 60_000 });

    await actualizar({ estado: "lista", url: `${process.env.VNC_URL}/vnc.html?autoconnect=1&resize=scale&reconnect=1`, clave: process.env.VNC_CLAVE });
    console.log("Vista remota lista; esperando que el usuario inicie sesión.");

    const inicio = Date.now();
    let estado = "lista";
    while (Date.now() - inicio < ESPERA_MAXIMA_MS) {
      await esperar(4000);
      const { data } = await db.from("reconexiones").select("estado").eq("id", ID).single();
      estado = data?.estado ?? estado;
      if (estado !== "lista") break;
    }
    if (estado === "lista") {
      await actualizar({ estado: "vencida", url: null, clave: null, error: "Pasaron 25 minutos sin confirmar el inicio de sesión." });
      return;
    }
    if (estado !== "guardando") {
      await actualizar({ url: null, clave: null });
      return;
    }

    // Confirmar que la sesión sirve para Marketplace antes de guardarla.
    if (!(await haySesion(s.context))) {
      await actualizar({ estado: "error", url: null, clave: null, error: "No se detectó una sesión iniciada. Vuelve a intentarlo." });
      return;
    }
    const p2 = await s.context.newPage();
    await p2.goto("https://www.facebook.com/marketplace/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await esperar(4000);
    const texto = await p2.evaluate(() => document.body?.innerText.slice(0, 4000) ?? "");
    const formulario = await p2.locator('input[name="pass"]').count();
    const muro = detectarMuro(p2.url(), texto, formulario > 0);
    if (muro) {
      await actualizar({ estado: "error", url: null, clave: null, error: muro === "checkpoint" ? "Facebook sigue pidiendo verificar la cuenta." : "Facebook no dejó entrar a Marketplace." });
      return;
    }
    await guardarSesion(db, s.context, rec.cuenta_id);
    await actualizar({ estado: "ok", url: null, clave: null, error: null });
    console.log("Sesión guardada.");
  } catch (e) {
    await actualizar({ estado: "error", url: null, clave: null, error: e instanceof Error ? e.message.split("\n")[0] : String(e) }).catch(() => {});
    throw e;
  } finally {
    await s.cerrar();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
