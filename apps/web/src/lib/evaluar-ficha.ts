import { avisoDesdeFila, casiCalza, evaluar, type Seguimiento } from "@radar/core";
import { FUENTES_CORRIBLES } from "@/lib/github";
import type { crearClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;
const PAGINA = 1000;

/** Compara la ficha con todos los avisos guardados de sus fuentes, sin esperar a que reaparezcan en una pasada. */
export async function evaluarFichaContraTodo(supabase: Cliente, busquedaId: string, ficha: Seguimiento) {
  const ahora = new Date().toISOString();
  for (const fuente of ficha.fuentes) {
    for (let desde = 0; ; desde += PAGINA) {
      const { data: avisos } = await supabase
        .from("avisos")
        .select("id, titulo, tipo, marca, modelo, por_confirmar, anio, km, precio, motor, traccion, caja, region")
        .eq("fuente_id", fuente)
        .neq("estado", "vendido")
        .order("id")
        .range(desde, desde + PAGINA - 1);
      const filas = (avisos ?? []).map((a) => {
        const n = avisoDesdeFila(a);
        const v = evaluar(n, ficha);
        return { busqueda_id: busquedaId, aviso_id: a.id, veredicto: v.tipo, motivos: v.tipo === "calza" ? [] : v.motivos, casi: casiCalza(n, ficha), evaluado_en: ahora };
      });
      for (let i = 0; i < filas.length; i += 200) await supabase.from("resultados").upsert(filas.slice(i, i + 200), { onConflict: "busqueda_id,aviso_id" });
      if ((avisos?.length ?? 0) < PAGINA) break;
    }
  }
}

/** Ficha nueva: el homelab la busca en sus fuentes sin esperar el horario. Las rápidas primero y Facebook (el barrido largo) al final. */
export async function buscarAlTiro(supabase: Cliente, busquedaId: string, ficha: Seguimiento) {
  const orden = (f: string) => (f === "facebook" ? 1 : 0);
  const fuentes = FUENTES_CORRIBLES.filter((f) => (ficha.fuentes as readonly string[]).includes(f)).sort((a, b) => orden(a) - orden(b));
  const ahora = Date.now();
  await supabase.from("corridas_pedidas").insert(fuentes.map((fuente, i) => ({ fuente, busqueda_id: busquedaId, pedida_en: new Date(ahora + i).toISOString() })));
}
