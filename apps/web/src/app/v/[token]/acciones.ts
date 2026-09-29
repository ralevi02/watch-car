"use server";

import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/server";

const Opinion = z.object({
  token: z.string().regex(/^[0-9a-f]{24}$/),
  nombre: z.string().trim().min(1).max(40),
  voto: z.enum(["me_gusta", "no_me_convence", "dudas"]),
  texto: z.string().trim().max(1000),
});

/** Quien recibe el link deja su opinión (sin cuenta). La base valida el token y pone tope por link. */
export async function opinar(entrada: z.infer<typeof Opinion>): Promise<{ ok: boolean; error?: string }> {
  const o = Opinion.safeParse(entrada);
  if (!o.success) return { ok: false, error: "Escribe tu nombre y elige una opción." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("opinar", { p_token: o.data.token, p_nombre: o.data.nombre, p_voto: o.data.voto, p_texto: o.data.texto });
  if (error || !data) return { ok: false, error: "Este link ya no recibe opiniones." };
  return { ok: true };
}
