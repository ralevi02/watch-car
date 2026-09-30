import type { Seguimiento } from "@radar/core";
import type { ClienteDb } from "@radar/db";
import { leerDetalle as leerDetalleChileautos } from "./fuentes/chileautos/lector.js";
import { leerDetalle as leerDetalleFacebook } from "./fuentes/facebook/lector.js";
import type { AvisoPortal, DetallePortal, ResultadoRecoleccion } from "./fuentes/tipos.js";
import { deduplicar, evaluarAvisos, guardarPasada, normalizarPendientes } from "./guardar.js";
import { hashearFotos } from "./fotos.js";
import { pausa, type Sesion } from "./lib/navegador.js";

const entero = (s?: string) => (s ? Number(s.replace(/\D/g, "")) || undefined : undefined);

/** Arma el aviso a partir de la página de detalle (cuando no viene de una lista). */
async function leerAvisoCompartido(s: Sesion, fuente: string, id: string, url: string): Promise<{ aviso: AvisoPortal; detalle: DetallePortal }> {
  const page = await s.context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await pausa(2500, 4500);
    if (fuente === "chileautos") {
      const txt = await page.evaluate(() => document.getElementById("__NEXT_DATA__")?.textContent ?? null);
      if (!txt) throw new Error("La página no trae __NEXT_DATA__");
      const j = JSON.parse(txt) as { props?: { pageProps?: { initialRoot?: unknown } } };
      const detalle = leerDetalleChileautos(j.props?.pageProps?.initialRoot ?? j);
      const d = detalle.datos;
      const titulo = [d["Vehículo"], d["Versión"]].filter(Boolean).join(" ") || (await page.title());
      return {
        aviso: {
          id,
          url,
          titulo,
          anio: entero(d["Vehículo"]?.match(/\b(19|20)\d{2}\b/)?.[0]),
          precio: entero(d["Precio"]),
          km: entero(d["Kilometraje"]),
          combustible: d["Combustible"],
          caja: d["Transmisión"] ?? d["Tipo de caja de cambios"],
          region: d["Región"],
          destacado: false,
          // La primera foto de la galería es la principal (la que se ve en la lista).
          foto: detalle.fotos?.[0],
        },
        detalle,
      };
    }
    const { texto, fotos } = await page.evaluate(() => {
      const main = (document.querySelector('[role="main"]') as HTMLElement | null) ?? document.body;
      // Las fotos del aviso: la de og:image y las imágenes grandes del CDN (aunque no se bajen, el src está).
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
      const grandes = [...main.querySelectorAll<HTMLImageElement>('img[src*="scontent"], img[src*="fbcdn"]')]
        .filter((img) => /foto de producto|product photo/i.test(img.alt) || img.getBoundingClientRect().width >= 120)
        .map((img) => img.src);
      return { texto: main.innerText, fotos: [...new Set([...grandes, ...(og ? [og] : [])])].slice(0, 20) };
    });
    const detalle = { ...leerDetalleFacebook(texto), ...(fotos.length ? { fotos } : {}) };
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const precio = lineas.find((l) => /^\$\s?[\d.]{5,}/.test(l) || /^CLP/.test(l));
    return { aviso: { id, url, titulo: lineas[0] ?? `Aviso ${id}`, precio: entero(precio), destacado: false, foto: fotos[0] }, detalle };
  } finally {
    await page.close();
  }
}

/**
 * Procesa los links compartidos pendientes de una fuente: lee el aviso, lo
 * guarda, lo normaliza y lo evalúa contra todas las fichas activas.
 */
export async function procesarCompartidos(
  db: ClienteDb,
  s: Sesion,
  fuente: string,
  busquedas: { id: string; ficha: Seguimiento }[],
  pasadaId: string,
): Promise<number> {
  const { data: pendientes } = await db.from("compartidos").select("id, url, id_externo").eq("fuente_id", fuente).eq("estado", "pendiente").limit(5);
  let hechos = 0;
  for (const c of pendientes ?? []) {
    await pausa(3000, 6000);
    try {
      const { aviso, detalle } = await leerAvisoCompartido(s, fuente, c.id_externo ?? "", c.url);
      const r: ResultadoRecoleccion = {
        url: c.url,
        paginasLeidas: 0,
        paginasTotales: 1, // no es una pasada completa: no marca nada como no visto
        avisos: [aviso],
        detalles: { [aviso.id]: detalle },
        descartadas: [],
        bloqueo: null,
        errores: [],
        capturas: [],
        kb: 0,
        ms: 0,
      };
      const ficha = busquedas[0]?.ficha;
      if (!ficha) throw new Error("No hay fichas activas");
      const g = await guardarPasada(db, fuente, busquedas[0]!.id, ficha, r, pasadaId);
      // Hash de la foto: sirve para juntarlo con el mismo auto publicado en otro portal.
      await hashearFotos(db, g.nuevosIds);
      await normalizarPendientes(db, fuente, [aviso.id]);
      await deduplicar(db, g.nuevosIds);
      for (const b of busquedas) await evaluarAvisos(db, fuente, b.id, b.ficha, [aviso.id], []);
      const { data: fila } = await db.from("avisos").select("id").eq("fuente_id", fuente).eq("id_externo", aviso.id).single();
      await db.from("compartidos").update({ estado: "procesado", aviso_id: fila?.id ?? null, procesado_en: new Date().toISOString(), error: null }).eq("id", c.id);
      hechos++;
    } catch (e) {
      await db
        .from("compartidos")
        .update({ estado: "error", error: e instanceof Error ? e.message.split("\n")[0] : String(e), procesado_en: new Date().toISOString() })
        .eq("id", c.id);
    }
  }
  return hechos;
}
