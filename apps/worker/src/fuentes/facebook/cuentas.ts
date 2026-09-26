import type { BrowserContext } from "patchright";
import type { ClienteDb } from "@radar/db";

export interface ConfigFacebook {
  rotacion: boolean;
  ciudad: string;
  pasadas_por_dia: number;
}

export async function leerConfig(db: ClienteDb): Promise<{ activa: boolean; config: ConfigFacebook }> {
  const { data } = await db.from("fuentes").select("activa, config").eq("id", "facebook").single();
  const c = (data?.config ?? {}) as Partial<ConfigFacebook>;
  return { activa: data?.activa ?? false, config: { rotacion: c.rotacion ?? true, ciudad: c.ciudad ?? "santiago", pasadas_por_dia: c.pasadas_por_dia ?? 3 } };
}

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

/**
 * Elige la cuenta para esta pasada. Con rotación: la activa que menos pasadas
 * lleva hoy (y hace más tiempo que se usó). Sin rotación: la primera por orden.
 * Respeta el tope de pasadas diarias por cuenta.
 */
export async function elegirCuenta(db: ClienteDb, config: ConfigFacebook) {
  const { data } = await db.from("cuentas_facebook").select("id, nombre, pasadas_hoy, pasadas_fecha, ultima_ok, orden").eq("estado", "activa");
  const cuentas = (data ?? []).map((c) => ({ ...c, usadas: c.pasadas_fecha === hoy() ? c.pasadas_hoy : 0 }));
  const disponibles = cuentas.filter((c) => c.usadas < config.pasadas_por_dia);
  disponibles.sort((a, b) =>
    config.rotacion ? a.usadas - b.usadas || (a.ultima_ok ?? "").localeCompare(b.ultima_ok ?? "") : a.orden - b.orden,
  );
  return disponibles[0] ?? null;
}

/** Carga la sesión guardada (cookies) en el navegador. */
export async function cargarSesion(db: ClienteDb, context: BrowserContext, cuentaId: string): Promise<boolean> {
  const { data, error } = await db.rpc("leer_sesion_facebook", { p_cuenta: cuentaId });
  if (error || !data) return false;
  const estado = JSON.parse(data) as { cookies?: Parameters<BrowserContext["addCookies"]>[0] };
  if (!estado.cookies?.length) return false;
  await context.addCookies(estado.cookies);
  return true;
}

export async function registrarUso(db: ClienteDb, cuentaId: string, resultado: { ok: true } | { ok: false; estado: "necesita_reconexion" | "bloqueada"; error: string }) {
  const { data } = await db.from("cuentas_facebook").select("pasadas_hoy, pasadas_fecha").eq("id", cuentaId).single();
  const usadas = data?.pasadas_fecha === hoy() ? data.pasadas_hoy : 0;
  await db
    .from("cuentas_facebook")
    .update(
      resultado.ok
        ? { ultima_ok: new Date().toISOString(), ultimo_error: null, pasadas_hoy: usadas + 1, pasadas_fecha: hoy() }
        : { estado: resultado.estado, ultimo_error: resultado.error, pasadas_hoy: usadas + 1, pasadas_fecha: hoy() },
    )
    .eq("id", cuentaId);
}

/** Guarda la sesión actual del navegador en Vault (tras reconectar). */
export async function guardarSesion(db: ClienteDb, context: BrowserContext, cuentaId: string) {
  const estado = await context.storageState();
  const { error } = await db.rpc("guardar_sesion_facebook", { p_cuenta: cuentaId, p_sesion: JSON.stringify(estado) });
  if (error) throw new Error(`Supabase (guardar sesión): ${error.message}`);
}

/** ¿Hay sesión iniciada? Facebook deja la cookie c_user cuando se entra. */
export async function haySesion(context: BrowserContext) {
  const cookies = await context.cookies("https://www.facebook.com");
  return cookies.some((c) => c.name === "c_user" && c.value);
}
