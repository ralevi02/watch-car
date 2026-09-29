import "server-only";
import { type Contacto, Seguimiento } from "@radar/core";
import { crearClienteServidor } from "@/lib/supabase/server";

export const NOMBRE_FUENTE: Record<string, string> = {
  chileautos: "Chileautos",
  facebook: "Facebook",
  mercadolibre: "MercadoLibre",
  brunofritsch: "Bruno Fritsch",
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

export type Filtro = "todos" | "nuevos" | "bajo" | "advertencia" | "favoritos" | "descartados" | "casi" | "contacto";

export interface EnlaceAviso {
  id: string;
  fuente: string;
  url: string;
  precio: number | null;
  primeraVez: string;
  estado: string;
}

export interface Remate {
  tipo: "patente" | "posible";
  fuente: string;
  lote: string | null;
  fecha: string | null;
  condicion: string | null;
  km: number | null;
  url: string | null;
}

/** Lo que marca el dueño sobre un auto. */
export interface MarcaAuto {
  estado: string | null;
  nota: string | null;
  contacto?: string | null;
  motivoDescarte?: string | null;
  visitaEn?: string | null;
}

export interface ResultadoAuto {
  autoId: string;
  avisoPrincipal: string;
  titulo: string;
  anio: number | null;
  marcaAuto: string | null;
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
  marca: MarcaAuto | null;
  /** Todas las fotos del aviso principal (si el detalle las trajo). */
  fotos: string[];
  /** Quedó fuera por poco (se muestra en "Casi calzan"). */
  casi?: boolean;
  /** Coincide con un lote de remate (misma patente, o parecido). */
  remate?: Remate | null;
  /** Cómo contactar al vendedor (teléfono, correo, código de publicación). */
  contacto?: Contacto | null;
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
const COLUMNAS_AVISO =
  "id, auto_id, fuente_id, url, titulo, marca, anio, km, precio, precio_inicial, precio_descripcion, modelo, version, motor, caja, traccion, region, comuna, tipo_vendedor, vendedor, alertas, alerta_detalle, por_confirmar, estado, primera_vez, foto_url, fotos, remate, contacto";

type FilaResultado = {
  veredicto: string;
  motivos: string[];
  busqueda_id: string;
  avisos: {
    id: string; auto_id: string | null; fuente_id: string; url: string; titulo: string; marca: string | null; anio: number | null; km: number | null;
    precio: number | null; precio_inicial: number | null; precio_descripcion: number | null; modelo: string | null; version: string | null; motor: string | null;
    caja: string | null; traccion: string | null; region: string | null; comuna: string | null; tipo_vendedor: string | null; vendedor: string | null;
    alertas: string[]; alerta_detalle: string | null; por_confirmar: string[]; estado: string; primera_vez: string; foto_url: string | null; fotos: string[]; remate: unknown; contacto: unknown;
  };
};

/** Junta las filas por auto: un auto puede tener avisos en varios portales y calzar en varias fichas. */
function agruparPorAuto(filas: FilaResultado[], marcaDe: Map<string, MarcaAuto>, casi = false): ResultadoAuto[] {
  const porAuto = new Map<string, ResultadoAuto>();
  // Si el precio que se muestra viene de un aviso que calza (no de uno con precio de mentira).
  const principalCalza = new Map<string, boolean>();
  const ahora = Date.now();
  for (const f of filas) {
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
        marcaAuto: a.marca,
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
        fotos: a.fotos ?? [],
        remate: (a.remate as Remate | null) ?? null,
        contacto: (a.contacto as Contacto | null) ?? null,
        ...(casi ? { casi: true } : {}),
      });
      principalCalza.set(clave, veredicto === "calza");
      continue;
    }
    if (!actual.enlaces.some((e) => e.id === a.id)) actual.enlaces.push(enlace);
    const previo = actual.porBusqueda[f.busqueda_id];
    if (!previo || veredicto === "calza") actual.porBusqueda[f.busqueda_id] = { veredicto, motivos: f.motivos };
    // Se muestra el precio más bajo entre los avisos que calzan (uno a $2,5 M "para revisar" no tapa al que calza).
    const esCalza = veredicto === "calza";
    const yaCalza = principalCalza.get(clave) ?? false;
    const mejor = a.precio !== null && (actual.precio === null || (esCalza && !yaCalza) || (esCalza === yaCalza && a.precio < actual.precio));
    if (mejor) {
      actual.precio = a.precio;
      actual.avisoPrincipal = a.id;
      principalCalza.set(clave, esCalza);
      if (a.foto_url) actual.foto = a.foto_url;
    }
    actual.foto ??= a.foto_url;
    if ((a.fotos?.length ?? 0) > actual.fotos.length) actual.fotos = a.fotos;
    if (veredicto === "calza") actual.veredicto = "calza";
    actual.alertas = [...new Set([...actual.alertas, ...a.alertas])];
    // El contacto más completo entre los avisos del auto (con teléfono gana).
    const c = a.contacto as Contacto | null;
    if (c && (!actual.contacto || (c.telefono && !actual.contacto.telefono))) actual.contacto = c;
    // Si algún aviso del auto salió de remate, el auto también (la patente gana a "posible").
    const r = a.remate as Remate | null;
    if (r && (!actual.remate || (r.tipo === "patente" && actual.remate.tipo !== "patente"))) actual.remate = r;
  }
  return [...porAuto.values()];
}

/**
 * Todos los resultados que no quedaron fuera, agrupados por auto, más los que
 * quedaron fuera por poco ("casi"). Los filtros se aplican en el teléfono.
 */
export async function leerResultados(): Promise<{ resultados: ResultadoAuto[]; casi: ResultadoAuto[] }> {
  const supabase = await crearClienteServidor();
  const [{ data: filas }, { data: filasCasi }] = await Promise.all([
    supabase.from("resultados").select(`veredicto, motivos, busqueda_id, avisos!inner(${COLUMNAS_AVISO})`).neq("veredicto", "fuera").neq("avisos.estado", "vendido"),
    supabase.from("resultados").select(`veredicto, motivos, busqueda_id, avisos!inner(${COLUMNAS_AVISO})`).eq("veredicto", "fuera").eq("casi", true).neq("avisos.estado", "vendido"),
  ]);

  const todas = [...(filas ?? []), ...(filasCasi ?? [])] as FilaResultado[];
  const autoIds = [...new Set(todas.map((f) => f.avisos.auto_id).filter((x): x is string => Boolean(x)))];
  const { data: marcas } = autoIds.length
    ? await supabase.from("marcas").select("auto_id, estado, nota, contacto, motivo_descarte, visita_en").in("auto_id", autoIds)
    : { data: [] };
  const marcaDe = new Map(
    (marcas ?? []).map((m) => [m.auto_id, { estado: m.estado, nota: m.nota, contacto: m.contacto, motivoDescarte: m.motivo_descarte, visitaEn: m.visita_en } satisfies MarcaAuto]),
  );

  const resultados = agruparPorAuto((filas ?? []) as FilaResultado[], marcaDe);
  const yaEstan = new Set(resultados.map((r) => r.autoId));
  const casi = agruparPorAuto((filasCasi ?? []) as FilaResultado[], marcaDe, true).filter((r) => !yaEstan.has(r.autoId));

  const principales = resultados.map((r) => r.avisoPrincipal);
  const { data: precios } = principales.length
    ? await supabase.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", principales).order("visto_en")
    : { data: [] };
  for (const r of resultados) r.historial = (precios ?? []).filter((p) => p.aviso_id === r.avisoPrincipal).map((p) => ({ precio: p.precio, fecha: p.visto_en }));
  resultados.sort((x, y) => (x.precio ?? Infinity) - (y.precio ?? Infinity));
  casi.sort((x, y) => (x.precio ?? Infinity) - (y.precio ?? Infinity));
  return { resultados, casi };
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
  const hay = (nombre: string) => (secretos ?? []).some((x) => x.nombre === nombre);
  return { fuentes: fuentes ?? [], pasadas: pasadas ?? [], mlConectado: hay("mercadolibre"), githubConectado: hay("github") || Boolean(process.env.GITHUB_DISPATCH_TOKEN) };
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

export interface Opinion {
  nombre: string;
  voto: "me_gusta" | "no_me_convence" | "dudas";
  texto: string | null;
  creada_en: string;
}

/** Lo que contó el vendedor, sacado de una nota de voz. */
export interface Llamada {
  fecha: string;
  texto: string;
  datos: Record<string, string>;
}

export type EstadoItem = "bien" | "ojo" | "mal";
export interface Visita {
  items?: Record<string, { estado?: EstadoItem; nota?: string; fotos?: string[] }>;
}

export interface DetalleAuto {
  descripcion: string | null;
  fichas: { id: string; nombre: string; veredicto: string; motivos: string[] }[];
  precios: { aviso_id: string; precio: number; visto_en: string }[];
  /** Fotos de todos los avisos del auto, sin repetir. */
  fotos: string[];
  /** Avisos del auto, para separar los que no son el mismo. */
  avisos: { id: string; fuente: string; titulo: string; separado: boolean }[];
  llamadas: Llamada[];
  visita: Visita;
  enlace: string | null;
  opiniones: Opinion[];
  correcciones: { campo: string; valor: string }[];
}

/**
 * Lo que la lista no trae de un auto: la descripción, el veredicto por ficha,
 * el historial de precios, todas las fotos, el contacto y las opiniones.
 * `id` es el del auto o de un aviso.
 */
export async function leerDetalle(id: string): Promise<DetalleAuto | null> {
  const supabase = await crearClienteServidor();
  const columnas = "id, auto_id, descripcion, precio, fuente_id, titulo, separado, foto_url, fotos";
  const { data: avisos } = await supabase.from("avisos").select(columnas).or(`auto_id.eq.${id},id.eq.${id}`);
  if (!avisos?.length) return null;
  const autoId = avisos.find((a) => a.id === id)?.auto_id ?? avisos[0]?.auto_id ?? null;
  const todos = autoId ? ((await supabase.from("avisos").select(columnas).eq("auto_id", autoId)).data ?? avisos) : avisos;
  const ids = todos.map((a) => a.id);
  const [{ data: resultados }, { data: precios }, { data: marca }, { data: enlaces }, { data: correcciones }] = await Promise.all([
    supabase.from("resultados").select("veredicto, motivos, busqueda_id, busquedas(nombre)").in("aviso_id", ids),
    supabase.from("precios").select("aviso_id, precio, visto_en").in("aviso_id", ids).order("visto_en"),
    autoId ? supabase.from("marcas").select("llamadas, visita").eq("auto_id", autoId).maybeSingle() : Promise.resolve({ data: null }),
    autoId ? supabase.from("enlaces_publicos").select("token").eq("auto_id", autoId).eq("activo", true).limit(1) : Promise.resolve({ data: [] }),
    supabase.from("correcciones").select("campo, valor, aviso_id").in("aviso_id", ids),
  ]);
  const enlace = enlaces?.[0]?.token ?? null;
  const { data: opiniones } = enlace ? await supabase.from("opiniones").select("nombre, voto, texto, creada_en").eq("token", enlace).order("creada_en") : { data: [] };
  const fichas = new Map<string, { id: string; nombre: string; veredicto: string; motivos: string[] }>();
  for (const r of resultados ?? []) {
    const previo = fichas.get(r.busqueda_id);
    if (!previo || r.veredicto === "calza") fichas.set(r.busqueda_id, { id: r.busqueda_id, nombre: r.busquedas?.nombre ?? "Ficha", veredicto: r.veredicto, motivos: r.motivos });
  }
  // La descripción del aviso más barato, o la primera que haya.
  const conPrecio = [...todos].sort((x, y) => (x.precio ?? Infinity) - (y.precio ?? Infinity));
  const descripcion = conPrecio.find((a) => a.descripcion)?.descripcion ?? null;
  const fotos = [...new Set(conPrecio.flatMap((a) => (a.fotos?.length ? a.fotos : a.foto_url ? [a.foto_url] : [])))];
  return {
    descripcion,
    fichas: [...fichas.values()],
    precios: precios ?? [],
    fotos,
    avisos: todos.map((a) => ({ id: a.id, fuente: a.fuente_id, titulo: a.titulo, separado: a.separado })),
    llamadas: (marca?.llamadas ?? []) as unknown as Llamada[],
    visita: (marca?.visita ?? {}) as Visita,
    enlace,
    opiniones: (opiniones ?? []) as Opinion[],
    correcciones: (correcciones ?? []).map((c) => ({ campo: c.campo, valor: c.valor })),
  };
}

export interface Ajustes {
  avisos: { modo: "inmediato" | "resumen"; hora: number };
  /** Comuna desde donde se calculan las distancias. */
  casa: { comuna: string } | null;
}

export async function leerAjustes(): Promise<Ajustes> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("ajustes").select("clave, valor").in("clave", ["avisos", "casa"]);
  const de = (clave: string) => data?.find((x) => x.clave === clave)?.valor as Record<string, unknown> | undefined;
  const avisos = de("avisos") ?? {};
  const casa = de("casa");
  return {
    avisos: { modo: avisos.modo === "resumen" ? "resumen" : "inmediato", hora: typeof avisos.hora === "number" ? avisos.hora : 20 },
    casa: typeof casa?.comuna === "string" && casa.comuna ? { comuna: casa.comuna } : null,
  };
}

export interface Gastos {
  /** Consultas a Gemini hoy, por modelo (la capa gratis da 20 diarias por modelo). */
  ia: { modelo: string; consultas: number }[];
  cuotaIa: number;
  proxy: { usadoMb: number; limiteMb: number; desde: string };
  /** Minutos de pasadas este mes (aproximado; en un repo público son gratis). */
  actionsMin: number;
}

export async function leerGastos(): Promise<Gastos> {
  const supabase = await crearClienteServidor();
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const { data: ajusteProxy } = await supabase.from("ajustes").select("valor").eq("clave", "proxy").maybeSingle();
  const proxy = (ajusteProxy?.valor ?? {}) as { limite_mb?: number; desde?: string };
  const desde = proxy.desde ?? "2026-09-28";
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const [{ data: usos }, { data: pasadas }] = await Promise.all([
    supabase.from("uso_ia").select("modelo").eq("dia", hoy),
    supabase.from("pasadas").select("fuente_id, kb, inicio, fin, proxy:detalle->proxy").gte("inicio", desde < inicioMes ? desde : inicioMes),
  ]);
  const porModelo = new Map<string, number>();
  for (const u of usos ?? []) porModelo.set(u.modelo, (porModelo.get(u.modelo) ?? 0) + 1);
  // Antes de marcar "proxy" en cada pasada, Facebook, Kavak y Yapo ya iban siempre por el proxy.
  const porProxy = (p: { fuente_id: string; proxy: unknown }) => p.proxy === true || (p.proxy == null && ["facebook", "kavak", "yapo"].includes(p.fuente_id));
  const kb = (pasadas ?? []).filter((p) => p.inicio >= desde && porProxy(p)).reduce((t, p) => t + (p.kb ?? 0), 0);
  const ms = (pasadas ?? []).filter((p) => p.inicio >= inicioMes && p.fin).reduce((t, p) => t + (new Date(p.fin!).getTime() - new Date(p.inicio).getTime()), 0);
  return {
    ia: [...porModelo.entries()].map(([modelo, consultas]) => ({ modelo, consultas })).sort((a, b) => b.consultas - a.consultas),
    cuotaIa: 20,
    proxy: { usadoMb: Math.round(kb / 1024), limiteMb: proxy.limite_mb ?? 1024, desde },
    actionsMin: Math.round(ms / 60_000),
  };
}

/** Todo lo que muestran las pestañas, en una sola lectura (el teléfono lo guarda). */
export async function leerTodo() {
  const [dueno, { resultados, casi }, busquedas, fuentes, facebook, ajustes, gastos] = await Promise.all([
    esDueno(),
    leerResultados(),
    leerBusquedas(),
    leerFuentesYPasadas(),
    leerFacebook(),
    leerAjustes(),
    leerGastos(),
  ]);
  let usuario: { email?: string; id?: string } | null = null;
  if (!dueno) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase.auth.getClaims();
    usuario = { email: data?.claims.email as string | undefined, id: data?.claims.sub };
  }
  return { dueno, usuario, resultados, casi, busquedas, fuentes, facebook, ajustes, gastos, leidoEn: Date.now() };
}

export type Todo = Awaited<ReturnType<typeof leerTodo>>;
