"use server";

import { Seguimiento } from "@radar/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esDueno } from "@/lib/datos";
import { corridasActivas, FUENTES_CORRIBLES, github, REPO, tokenGithub, type EstadoCorrida, type FuenteCorrible } from "@/lib/github";
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
export async function pedirReconexion(cuentaId: string | null, fuente: "facebook" | "mercadolibre" = "facebook"): Promise<Resultado & { id?: string }> {
  const supabase = await crearClienteServidor();
  const fila: { fuente: string; cuenta_id: string | null } = { fuente, cuenta_id: fuente === "mercadolibre" ? null : z.uuid().parse(cuentaId) };
  const { data, error } = await supabase.from("reconexiones").insert(fila).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function leerReconexion(id: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("reconexiones")
    .select("id, estado, fuente, url, clave, error, run_url, cuentas_facebook(nombre)")
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

/**
 * La app de Facebook comparte links cortos (facebook.com/share/…) que redirigen
 * al aviso; sin sesión terminan en el login con el aviso en ?next=. Se sigue la
 * redirección solo para sacar el número del aviso.
 */
async function resolverLinkCorto(entrada: string): Promise<string> {
  const url = entrada.match(/https?:\/\/\S+/)?.[0];
  if (!url || !/^https:\/\/(www\.|m\.)?(facebook\.com\/share\/|fb\.me\/)/.test(url)) return entrada;
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "facebookexternalhit/1.1" }, signal: AbortSignal.timeout(8000) });
    const final = decodeURIComponent(r.url);
    const id = final.match(/\/marketplace\/item\/(\d+)/)?.[1];
    return id ? `https://www.facebook.com/marketplace/item/${id}/` : entrada;
  } catch {
    return entrada;
  }
}

export async function compartirLink(entrada: string): Promise<Resultado & { fuente?: string }> {
  const { identificarLink } = await import("@radar/core");
  const link = identificarLink(await resolverLinkCorto(entrada));
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

export async function cambiarFuente(id: "kavak" | "yapo" | "mercadolibre" | "chileautos" | "brunofritsch" | "remates", activa: boolean) {
  const supabase = await crearClienteServidor();
  await supabase.from("fuentes").update({ activa }).eq("id", id);
  revalidatePath("/fuentes");
}

// ── Correr desde la app ─────────────────────────────────────────────────────

/** Guarda en Vault el token de GitHub (solo Actions de este repo) después de probarlo. */
export async function conectarGithub(token: string): Promise<Resultado> {
  if (!(await esDueno())) return { ok: false, error: "Esta cuenta no tiene acceso a Radar." };
  const limpio = token.trim();
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(limpio)) return { ok: false, error: "Eso no parece un token de GitHub: empieza con github_pat_." };
  const r = await github(limpio, "/actions/workflows?per_page=1");
  if (r.status === 401) return { ok: false, error: "GitHub no reconoce ese token." };
  if (!r.ok) return { ok: false, error: `El token no tiene acceso a las Actions de ${REPO}. Revisa que incluya ese repositorio.` };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("guardar_secreto_app", { p_nombre: "github", p_valor: limpio });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fuentes");
  return { ok: true };
}

export async function desconectarGithub() {
  const supabase = await crearClienteServidor();
  await supabase.rpc("borrar_token_github");
  revalidatePath("/fuentes");
}

const Corrible = z.enum([...FUENTES_CORRIBLES, "todas"]);

/** Pide la pasada de una fuente (o de todas) al worker del homelab, que la toma de corridas_pedidas. */
export async function correrAhora(fuente: FuenteCorrible | "todas"): Promise<Resultado> {
  const f = Corrible.parse(fuente);
  if (!(await esDueno())) return { ok: false, error: "Esta cuenta no tiene acceso a Radar." };
  const fuentes = f === "todas" ? FUENTES_CORRIBLES : [f];
  const { error } = await (await crearClienteServidor()).from("corridas_pedidas").insert(fuentes.map((x) => ({ fuente: x })));
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Qué fuentes tienen una corrida en cola o en curso (en GitHub Actions o pedida al homelab). */
export async function leerCorridas(): Promise<Partial<Record<FuenteCorrible, EstadoCorrida>>> {
  const supabase = await crearClienteServidor();
  const token = await tokenGithub(supabase);
  const activas = token ? await corridasActivas(token) : {};
  const { data: pedidas } = await supabase
    .from("corridas_pedidas")
    .select("fuente, estado")
    .in("estado", ["pedida", "corriendo"])
    .gt("pedida_en", new Date(Date.now() - 2 * 3_600_000).toISOString());
  for (const p of pedidas ?? []) {
    const f = p.fuente as FuenteCorrible;
    if (activas[f] !== "corriendo") activas[f] = p.estado === "corriendo" ? "corriendo" : "en_cola";
  }
  return activas;
}
