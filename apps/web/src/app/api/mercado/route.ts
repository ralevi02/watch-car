import { z } from "zod";
import { esDueno } from "@/lib/datos";
import { type AvisoMercado, mercadoPorSemana } from "@/lib/mercado-ficha";
import { crearClienteServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Cómo se ha movido el precio de lo que calza con una ficha, semana a semana. */
export async function GET(req: Request) {
  if (!(await esDueno())) return Response.json({ error: "Esta cuenta no tiene acceso a Radar." }, { status: 403 });
  const id = z.uuid().safeParse(new URL(req.url).searchParams.get("busqueda"));
  if (!id.success) return Response.json({ error: "Falta la ficha." }, { status: 400 });
  const supabase = await crearClienteServidor();

  const filas: { avisos: { id: string; auto_id: string | null; precio_inicial: number | null; primera_vez: string; ultima_vez: string; estado: string } }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = await supabase
      .from("resultados")
      .select("avisos!inner(id, auto_id, precio_inicial, primera_vez, ultima_vez, estado)")
      .eq("busqueda_id", id.data)
      .neq("veredicto", "fuera")
      .order("aviso_id")
      .range(desde, desde + 999);
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const ids = filas.map((f) => f.avisos.id);
  const precios: { aviso_id: string; precio: number; visto_en: string }[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", ids.slice(i, i + 200)).order("visto_en");
    precios.push(...(data ?? []));
  }
  const avisos: AvisoMercado[] = filas.map(({ avisos: a }) => ({
    autoId: a.auto_id ?? a.id,
    precioInicial: a.precio_inicial,
    primeraVez: a.primera_vez,
    ultimaVez: a.ultima_vez,
    estado: a.estado,
    precios: precios.filter((p) => p.aviso_id === a.id).map((p) => ({ precio: p.precio, en: p.visto_en })),
  }));
  return Response.json(mercadoPorSemana(avisos), { headers: { "Cache-Control": "private, max-age=600" } });
}
