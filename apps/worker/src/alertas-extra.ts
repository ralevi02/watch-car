import { entrenarMercado, type Mercado, precioJusto } from "@radar/core";
import type { ClienteDb } from "@radar/db";
import type { ResumenGuardado } from "./guardar.js";
import type { Notificacion } from "./push.js";

const APP_URL = process.env.APP_URL;
const miles = (n: number) => n.toLocaleString("es-CL");
const enlace = (avisoId: string, url: string) => (APP_URL ? `${APP_URL}/resultados?aviso=${avisoId}` : url);

/** auto_id de cada aviso. */
async function autosDe(db: ClienteDb, avisoIds: string[]) {
  if (!avisoIds.length) return new Map<string, string>();
  const { data } = await db.from("avisos").select("id, auto_id").in("id", avisoIds);
  return new Map((data ?? []).filter((x) => x.auto_id).map((x) => [x.id, x.auto_id!]));
}

/**
 * Autos que el dueño sigue: cualquier cambio de precio (sube o baja) y si dejan
 * de aparecer. Llegan siempre al tiro, aunque los avisos estén en modo resumen.
 */
export async function avisosDeSeguidos(db: ClienteDb, g: ResumenGuardado): Promise<Notificacion[]> {
  const ids = [...g.cambiosDePrecio.map((x) => x.id), ...g.dejaronDeAparecer.map((x) => x.id)];
  if (!ids.length) return [];
  const autos = await autosDe(db, ids);
  const { data: seguidos } = await db.from("marcas").select("auto_id").eq("seguir", true).in("auto_id", [...new Set(autos.values())]);
  const siguiendo = new Set((seguidos ?? []).map((m) => m.auto_id));
  const es = (id: string) => siguiendo.has(autos.get(id) ?? "");
  return [
    ...g.cambiosDePrecio.filter((x) => es(x.id)).map((x) => ({
      titulo: x.ahora < x.antes ? "Bajó un auto que sigues" : "Subió un auto que sigues",
      cuerpo: `${x.titulo}: de $${miles(x.antes)} a $${miles(x.ahora)}`,
      url: enlace(x.id, x.url),
      etiqueta: `seguido-${x.id}`,
      tipo: "sistema" as const,
    })),
    ...g.dejaronDeAparecer.filter((x) => es(x.id)).map((x) => ({
      titulo: "Un auto que sigues ya no aparece",
      cuerpo: `${x.titulo}: puede que se haya vendido.`,
      url: enlace(x.id, x.url),
      etiqueta: `seguido-${x.id}`,
      tipo: "sistema" as const,
    })),
  ];
}

/** Un auto que ya no aparecía volvió a publicarse (se cayó la venta o lo republica otro). Solo si lo tenías marcado. */
export async function avisosDeReaparecidos(db: ClienteDb, reaparecidos: { avisoId: string; autoId: string }[]): Promise<Notificacion[]> {
  if (!reaparecidos.length) return [];
  const { data: marcas } = await db.from("marcas").select("auto_id, estado, seguir, contacto").in("auto_id", reaparecidos.map((r) => r.autoId));
  const importa = new Set((marcas ?? []).filter((m) => m.estado !== "descartado" && (m.seguir || m.estado === "favorito" || m.contacto)).map((m) => m.auto_id));
  const { data: avisos } = await db.from("avisos").select("id, titulo, url, precio, fuente_id").in("id", reaparecidos.map((r) => r.avisoId));
  return reaparecidos
    .filter((r) => importa.has(r.autoId))
    .flatMap((r) => {
      const a = avisos?.find((x) => x.id === r.avisoId);
      return a
        ? [{ titulo: "Volvió a publicarse un auto tuyo", cuerpo: `${a.titulo}${a.precio ? ` a $${miles(a.precio)}` : ""}.`, url: enlace(a.id, a.url), etiqueta: `volvio-${a.id}`, tipo: "sistema" as const }]
        : [];
    });
}

let mercado: Mercado | null = null;
/** El mercado se entrena una vez por corrida con todos los avisos guardados. */
async function elMercado(db: ClienteDb) {
  if (mercado) return mercado;
  const filas: { modelo: string | null; anio: number | null; km: number | null; precio: number | null; tipo: string | null }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = await db.from("avisos").select("modelo, anio, km, precio, tipo").range(desde, desde + 999);
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  mercado = entrenarMercado(filas);
  return mercado;
}

/** Oportunidad: un auto nuevo que calza, 15% o más bajo lo que suele costar uno así. */
export async function avisosDeOportunidad(db: ClienteDb, nuevos: { id: string; titulo: string; precio: number | null; url: string; veredicto: string }[]): Promise<Notificacion[]> {
  const conPrecio = nuevos.filter((x) => x.precio && x.veredicto === "calza");
  if (!conPrecio.length) return [];
  const m = await elMercado(db);
  const { data: avisos } = await db.from("avisos").select("id, modelo, anio, km").in("id", conPrecio.map((x) => x.id));
  return conPrecio.flatMap((x) => {
    const a = avisos?.find((y) => y.id === x.id);
    const justo = a ? precioJusto(m, a) : null;
    if (!justo || justo.n < 8 || x.precio! > justo.precio * 0.85) return [];
    return [
      {
        titulo: "Oportunidad",
        cuerpo: `${x.titulo} a $${miles(x.precio!)}: unos $${miles(justo.precio - x.precio!)} bajo lo normal (${justo.n} autos parecidos).`,
        url: enlace(x.id, x.url),
        // Misma etiqueta que el aviso de "nuevo": lo reemplaza en el teléfono.
        etiqueta: `aviso-${x.id}`,
        tipo: "sistema" as const,
      },
    ];
  });
}
