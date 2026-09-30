import type { ClienteDb } from "@radar/db";
import type { BrowserContext } from "patchright";

/**
 * Sesión del sitio de MercadoLibre (cookies), cifrada en Vault como secreto de la
 * app. Se inicia desde la app con la vista remota, igual que Facebook. Nunca se
 * guarda la contraseña.
 */
export const SECRETO_SESION = "mercadolibre_sesion";

/** El sitio manda a verificar la cuenta o a iniciar sesión cuando no hay sesión válida. */
export const pideCuenta = (url: string) => /account-verification|\/lgz\/|\/login\b|registration/i.test(url);

export async function haySesionML(db: ClienteDb): Promise<boolean> {
  const { data } = await db.from("secretos_app").select("nombre").eq("nombre", SECRETO_SESION).maybeSingle();
  return Boolean(data);
}

export async function cargarSesionML(db: ClienteDb, context: BrowserContext): Promise<boolean> {
  const { data, error } = await db.rpc("leer_secreto_app", { p_nombre: SECRETO_SESION });
  if (error || !data) return false;
  const estado = JSON.parse(data) as { cookies?: Parameters<BrowserContext["addCookies"]>[0] };
  if (!estado.cookies?.length) return false;
  await context.addCookies(estado.cookies);
  return true;
}

export async function guardarSesionML(db: ClienteDb, context: BrowserContext) {
  const estado = await context.storageState();
  const { error } = await db.rpc("guardar_secreto_app", { p_nombre: SECRETO_SESION, p_valor: JSON.stringify({ cookies: estado.cookies }) });
  if (error) throw new Error(`Supabase (guardar sesión de MercadoLibre): ${error.message}`);
}
