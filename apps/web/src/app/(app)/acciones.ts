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

// ── Fase 2: cuentas de Facebook, reconexión y links compartidos ─────────────

export async function crearCuentaFacebook(nombre: string): Promise<Resultado & { id?: string }> {
  const n = nombre.trim();
  if (!n) return { ok: false, error: "Ponle un nombre (ej. «Cuenta 1»)" };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("cuentas_facebook").insert({ nombre: n }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fuentes");
  return { ok: true, id: data.id };
}

export async function cambiarCuentaFacebook(id: string, estado: "activa" | "pausada") {
  const supabase = await crearClienteServidor();
  await supabase.from("cuentas_facebook").update({ estado }).eq("id", z.uuid().parse(id));
  revalidatePath("/fuentes");
}

export async function borrarCuentaFacebook(id: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("cuentas_facebook").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/fuentes");
}

export async function configurarFacebook(cambios: { activa?: boolean; rotacion?: boolean; pasadas_por_dia?: number }) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("fuentes").select("config").eq("id", "facebook").single();
  const config = { ...((data?.config as Record<string, unknown>) ?? {}) };
  if (cambios.rotacion !== undefined) config.rotacion = cambios.rotacion;
  if (cambios.pasadas_por_dia !== undefined) config.pasadas_por_dia = Math.min(6, Math.max(1, Math.round(cambios.pasadas_por_dia)));
  await supabase
    .from("fuentes")
    .update({ config: config as never, ...(cambios.activa !== undefined ? { activa: cambios.activa } : {}) })
    .eq("id", "facebook");
  revalidatePath("/fuentes");
}

/**
 * Pide una reconexión: crea el registro y lanza el workflow "Facebook ·
 * reconectar" con la API de GitHub (token con permiso de Actions en el repo).
 */
export async function pedirReconexion(cuentaId: string): Promise<Resultado & { id?: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("reconexiones").insert({ cuenta_id: z.uuid().parse(cuentaId) }).select("id").single();
  if (error) return { ok: false, error: error.message };
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO || "ralevi02/watch-car";
  if (!token) {
    await supabase.from("reconexiones").update({ estado: "error", error: "Falta GITHUB_DISPATCH_TOKEN en la app" }).eq("id", data.id);
    return { ok: false, error: "Falta configurar GITHUB_DISPATCH_TOKEN en la app para lanzar la reconexión." };
  }
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/facebook-reconectar.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ ref: "main", inputs: { reconexion_id: data.id } }),
  });
  if (!r.ok) {
    const detalle = `GitHub respondió ${r.status}`;
    await supabase.from("reconexiones").update({ estado: "error", error: detalle }).eq("id", data.id);
    return { ok: false, error: detalle };
  }
  return { ok: true, id: data.id };
}

export async function leerReconexion(id: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("reconexiones")
    .select("id, estado, url, clave, error, run_url, cuentas_facebook(nombre)")
    .eq("id", z.uuid().parse(id))
    .single();
  return data;
}

export async function confirmarReconexion(id: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("reconexiones").update({ estado: "guardando" }).eq("id", z.uuid().parse(id)).eq("estado", "lista");
}

export async function cancelarReconexion(id: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("reconexiones").update({ estado: "vencida", error: "Cancelada" }).eq("id", z.uuid().parse(id)).in("estado", ["pedida", "abriendo", "lista"]);
}

export async function compartirLink(entrada: string): Promise<Resultado & { fuente?: string }> {
  const { identificarLink } = await import("@radar/core");
  const link = identificarLink(entrada);
  if (!link) return { ok: false, error: "No reconozco ese link. Sirven avisos de Chileautos, Facebook Marketplace y MercadoLibre." };
  const supabase = await crearClienteServidor();
  const soportado = link.fuente === "chileautos" || link.fuente === "facebook";
  const { error } = await supabase.from("compartidos").insert({
    url: link.url,
    fuente_id: link.fuente,
    id_externo: link.id,
    texto: entrada.slice(0, 500),
    estado: soportado ? "pendiente" : "no_soportado",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/compartir");
  return { ok: true, fuente: link.fuente };
}

// ── Fase 3 ──────────────────────────────────────────────────────────────────

export async function cambiarFuente(id: "kavak" | "yapo" | "mercadolibre" | "chileautos", activa: boolean) {
  const supabase = await crearClienteServidor();
  await supabase.from("fuentes").update({ activa }).eq("id", id);
  revalidatePath("/fuentes");
}
