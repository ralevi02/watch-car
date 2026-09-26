import type { ResultadoPrueba } from "../lib/tipos.js";

/**
 * MercadoLibre: ¿la API de búsqueda responde sin token y con token?
 * MLC1744 = Autos y Camionetas en Chile (a confirmar con la respuesta).
 */
const URL_BUSQUEDA = "https://api.mercadolibre.com/sites/MLC/search?category=MLC1744&q=volvo%20v40&limit=5";

async function consultar(nombre: string, token?: string): Promise<ResultadoPrueba> {
  const t0 = Date.now();
  const r: ResultadoPrueba = { fuente: "mercadolibre", nombre, url: URL_BUSQUEDA, bloqueo: null, avisos: 0, kb: 0, ms: 0, json: [], muestras: [], notas: [] };
  try {
    const resp = await fetch(URL_BUSQUEDA, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    r.status = resp.status;
    const cuerpo = await resp.text();
    r.kb = Math.round(cuerpo.length / 1024);
    if (!resp.ok) {
      r.bloqueo = `HTTP ${resp.status}`;
      r.notas.push(cuerpo.slice(0, 200));
    } else {
      const j = JSON.parse(cuerpo) as { paging?: { total?: number }; results?: { title?: string; price?: number; permalink?: string }[] };
      r.avisos = j.paging?.total ?? j.results?.length ?? 0;
      r.muestras = (j.results ?? []).slice(0, 5).map((x) => ({ url: x.permalink ?? "", texto: `${x.title ?? ""} · $${x.price?.toLocaleString("es-CL") ?? "?"}` }));
      r.notas.push(`Total informado por la API: ${j.paging?.total ?? "?"}`);
    }
  } catch (e) {
    r.error = e instanceof Error ? e.message : String(e);
  }
  r.ms = Date.now() - t0;
  return r;
}

export async function probarMercadoLibre(): Promise<ResultadoPrueba[]> {
  const out = [await consultar("MercadoLibre · API sin token")];
  const token = process.env.ML_ACCESS_TOKEN;
  if (token) out.push(await consultar("MercadoLibre · API con token", token));
  else out[0]!.notas.push("No hay ML_ACCESS_TOKEN: no se probó con token");
  return out;
}
