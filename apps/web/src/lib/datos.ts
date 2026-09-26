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
  veredicto: "calza" | "advertencia";
  motivos: string[];
  alertas: string[];
  alertaDetalle: string | null;
  porConfirmar: string[];
  nuevo: boolean;
  primeraVez: string;
  enlaces: EnlaceAviso[];
  marca: { estado: string | null; nota: string | null } | null;
  /** Cambios de precio del aviso principal, del más antiguo al más nuevo. */
  historial: { precio: number; fecha: string }[];
}

const HORAS_NUEVO = 48;

/** Resultados agrupados por auto (un auto puede tener avisos en varios portales). */
export async function leerResultados(busquedaId: string | undefined, filtro: Filtro) {
  const supabase = await crearClienteServidor();
  let q = supabase
    .from("resultados")
    .select(
      "veredicto, motivos, busqueda_id, avisos!inner(id, auto_id, fuente_id, url, titulo, anio, km, precio, precio_inicial, precio_descripcion, modelo, version, motor, caja, traccion, region, comuna, tipo_vendedor, vendedor, alertas, alerta_detalle, por_confirmar, estado, primera_vez)",
    )
    .neq("veredicto", "fuera")
    .neq("avisos.estado", "vendido");
  if (busquedaId) q = q.eq("busqueda_id", busquedaId);
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
        alertas: a.alertas,
        alertaDetalle: a.alerta_detalle,
        porConfirmar: a.por_confirmar,
        nuevo: ahora - new Date(a.primera_vez).getTime() < HORAS_NUEVO * 3600_000,
        primeraVez: a.primera_vez,
        enlaces: [enlace],
        marca: marcaDe.get(clave) ?? null,
        historial: [],
      });
      continue;
    }
    if (!actual.enlaces.some((e) => e.id === a.id)) actual.enlaces.push(enlace);
    // Se muestra el precio más bajo entre todos los avisos del mismo auto.
    if (a.precio !== null && (actual.precio === null || a.precio < actual.precio)) {
      actual.precio = a.precio;
      actual.avisoPrincipal = a.id;
    }
    if (veredicto === "calza") actual.veredicto = "calza";
    actual.alertas = [...new Set([...actual.alertas, ...a.alertas])];
  }

  const todos = [...porAuto.values()];
  const principales = todos.map((r) => r.avisoPrincipal);
  const { data: precios } = principales.length
    ? await supabase.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", principales).order("visto_en")
    : { data: [] };
  for (const r of todos) r.historial = (precios ?? []).filter((p) => p.aviso_id === r.avisoPrincipal).map((p) => ({ precio: p.precio, fecha: p.visto_en }));
  const bajo = (r: ResultadoAuto) => r.precio !== null && r.precioInicial !== null && r.precio < r.precioInicial;
  const visibles = todos.filter((r) => {
    const descartado = r.marca?.estado === "descartado";
    switch (filtro) {
      case "descartados":
        return descartado;
      case "favoritos":
        return r.marca?.estado === "favorito";
      case "nuevos":
        return !descartado && r.nuevo;
      case "bajo":
        return !descartado && bajo(r);
      case "advertencia":
        return !descartado && r.veredicto === "advertencia";
      default:
        return !descartado;
    }
  });
  visibles.sort((x, y) => Number(y.marca?.estado === "favorito") - Number(x.marca?.estado === "favorito") || (x.precio ?? Infinity) - (y.precio ?? Infinity));

  const cuentas = {
    todos: todos.filter((r) => r.marca?.estado !== "descartado").length,
    nuevos: todos.filter((r) => r.marca?.estado !== "descartado" && r.nuevo).length,
    bajo: todos.filter((r) => r.marca?.estado !== "descartado" && bajo(r)).length,
    advertencia: todos.filter((r) => r.marca?.estado !== "descartado" && r.veredicto === "advertencia").length,
    favoritos: todos.filter((r) => r.marca?.estado === "favorito").length,
    descartados: todos.filter((r) => r.marca?.estado === "descartado").length,
  } satisfies Record<Filtro, number>;

  return { resultados: visibles, cuentas };
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
