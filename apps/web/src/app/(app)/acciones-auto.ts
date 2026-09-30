"use server";

import { avisoDesdeFila, casiCalza, evaluar, Seguimiento } from "@radar/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { leerBusquedas, type Visita } from "@/lib/datos";
import type { TablesUpdate } from "@radar/db";
import { crearClienteServidor } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };
const Id = z.uuid();

export type Contacto = "por_contactar" | "escribi" | "respondio" | "visita" | "comprado";
const CONTACTOS = ["por_contactar", "escribi", "respondio", "visita", "comprado"] as const;

/** Dónde va el auto en la compra: por contactar, escribí, respondió, visita, comprado. */
export async function cambiarContacto(autoId: string, contacto: Contacto | null) {
  const supabase = await crearClienteServidor();
  await supabase.from("marcas").upsert({ auto_id: Id.parse(autoId), contacto: contacto && z.enum(CONTACTOS).parse(contacto) }, { onConflict: "auto_id" });
}

/** Guardar o descartar; al descartar se puede decir por qué (sirve para sugerir cambios a la ficha). */
export async function marcarConMotivo(autoId: string, estado: "favorito" | "descartado" | null, motivo?: string | null) {
  const supabase = await crearClienteServidor();
  await supabase
    .from("marcas")
    .upsert({ auto_id: Id.parse(autoId), estado, motivo_descarte: estado === "descartado" ? (motivo?.slice(0, 60) ?? null) : null }, { onConflict: "auto_id" });
  revalidatePath("/resultados");
}

export async function guardarVisita(autoId: string, visita: Visita) {
  const supabase = await crearClienteServidor();
  const limpio = JSON.parse(JSON.stringify(visita ?? {})) as Visita;
  await supabase.from("marcas").upsert({ auto_id: Id.parse(autoId), visita: limpio as never }, { onConflict: "auto_id" });
}

export async function agendarVisita(autoId: string, fecha: string | null) {
  const supabase = await crearClienteServidor();
  const cuando = fecha ? z.iso.datetime({ offset: true }).parse(fecha) : null;
  await supabase.from("marcas").upsert({ auto_id: Id.parse(autoId), visita_en: cuando, ...(cuando ? { contacto: "visita" } : {}) }, { onConflict: "auto_id" });
}

export type Correccion = "es_cc" | "no_es_cc" | "repuesto" | "otro" | "es_auto";

/**
 * El dueño corrige un auto: queda anotado (la IA lo usa de ejemplo), se
 * arreglan sus avisos y se vuelven a evaluar contra las fichas al tiro.
 */
export async function corregirAuto(autoId: string, correccion: Correccion): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const id = Id.parse(autoId);
  const { data: avisos, error } = await supabase
    .from("avisos")
    .select("id, titulo, descripcion, modelo, por_confirmar, anio, km, precio, motor, traccion, caja, tipo")
    .or(`auto_id.eq.${id},id.eq.${id}`);
  if (error || !avisos?.length) return { ok: false, error: error?.message ?? "No encontré el auto" };

  for (const a of avisos) {
    const base = (a.modelo ?? "").replace(/\s*(cross\s*-?\s*country|\bcc\b)\s*$/i, "").trim();
    let campo: "modelo" | "tipo";
    let valor: string;
    let cambios: TablesUpdate<"avisos">;
    if (correccion === "es_cc" || correccion === "no_es_cc") {
      if (!base) continue;
      campo = "modelo";
      valor = correccion === "es_cc" ? `${base} Cross Country` : base;
      cambios = { modelo: valor, cross_country: correccion === "es_cc", por_confirmar: a.por_confirmar.filter((c) => c !== "modelo") };
    } else {
      campo = "tipo";
      valor = correccion === "es_auto" ? "auto" : correccion;
      cambios = { tipo: valor };
    }
    await supabase.from("correcciones").insert({ aviso_id: a.id, campo, valor, titulo: a.titulo, descripcion: a.descripcion?.slice(0, 1500) ?? null });
    await supabase.from("avisos").update(cambios).eq("id", a.id);
    Object.assign(a, cambios);
  }

  // Reevaluar sus avisos contra las fichas activas, con las mismas reglas del worker.
  const fichas = (await leerBusquedas()).filter((b) => b.activa);
  const ahora = new Date().toISOString();
  const filas = fichas.flatMap((b) =>
    avisos.map((a) => {
      const n = avisoDesdeFila(a);
      const v = evaluar(n, b.ficha);
      return { busqueda_id: b.id, aviso_id: a.id, veredicto: v.tipo, motivos: v.tipo === "calza" ? [] : v.motivos, casi: casiCalza(n, b.ficha), evaluado_en: ahora };
    }),
  );
  if (filas.length) {
    const { error: e2 } = await supabase.from("resultados").upsert(filas, { onConflict: "busqueda_id,aviso_id" });
    if (e2) return { ok: false, error: e2.message };
  }
  revalidatePath("/resultados");
  return { ok: true };
}

/** "No es el mismo auto": el aviso pasa a su propio auto y la deduplicación ya no lo vuelve a juntar. */
export async function separarAviso(avisoId: string): Promise<Resultado & { autoId?: string }> {
  const supabase = await crearClienteServidor();
  const { data: a } = await supabase.from("avisos").select("id, marca, modelo, anio, km, region, version").eq("id", Id.parse(avisoId)).single();
  if (!a) return { ok: false, error: "No encontré el aviso" };
  const { data: auto, error } = await supabase
    .from("autos")
    .insert({ marca: a.marca, modelo: a.modelo, anio: a.anio, km: a.km, region: a.region, version: a.version })
    .select("id")
    .single();
  if (error || !auto) return { ok: false, error: error?.message ?? "No se pudo crear el auto" };
  await supabase.from("avisos").update({ auto_id: auto.id, separado: true }).eq("id", a.id);
  revalidatePath("/resultados");
  return { ok: true, autoId: auto.id };
}

/** Link para que otra persona vea el auto y opine, sin cuenta. Si ya hay uno, se reusa. */
export async function crearEnlace(autoId: string): Promise<Resultado & { token?: string }> {
  const supabase = await crearClienteServidor();
  const id = Id.parse(autoId);
  const { data: hay } = await supabase.from("enlaces_publicos").select("token").eq("auto_id", id).eq("activo", true).limit(1);
  if (hay?.[0]) return { ok: true, token: hay[0].token };
  const { data, error } = await supabase.from("enlaces_publicos").insert({ auto_id: id }).select("token").single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear el link" };
  return { ok: true, token: data.token };
}

export async function desactivarEnlace(token: string) {
  const supabase = await crearClienteServidor();
  await supabase.from("enlaces_publicos").update({ activo: false }).eq("token", z.string().regex(/^[0-9a-f]{24}$/).parse(token));
}

const Ajuste = z.discriminatedUnion("clave", [
  z.object({ clave: z.literal("avisos"), valor: z.object({ modo: z.enum(["inmediato", "resumen"]), hora: z.number().int().min(0).max(23) }) }),
  z.object({ clave: z.literal("casa"), valor: z.object({ comuna: z.string().max(60) }) }),
  z.object({
    clave: z.literal("mi_auto"),
    valor: z.object({ kmActual: z.number().int().min(0).max(1_500_000).optional(), fechaCompra: z.string().max(10).optional(), patente: z.string().max(10).optional() }),
  }),
]);

export async function guardarAjuste(ajuste: z.infer<typeof Ajuste>) {
  const a = Ajuste.parse(ajuste);
  const supabase = await crearClienteServidor();
  await supabase.from("ajustes").upsert({ clave: a.clave, valor: a.valor, actualizado_en: new Date().toISOString() });
}

/**
 * Ajusta la ficha (ej. una sugerencia por lo que vienes descartando) y vuelve a
 * evaluar al tiro todos sus avisos, sin esperar a la próxima pasada.
 */
export async function actualizarFicha(busquedaId: string, ficha: unknown): Promise<Resultado> {
  const f = Seguimiento.safeParse(ficha);
  if (!f.success) return { ok: false, error: "La ficha no es válida" };
  const supabase = await crearClienteServidor();
  const id = Id.parse(busquedaId);
  const { error } = await supabase.from("busquedas").update({ ficha: f.data }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  const ahora = new Date().toISOString();
  for (const fuente of f.data.fuentes) {
    const { data: avisos } = await supabase
      .from("avisos")
      .select("id, titulo, tipo, modelo, por_confirmar, anio, km, precio, motor, traccion, caja")
      .eq("fuente_id", fuente)
      .neq("estado", "vendido");
    const filas = (avisos ?? []).map((a) => {
      const n = avisoDesdeFila(a);
      const v = evaluar(n, f.data);
      return { busqueda_id: id, aviso_id: a.id, veredicto: v.tipo, motivos: v.tipo === "calza" ? [] : v.motivos, casi: casiCalza(n, f.data), evaluado_en: ahora };
    });
    for (let i = 0; i < filas.length; i += 200) await supabase.from("resultados").upsert(filas.slice(i, i + 200), { onConflict: "busqueda_id,aviso_id" });
  }
  revalidatePath("/");
  return { ok: true };
}

/** Seguir un auto: avisa al tiro si cambia de precio o deja de aparecer. */
export async function cambiarSeguir(autoId: string, seguir: boolean) {
  const supabase = await crearClienteServidor();
  await supabase.from("marcas").upsert({ auto_id: Id.parse(autoId), seguir }, { onConflict: "auto_id" });
}
