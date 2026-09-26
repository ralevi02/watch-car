"use server";

import { Seguimiento } from "@radar/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };

export async function guardarSeguimiento(ficha: unknown): Promise<Resultado> {
  const f = Seguimiento.safeParse(ficha);
  if (!f.success) return { ok: false, error: "La ficha no es válida" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("busquedas").insert({ nombre: f.data.nombre, ficha: f.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function cambiarBusqueda(id: string, cambios: { activa?: boolean; alertas?: boolean }) {
  const supabase = await crearClienteServidor();
  await supabase.from("busquedas").update(cambios).eq("id", z.uuid().parse(id));
  revalidatePath("/");
}

export async function borrarBusqueda(id: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("busquedas").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/");
}

export async function marcarAuto(autoId: string, estado: "favorito" | "descartado" | null) {
  const supabase = await crearClienteServidor();
  await supabase.from("marcas").upsert({ auto_id: z.uuid().parse(autoId), estado }, { onConflict: "auto_id" });
  revalidatePath("/resultados");
}

export async function guardarNota(autoId: string, nota: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("marcas").upsert({ auto_id: z.uuid().parse(autoId), nota: nota.trim() || null }, { onConflict: "auto_id" });
  revalidatePath("/resultados");
}

const Suscripcion = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function guardarSuscripcion(sub: unknown): Promise<Resultado> {
  const s = Suscripcion.safeParse(sub);
  if (!s.success) return { ok: false, error: "Suscripción inválida" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("push_suscripciones")
    .upsert({ endpoint: s.data.endpoint, p256dh: s.data.keys.p256dh, auth: s.data.keys.auth }, { onConflict: "endpoint" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function borrarSuscripcion(endpoint: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
