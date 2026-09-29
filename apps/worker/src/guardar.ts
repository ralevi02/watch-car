import { createHash } from "node:crypto";
import { dudaDeModelo, esMismoAuto, evaluar, leerTitulo, mismaFoto, modeloCanonico, pareceNoAuto, TIPOS_AVISO, type AvisoNormalizado, type Seguimiento } from "@radar/core";
import type { ClienteDb, Json, TablesInsert } from "@radar/db";
import type { AvisoPortal, DetallePortal, ResultadoRecoleccion } from "./fuentes/tipos.js";
import { normalizar, type EntradaNormalizacion } from "./normalizar.js";

export const huella = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);

/** Lo que se puede sacar de la lista sin IA. La normalización lo completa después. */
export function datosDeLista(a: AvisoPortal) {
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
    foto_url: a.foto ?? null,
  };
}

export function datosDeDetalle(d: DetallePortal) {
  const traccion = d.datos["Tracción"];
  return {
    descripcion: d.descripcion ?? null,
    comuna: d.datos["Comuna"] ?? null,
    ...(traccion && /4x4|awd|4wd/i.test(traccion) ? { traccion: "AWD" } : {}),
    ...(traccion && /4x2|2wd|fwd/i.test(traccion) ? { traccion: "FWD" } : {}),
  };
}

export function aNormalizado(x: {
  titulo?: string | null;
  tipo?: string | null;
  modelo?: string | null;
  por_confirmar?: string[] | null;
  anio: number | null;
  km: number | null;
  precio: number | null;
  motor: string | null;
  traccion: string | null;
  caja: string | null;
}): AvisoNormalizado {
  // Lo que dijo la IA manda; mientras tanto, el filtro por palabras del título.
  const tipo = TIPOS_AVISO.find((t) => t === x.tipo) ?? (x.titulo ? pareceNoAuto(x.titulo) : undefined);
  return {
    tipo,
    modelo: x.modelo ?? undefined,
    porConfirmar: x.por_confirmar ?? undefined,
    anio: x.anio ?? undefined,
    km: x.km ?? undefined,
    precio: x.precio ?? undefined,
    motor: x.motor ?? undefined,
    traccion: x.traccion === "AWD" || x.traccion === "FWD" ? x.traccion : undefined,
    caja: x.caja === "automatica" || x.caja === "manual" ? x.caja : undefined,
  };
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

export interface ResumenGuardado {
  vistos: number;
  nuevos: number;
  nuevosIds: string[];
  bajasDePrecio: { id: string; titulo: string; url: string; antes: number; ahora: number }[];
  noVistos: number;
}

/** Guarda una pasada: crudos, avisos, precios, detalles y avisos que dejaron de aparecer. */
export async function guardarPasada(
  db: ClienteDb,
  FUENTE: string,
  busquedaId: string,
  ficha: Seguimiento,
  r: ResultadoRecoleccion,
  pasadaId: string,
): Promise<ResumenGuardado> {
  const resumen: ResumenGuardado = { vistos: r.avisos.length, nuevos: 0, nuevosIds: [], bajasDePrecio: [], noVistos: 0 };
  const ids = r.avisos.map((a) => a.id);

  // 1. Crudos, para reprocesar sin volver al portal.
  const crudos: TablesInsert<"avisos_crudos">[] = [
    ...r.avisos.map((a) => ({ pasada_id: pasadaId, fuente_id: FUENTE, id_externo: a.id, tipo: "lista", datos: a as unknown as Json, hash: huella(a) })),
    ...Object.entries(r.detalles).map(([id, d]) => ({ pasada_id: pasadaId, fuente_id: FUENTE, id_externo: id, tipo: "detalle", datos: d as unknown as Json, hash: huella(d) })),
  ];
  if (crudos.length) {
    await escribir(db.from("avisos_crudos").upsert(crudos, { onConflict: "fuente_id,id_externo,tipo,hash", ignoreDuplicates: true }), "crudos");
  }

  // 2. Avisos nuevos (cada uno con su auto; la deduplicación los junta después) y existentes.
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
    resumen.nuevosIds = insertados.map((x) => x.id);
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
      if (a.precio < e.precio) resumen.bajasDePrecio.push({ id: e.id, titulo: a.titulo, url: a.url, antes: e.precio, ahora: a.precio });
    }
  }

  // 3. Detalles.
  for (const [id, d] of Object.entries(r.detalles)) {
    const e = porExterno.get(id);
    if (e) await escribir(db.from("avisos").update(datosDeDetalle(d)).eq("id", e.id), "detalle");
  }

  // 4. Lo que dejó de aparecer. Solo si se leyeron todas las páginas sin errores.
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

const COLUMNAS_ENTRADA = "id, titulo, precio, anio, km, caja, combustible, carroceria, region, comuna, tipo_vendedor, vendedor, traccion, descripcion, normalizado_hash";

/**
 * Normaliza con Gemini los avisos cuyo contenido cambió desde la última vez
 * (nuevos, con detalle recién leído, etc.). Lo que viene estructurado del
 * portal (año, km, precio, caja, región) no se pisa; solo se completa si falta.
 */
export async function normalizarPendientes(db: ClienteDb, FUENTE: string, idsExternos: string[], op: { forzar?: boolean } = {}): Promise<{ normalizados: number; error?: string }> {
  if (!idsExternos.length) return { normalizados: 0 };
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return { normalizados: 0, error: "Falta GOOGLE_GENERATIVE_AI_API_KEY: no se normalizó" };
  const filas = await leer(db.from("avisos").select(COLUMNAS_ENTRADA).eq("fuente_id", FUENTE).in("id_externo", idsExternos), "leer para normalizar");
  const pendientes = filas
    .map((f) => {
      const entrada: EntradaNormalizacion = {
        id: f.id,
        titulo: f.titulo,
        precio: f.precio,
        anio: f.anio,
        km: f.km,
        caja: f.caja,
        combustible: f.combustible,
        carroceria: f.carroceria,
        region: f.region,
        comuna: f.comuna,
        tipoVendedor: f.tipo_vendedor,
        vendedor: f.vendedor,
        traccion: f.traccion,
        descripcion: f.descripcion,
      };
      return { entrada, hash: huella(entrada), anterior: f.normalizado_hash };
    })
    .filter((p) => op.forzar || p.hash !== p.anterior);
  if (!pendientes.length) return { normalizados: 0 };

  let normalizados: Awaited<ReturnType<typeof normalizar>>;
  try {
    normalizados = await normalizar(pendientes.map((p) => p.entrada));
  } catch (e) {
    // Sin IA la pasada sirve igual: se reintenta en la próxima.
    return { normalizados: 0, error: `Gemini: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}` };
  }

  const ahora = new Date().toISOString();
  for (const p of pendientes) {
    const n = normalizados.get(p.entrada.id);
    if (!n) continue;
    // Si el aviso dice Cross Country no hay duda; en Facebook (texto libre) un "V40" a secas sí la hay.
    const porConfirmar = dudaDeModelo(n.modelo, n.porConfirmar, p.entrada, FUENTE === "facebook") as typeof n.porConfirmar;
    await escribir(
      db
        .from("avisos")
        .update({
          tipo: n.tipo,
          modelo: n.modelo,
          version: n.version,
          motor: n.motor,
          ...(n.traccion ? { traccion: n.traccion } : {}),
          ...(n.caja && !p.entrada.caja ? { caja: n.caja } : {}),
          ...(n.comuna && !p.entrada.comuna ? { comuna: n.comuna } : {}),
          // Facebook casi nunca trae km ni año en la lista: se toman de la descripción.
          ...(n.km && p.entrada.km === null ? { km: n.km } : {}),
          ...(n.anio && p.entrada.anio === null ? { anio: n.anio } : {}),
          cross_country: modeloCanonico(n.modelo).includes("cc"),
          alertas: n.alertas,
          alerta_detalle: n.alertaDetalle,
          precio_descripcion: n.precioDescripcion,
          por_confirmar: porConfirmar,
          normalizado_en: ahora,
          normalizado_hash: p.hash,
        })
        .eq("id", p.entrada.id),
      "guardar normalización",
    );
  }
  return { normalizados: normalizados.size };
}

/**
 * Junta avisos que son el mismo auto (reglas de esMismoAuto o foto casi igual)
 * bajo un solo registro de autos, para mostrar el precio más bajo y todos los links.
 */
export async function deduplicar(db: ClienteDb, avisoIds: string[]): Promise<number> {
  let juntados = 0;
  for (const id of avisoIds) {
    const [a] = await leer(db.from("avisos").select("id, auto_id, modelo, anio, km, precio, region, foto_hash").eq("id", id), "leer para deduplicar");
    if (!a?.anio || !a.modelo || (!a.km && !a.foto_hash)) continue;
    const candidatos = await leer(
      db
        .from("avisos")
        .select("id, auto_id, modelo, anio, km, precio, region, foto_hash, primera_vez")
        .eq("anio", a.anio)
        .neq("id", a.id)
        .in("estado", ["activo", "posible_vendido"])
        .order("primera_vez", { ascending: true }),
      "candidatos",
    );
    // Primero las reglas; los casos dudosos (sin km, otra región) se resuelven por la foto.
    const igual = candidatos.find(
      (c) => c.auto_id && c.auto_id !== a.auto_id && (esMismoAuto(a, c) || mismaFoto({ ...a, fotoHash: a.foto_hash }, { ...c, fotoHash: c.foto_hash })),
    );
    if (!igual?.auto_id) continue;
    const autoViejo = a.auto_id;
    await escribir(db.from("avisos").update({ auto_id: igual.auto_id }).eq("id", a.id), "juntar auto");
    if (autoViejo) {
      // El auto que quedó sin avisos se borra si no tiene marcas del usuario.
      const { count } = await db.from("avisos").select("id", { count: "exact", head: true }).eq("auto_id", autoViejo);
      const { count: marcas } = await db.from("marcas").select("auto_id", { count: "exact", head: true }).eq("auto_id", autoViejo);
      if (!count && !marcas) await escribir(db.from("autos").delete().eq("id", autoViejo), "borrar auto huérfano");
    }
    juntados++;
  }
  return juntados;
}

export interface ResumenEvaluacion {
  veredictos: Record<"calza" | "advertencia" | "fuera", number>;
  /** Avisos nuevos que calzan o entran con advertencia: los que merecen aviso push. */
  nuevosInteresantes: { id: string; titulo: string; precio: number | null; url: string; veredicto: string }[];
}

/** Veredicto de cada aviso contra la ficha, con los datos ya normalizados. */
export async function evaluarAvisos(
  db: ClienteDb,
  FUENTE: string,
  busquedaId: string,
  ficha: Seguimiento,
  idsExternos: string[],
  nuevosIds: string[],
): Promise<ResumenEvaluacion> {
  const resumen: ResumenEvaluacion = { veredictos: { calza: 0, advertencia: 0, fuera: 0 }, nuevosInteresantes: [] };
  if (!idsExternos.length) return resumen;
  const filas = await leer(
    db
      .from("avisos")
      .select("id, titulo, url, tipo, modelo, por_confirmar, anio, km, precio, motor, traccion, caja")
      .eq("fuente_id", FUENTE)
      .in("id_externo", idsExternos),
    "leer para evaluar",
  );
  const nuevos = new Set(nuevosIds);
  const ahora = new Date().toISOString();
  const resultados = filas.map((f) => {
    const v = evaluar(aNormalizado(f), ficha);
    resumen.veredictos[v.tipo]++;
    if (nuevos.has(f.id) && v.tipo !== "fuera") {
      resumen.nuevosInteresantes.push({ id: f.id, titulo: f.titulo, precio: f.precio, url: f.url, veredicto: v.tipo });
    }
    return { busqueda_id: busquedaId, aviso_id: f.id, veredicto: v.tipo, motivos: v.tipo === "calza" ? [] : v.motivos, evaluado_en: ahora };
  });
  await escribir(db.from("resultados").upsert(resultados, { onConflict: "busqueda_id,aviso_id" }), "resultados");
  return resumen;
}
