import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./database.types.ts";
export type ClienteDb = SupabaseClient<Database>;

/**
 * Cliente con la clave secreta: se salta RLS. Solo para el worker (GitHub
 * Actions) y código de servidor; nunca llega al navegador.
 */
export function clienteServicio(url = process.env.SUPABASE_URL, clave = process.env.SUPABASE_SECRET_KEY): ClienteDb {
  if (!url || !clave) throw new Error("Faltan SUPABASE_URL y SUPABASE_SECRET_KEY");
  return createClient<Database>(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
