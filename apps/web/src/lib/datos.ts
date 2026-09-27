import "server-only";
import { Seguimiento } from "@radar/core";
import { crearClienteServidor } from "@/lib/supabase/server";

export const NOMBRE_FUENTE: Record<string, string> = {
  chileautos: "Chileautos",
  facebook: "Facebook",
  mercadolibre: "MercadoLibre",
  kavak: "Kavak",
  yapo: "Yapo",
};

/** Sin filas en fuentes = el usuario entró pero no está en "duenos" (RLS no le muestra nada). */
export async function esDueno() {
  const supabase = await crearClienteServidor();
  const { count } = await supabase.from("fuentes").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

export async function leerBusquedas() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("busquedas").select("id, nombre, ficha, activa, alertas, creada_en").order("creada_en", { ascending: false });
  return (data ?? []).flatMap((b) => {
    const f = Seguimiento.safeParse(b.ficha);
    return f.success ? [{ ...b, ficha: f.data }] : [];
  });
}

export type Filtro = "todos" | "nuevos" | "bajo" | "advertencia" | "favoritos" | "descartados";

export interface EnlaceAviso {
  id: string;
  fuente: string;
  url: string;
  precio: number | null;
  primeraVez: string;
  estado: string;
}

export interface ResultadoAuto {
  autoId: string;
  avisoPrincipal: string;
  titulo: string;
  anio: number | null;
  modelo: string | null;
  version: string | null;
  km: number | null;
  motor: string | null;
  caja: string | null;
  traccion: string | null;
  region: string | null;
  comuna: string | null;
  tipoVendedor: string | null;
  vendedor: string | null;
  precio: number | null;
  precioInicial: number | null;
  precioDescripcion: number | null;
  /** El mejor veredicto entre todas las fichas (calza gana). */
  veredicto: "calza" | "advertencia";
  motivos: string[];
  /** Veredicto por ficha, para filtrar por seguimiento en el teléfono. */
  porBusqueda: Record<string, { veredicto: "calza" | "advertencia"; motivos: string[] }>;
  alertas: string[];
  alertaDetalle: string | null;
  porConfirmar: string[];
  nuevo: boolean;
  primeraVez: string;
  enlaces: EnlaceAviso[];
  marca: { estado: string | null; nota: string | null } | null;
  /** Cambios de precio del aviso principal, del más antiguo al más nuevo. */
  historial: { precio: number; fecha: string }[];
  /** Foto principal (la del aviso más barato que tenga foto). */
  foto: string | null;
}

const HORAS_NUEVO = 48;

/**
 * Todos los resultados que no quedaron fuera, agrupados por auto (un auto puede
 * tener avisos en varios portales y calzar en varias fichas). Los filtros se
 * aplican en el teléfono, sin volver al servidor.
 */
export async function leerResultados(): Promise<ResultadoAuto[]> {
  const supabase = await crearClienteServidor();
  const q = supabase
    .from("resultados")
    .select(
      "veredicto, motivos, busqueda_id, avisos!inner(id, auto_id, fuente_id, url, titulo, anio, km, precio, precio_inicial, precio_descripcion, modelo, version, motor, caja, traccion, region, comuna, tipo_vendedor, vendedor, alertas, alerta_detalle, por_confirmar, estado, primera_vez, foto_url)",
    )
    .neq("veredicto", "fuera")
    .neq("avisos.estado", "vendido");
  const { data: filas } = await q;

  const autoIds = [...new Set((filas ?? []).map((f) => f.avisos.auto_id).filter((x): x is string => Boolean(x)))];
  const { data: marcas } = autoIds.length ? await supabase.from("marcas").select("auto_id, estado, nota").in("auto_id", autoIds) : { data: [] };
  const marcaDe = new Map((marcas ?? []).map((m) => [m.auto_id, m]));

  const porAuto = new Map<string, ResultadoAuto>();
  const ahora = Date.now();
  for (const f of filas ?? []) {
    const a = f.avisos;
    const clave = a.auto_id ?? a.id;
    const veredicto = f.veredicto === "calza" ? "calza" : "advertencia";
    const enlace: EnlaceAviso = { id: a.id, fuente: a.fuente_id, url: a.url, precio: a.precio, primeraVez: a.primera_vez, estado: a.estado };
    const actual = porAuto.get(clave);
    if (!actual) {
      porAuto.set(clave, {
        autoId: clave,
        avisoPrincipal: a.id,
        titulo: a.titulo,
        anio: a.anio,
        modelo: a.modelo,
        version: a.version,
        km: a.km,
        motor: a.motor,
        caja: a.caja,
        traccion: a.traccion,
        region: a.region,
        comuna: a.comuna,
        tipoVendedor: a.tipo_vendedor,
        vendedor: a.vendedor,
        precio: a.precio,
        precioInicial: a.precio_inicial,
        precioDescripcion: a.precio_descripcion,
        veredicto,
        motivos: f.motivos,
        porBusqueda: { [f.busqueda_id]: { veredicto, motivos: f.motivos } },
        alertas: a.alertas,
        alertaDetalle: a.alerta_detalle,
        porConfirmar: a.por_confirmar,
        nuevo: ahora - new Date(a.primera_vez).getTime() < HORAS_NUEVO * 3600_000,
        primeraVez: a.primera_vez,
        enlaces: [enlace],
        marca: marcaDe.get(clave) ?? null,
        historial: [],
        foto: a.foto_url,
      });
      continue;
    }
    if (!actual.enlaces.some((e) => e.id === a.id)) actual.enlaces.push(enlace);
    const previo = actual.porBusqueda[f.busqueda_id];
    if (!previo || veredicto === "calza") actual.porBusqueda[f.busqueda_id] = { veredicto, motivos: f.motivos };
    // Se muestra el precio más bajo entre todos los avisos del mismo auto.
    if (a.precio !== null && (actual.precio === null || a.precio < actual.precio)) {
      actual.precio = a.precio;
      actual.avisoPrincipal = a.id;
      if (a.foto_url) actual.foto = a.foto_url;
    }
    actual.foto ??= a.foto_url;
    if (veredicto === "calza") actual.veredicto = "calza";
    actual.alertas = [...new Set([...actual.alertas, ...a.alertas])];
  }

  const todos = [...porAuto.values()];
  const principales = todos.map((r) => r.avisoPrincipal);
  const { data: precios } = principales.length
    ? await supabase.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", principales).order("visto_en")
    : { data: [] };
  for (const r of todos) r.historial = (precios ?? []).filter((p) => p.aviso_id === r.avisoPrincipal).map((p) => ({ precio: p.precio, fecha: p.visto_en }));
  todos.sort((x, y) => (x.precio ?? Infinity) - (y.precio ?? Infinity));
  return todos;
}

export async function leerFuentesYPasadas() {
  const supabase = await crearClienteServidor();
  const [{ data: fuentes }, { data: pasadas }] = await Promise.all([
    supabase.from("fuentes").select("id, nombre, activa").order("activa", { ascending: false }),
    supabase
      .from("pasadas")
      .select("id, fuente_id, tipo, estado, inicio, fin, avisos_vistos, avisos_nuevos, detalle, busquedas(nombre)")
      .order("inicio", { ascending: false })
      .limit(20),
  ]);
  const { data: secretos } = await supabase.from("secretos_app").select("nombre");
  return { fuentes: fuentes ?? [], pasadas: pasadas ?? [], mlConectado: (secretos ?? []).some((x) => x.nombre === "mercadolibre") };
}

export async function leerFacebook() {
  const supabase = await crearClienteServidor();
  const [{ data: fuente }, { data: cuentas }] = await Promise.all([
    supabase.from("fuentes").select("activa, config").eq("id", "facebook").single(),
    supabase.from("cuentas_facebook").select("id, nombre, estado, sesion_guardada_en, ultima_ok, ultimo_error, pasadas_hoy, pasadas_fecha").order("orden").order("creada_en"),
  ]);
  const config = (fuente?.config ?? {}) as { rotacion?: boolean; pasadas_por_dia?: number };
  return {
    activa: fuente?.activa ?? false,
    rotacion: config.rotacion ?? true,
    pasadasPorDia: config.pasadas_por_dia ?? 3,
    cuentas: cuentas ?? [],
  };
}

export async function leerCompartidos() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("compartidos")
    .select("id, url, fuente_id, estado, error, creado_en, aviso_id, avisos(titulo, precio)")
    .order("creado_en", { ascending: false })
    .limit(15);
  return data ?? [];
}

export interface DetalleAuto {
  auto: ResultadoAuto;
  descripcion: string | null;
  fichas: { id: string; nombre: string; veredicto: string; motivos: string[] }[];
  precios: { aviso_id: string; precio: number; visto_en: string }[];
}

/** Un auto con todos sus avisos (puede estar en varios portales), para la pantalla de detalle. */
export async function leerAuto(id: string): Promise<DetalleAuto | null> {
  const supabase = await crearClienteServidor();
  const todos = await leerResultados();
  const auto = todos.find((r) => r.autoId === id || r.enlaces.some((e) => e.id === id));
  if (!auto) return null;
  const ids = auto.enlaces.map((e) => e.id);
  const [{ data: avisos }, { data: resultados }, { data: precios }] = await Promise.all([
    supabase.from("avisos").select("id, descripcion").in("id", ids),
    supabase.from("resultados").select("veredicto, motivos, busqueda_id, busquedas(nombre)").in("aviso_id", ids),
    supabase.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", ids).order("visto_en"),
  ]);
  const fichas = new Map<string, { id: string; nombre: string; veredicto: string; motivos: string[] }>();
  for (const r of resultados ?? []) {
    const previo = fichas.get(r.busqueda_id);
    if (!previo || r.veredicto === "calza") fichas.set(r.busqueda_id, { id: r.busqueda_id, nombre: r.busquedas?.nombre ?? "Ficha", veredicto: r.veredicto, motivos: r.motivos });
  }
  const descripcion = (avisos ?? []).find((a) => a.id === auto.avisoPrincipal)?.descripcion ?? (avisos ?? []).find((a) => a.descripcion)?.descripcion ?? null;
  return { auto, descripcion, fichas: [...fichas.values()], precios: precios ?? [] };
}

/** Cuántos autos calzan o entran con advertencia en cada ficha (sin contar descartados). */
export async function contarPorBusqueda(): Promise<Record<string, number>> {
  const todos = await leerResultados();
  const cuentas: Record<string, number> = {};
  for (const r of todos) {
    if (r.marca?.estado === "descartado") continue;
    for (const id of Object.keys(r.porBusqueda)) cuentas[id] = (cuentas[id] ?? 0) + 1;
  }
  return cuentas;
}
