import { avisoDesdeFila, casiCalza, evaluar, type Seguimiento } from "@radar/core";
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
