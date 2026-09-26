import { createHash } from "node:crypto";
import { evaluar, leerTitulo, type AvisoNormalizado, type Seguimiento } from "@radar/core";
import type { ClienteDb, Json, TablesInsert } from "@radar/db";
import type { AvisoLista, DetalleChileautos } from "./lector.js";
import type { ResultadoChileautos } from "./recolector.js";

const FUENTE = "chileautos";

const huella = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);

/** Lo que se puede sacar de la lista sin IA. La normalización con Gemini lo corrige después. */
export function datosDeLista(a: AvisoLista) {
  const t = leerTitulo(a.titulo);
  return {
    url: a.url,
    titulo: a.titulo,
    anio: a.anio ?? null,
    km: a.km ?? null,
    precio: a.precio ?? null,
    caja: a.caja ? (/autom/i.test(a.caja) ? "automatica" : "manual") : null,
    combustible: a.combustible ?? null,
    carroceria: a.carroceria ?? null,
    region: a.region ?? null,
    tipo_vendedor: a.tipoVendedor ? (/particular/i.test(a.tipoVendedor) ? "particular" : "automotora") : null,
    vendedor: a.vendedor ?? null,
    motor: t.motor ?? null,
    traccion: t.traccion ?? null,
    // Si el título no lo dice, no se sabe: muchos CC se publican como modelo base.
    cross_country: t.crossCountry ? true : null,
  };
}

export function datosDeDetalle(d: DetalleChileautos) {
  const traccion = d.datos["Tracción"];
  const version = d.datos["Versión"];
  return {
    descripcion: d.descripcion ?? null,
    comuna: d.datos["Comuna"] ?? null,
    version: version ?? null,
    ...(traccion && /4x4|awd|4wd/i.test(traccion) ? { traccion: "AWD" } : {}),
    ...(traccion && /4x2|2wd|fwd/i.test(traccion) ? { traccion: "FWD" } : {}),
    ...(version && /cross\s*country/i.test(version) ? { cross_country: true } : {}),
  };
}

export function aNormalizado(x: {
  anio: number | null;
  km: number | null;
  precio: number | null;
  motor: string | null;
  traccion: string | null;
  caja: string | null;
}): AvisoNormalizado {
  return {
    anio: x.anio ?? undefined,
    km: x.km ?? undefined,
    precio: x.precio ?? undefined,
    motor: x.motor ?? undefined,
    traccion: x.traccion === "AWD" || x.traccion === "FWD" ? x.traccion : undefined,
    caja: x.caja === "automatica" || x.caja === "manual" ? x.caja : undefined,
  };
}

export interface ResumenGuardado {
  vistos: number;
  nuevos: number;
  bajasDePrecio: number;
  noVistos: number;
  veredictos: Record<"calza" | "advertencia" | "fuera", number>;
  /** Avisos nuevos que calzan o entran con advertencia: los que merecen aviso push. */
  nuevosInteresantes: { id: string; titulo: string; precio: number | null; url: string; veredicto: string }[];
}

type Respuesta<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

async function leer<T>(p: Respuesta<T>, que: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`Supabase (${que}): ${error.message}`);
  if (data === null) throw new Error(`Supabase (${que}): sin datos`);
  return data;
}

async function escribir(p: Respuesta<unknown>, que: string): Promise<void> {
  const { error } = await p;
  if (error) throw new Error(`Supabase (${que}): ${error.message}`);
}

/** Guarda una pasada: crudos, avisos, precios, detalles, veredictos y avisos que dejaron de aparecer. */
export async function guardarPasada(
  db: ClienteDb,
  busquedaId: string,
  ficha: Seguimiento,
  r: ResultadoChileautos,
  pasadaId: string,
): Promise<ResumenGuardado> {
  const resumen: ResumenGuardado = {
    vistos: r.avisos.length,
    nuevos: 0,
    bajasDePrecio: 0,
    noVistos: 0,
    veredictos: { calza: 0, advertencia: 0, fuera: 0 },
    nuevosInteresantes: [],
  };
  const ids = r.avisos.map((a) => a.id);

  // 1. Crudos, para reprocesar sin volver al portal.
  const crudos: TablesInsert<"avisos_crudos">[] = [
    ...r.avisos.map((a) => ({ pasada_id: pasadaId, fuente_id: FUENTE, id_externo: a.id, tipo: "lista", datos: a as unknown as Json, hash: huella(a) })),
    ...Object.entries(r.detalles).map(([id, d]) => ({ pasada_id: pasadaId, fuente_id: FUENTE, id_externo: id, tipo: "detalle", datos: d as unknown as Json, hash: huella(d) })),
  ];
  if (crudos.length) {
    await escribir(db.from("avisos_crudos").upsert(crudos, { onConflict: "fuente_id,id_externo,tipo,hash", ignoreDuplicates: true }), "crudos");
  }

  // 2. Avisos nuevos y existentes.
  const existentes = ids.length
    ? await leer(db.from("avisos").select("id, id_externo, precio").eq("fuente_id", FUENTE).in("id_externo", ids), "leer avisos")
    : [];
  const porExterno = new Map(existentes.map((e) => [e.id_externo, e]));
  const ahora = new Date().toISOString();
  const marca = ficha.marca;
  const modelo = ficha.modeloPortal || ficha.modelo;

  const nuevos = r.avisos.filter((a) => !porExterno.has(a.id));
  if (nuevos.length) {
    const autos = await leer(
      db
        .from("autos")
        .insert(nuevos.map((a) => ({ marca, modelo, anio: a.anio ?? null, km: a.km ?? null, region: a.region ?? null })))
        .select("id"),
      "crear autos",
    );
    const insertados = await leer(
      db
        .from("avisos")
        .insert(
          nuevos.map((a, i) => ({
            fuente_id: FUENTE,
            id_externo: a.id,
            auto_id: autos[i]?.id ?? null,
            marca,
            modelo,
            ...datosDeLista(a),
            precio_inicial: a.precio ?? null,
          })),
        )
        .select("id, id_externo, precio"),
      "crear avisos",
    );
    const conPrecio = insertados.filter((x) => x.precio !== null);
    if (conPrecio.length) await escribir(db.from("precios").insert(conPrecio.map((x) => ({ aviso_id: x.id, precio: x.precio! }))), "precios nuevos");
    for (const x of insertados) porExterno.set(x.id_externo, x);
    resumen.nuevos = insertados.length;
  }

  for (const a of r.avisos) {
    const e = porExterno.get(a.id);
    if (!e || nuevos.includes(a)) continue;
    // Solo lo que viene crudo del portal; lo normalizado no se pisa.
    await escribir(
      db
        .from("avisos")
        .update({ url: a.url, titulo: a.titulo, precio: a.precio ?? null, km: a.km ?? null, ultima_vez: ahora, estado: "activo", veces_no_visto: 0 })
        .eq("id", e.id),
      "actualizar aviso",
    );
    if (a.precio !== undefined && e.precio !== null && a.precio !== e.precio) {
      await escribir(db.from("precios").insert({ aviso_id: e.id, precio: a.precio }), "cambio de precio");
      if (a.precio < e.precio) resumen.bajasDePrecio++;
    }
  }

  // 3. Detalles.
  for (const [id, d] of Object.entries(r.detalles)) {
    const e = porExterno.get(id);
    if (e) await escribir(db.from("avisos").update(datosDeDetalle(d)).eq("id", e.id), "detalle");
  }

  // 4. Veredicto contra la ficha.
  if (ids.length) {
    const filas = await leer(
      db.from("avisos").select("id, id_externo, titulo, url, anio, km, precio, motor, traccion, caja").eq("fuente_id", FUENTE).in("id_externo", ids),
      "leer para evaluar",
    );
    const nuevosIds = new Set(nuevos.map((a) => a.id));
    const resultados = filas.map((f) => {
      const v = evaluar(aNormalizado(f), ficha);
      resumen.veredictos[v.tipo]++;
      if (nuevosIds.has(f.id_externo) && v.tipo !== "fuera") {
        resumen.nuevosInteresantes.push({ id: f.id, titulo: f.titulo, precio: f.precio, url: f.url, veredicto: v.tipo });
      }
      return { busqueda_id: busquedaId, aviso_id: f.id, veredicto: v.tipo, motivos: v.tipo === "calza" ? [] : v.motivos, evaluado_en: ahora };
    });
    await escribir(db.from("resultados").upsert(resultados, { onConflict: "busqueda_id,aviso_id" }), "resultados");
  }

  // 5. Lo que dejó de aparecer. Solo si se leyeron todas las páginas sin errores.
  const completa = !r.bloqueo && r.errores.length === 0 && r.paginasLeidas >= r.paginasTotales;
  if (completa) {
    const previos = await leer(
      db
        .from("resultados")
        .select("aviso_id, avisos!inner(id_externo, estado, veces_no_visto, fuente_id)")
        .eq("busqueda_id", busquedaId)
        .eq("avisos.fuente_id", FUENTE)
        .in("avisos.estado", ["activo", "posible_vendido"]),
      "leer previos",
    );
    const vistos = new Set(ids);
    for (const p of previos) {
      if (vistos.has(p.avisos.id_externo)) continue;
      const veces = p.avisos.veces_no_visto + 1;
      await escribir(
        db
          .from("avisos")
          .update({ veces_no_visto: veces, estado: veces >= 2 ? "posible_vendido" : p.avisos.estado })
          .eq("id", p.aviso_id),
        "no visto",
      );
      resumen.noVistos++;
    }
  }

  return resumen;
}
