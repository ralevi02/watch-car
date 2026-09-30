import type { Seguimiento } from "@radar/core";
import type { ClienteDb } from "@radar/db";
import { esperar } from "../../lib/navegador.js";
import type { AvisoPortal, DetallePortal, OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { API, leerResultado, urlBusqueda, type ResultadoML } from "./lector.js";

interface Tokens {
  access_token: string;
  refresh_token: string;
  /** Epoch en ms. */
  expira: number;
}

/**
 * Token de acceso vigente. Los de MercadoLibre duran 6 h; el refresh_token es
 * de un solo uso, así que se guarda el nuevo cada vez que se renueva.
 */
export async function tokenVigente(db: ClienteDb): Promise<string> {
  const { data, error } = await db.rpc("leer_secreto_app", { p_nombre: "mercadolibre" });
  if (error || !data) throw new Error("MercadoLibre no está conectado (falta el paso «Conectar MercadoLibre» en la app).");
  const t = JSON.parse(data) as Tokens;
  if (t.expira - Date.now() > 10 * 60_000) return t.access_token;
  const id = process.env.ML_CLIENT_ID;
  const secreto = process.env.ML_CLIENT_SECRET;
  if (!id || !secreto) throw new Error("Faltan ML_CLIENT_ID y ML_CLIENT_SECRET para renovar el token.");
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: id, client_secret: secreto, refresh_token: t.refresh_token }),
  });
  if (!r.ok) throw new Error(`MercadoLibre no renovó el token (HTTP ${r.status}); hay que volver a conectar.`);
  const j = (await r.json()) as { access_token: string; refresh_token: string; expires_in: number };
  const nuevos: Tokens = { access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + j.expires_in * 1000 };
  const { error: e2 } = await db.rpc("guardar_secreto_app", { p_nombre: "mercadolibre", p_valor: JSON.stringify(nuevos) });
  if (e2) throw new Error(`Supabase (guardar token): ${e2.message}`);
  return nuevos.access_token;
}

/**
 * ¿Sigue cerrada la búsqueda? Desde 2025 MercadoLibre responde 403 en
 * /sites/MLC/search a las apps sin permiso especial (el token sí vale para
 * /items). Se prueba una vez por pasada, por si la vuelven a abrir.
 */
export async function busquedaCerrada(token: string): Promise<boolean> {
  const r = await fetch(`${API}/sites/MLC/search?category=MLC1744&limit=1`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  return r.status === 403;
}

/** Recolector sin navegador: consulta la API con el token del dueño. */
export function crearRecolectorML(db: ClienteDb) {
  return async (_s: unknown, ficha: Seguimiento, op: OpcionesRecoleccion): Promise<ResultadoRecoleccion> => {
    const t0 = Date.now();
    const r: ResultadoRecoleccion = { url: urlBusqueda(ficha), paginasLeidas: 0, paginasTotales: 0, avisos: [], detalles: {}, descartadas: [], bloqueo: null, errores: [], capturas: [], kb: 0, ms: 0 };
    const avisos = new Map<string, AvisoPortal>();
    const detalles: Record<string, DetallePortal> = {};
    try {
      const token = await tokenVigente(db);
      const maxPaginas = Math.min(op.maxPaginas ?? 2, 4);
      for (let n = 0; n < maxPaginas; n++) {
        if (n > 0) await esperar(1500);
        const resp = await fetch(urlBusqueda(ficha, n * 50), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
        if (resp.status === 401 || resp.status === 403) {
          r.bloqueo = `La API de búsqueda de MercadoLibre respondió HTTP ${resp.status}`;
          break;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const cuerpo = await resp.text();
        r.kb += Math.round(cuerpo.length / 1024);
        const j = JSON.parse(cuerpo) as { results?: ResultadoML[]; paging?: { total?: number } };
        r.paginasLeidas++;
        r.totalAvisos = j.paging?.total;
        for (const x of j.results ?? []) {
          const { aviso, detalle } = leerResultado(x);
          if (!avisos.has(aviso.id)) {
            avisos.set(aviso.id, aviso);
            detalles[aviso.id] = detalle;
          }
        }
        if ((j.results?.length ?? 0) < 50) break;
      }
    } catch (e) {
      r.errores.push(`MercadoLibre: ${e instanceof Error ? e.message : String(e)}`);
    }
    r.paginasTotales = r.paginasLeidas;
    r.avisos = [...avisos.values()];
    r.detalles = detalles;
    r.ms = Date.now() - t0;
    return r;
  };
}
