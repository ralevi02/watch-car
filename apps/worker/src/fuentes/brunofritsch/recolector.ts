import type { Seguimiento } from "@radar/core";
import { esperar, type Sesion } from "../../lib/navegador.js";
import type { OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { esDeLaFicha, leerAuto, POR_PAGINA, registros, totalDe, urlLista } from "./lector.js";

/**
 * Sin abrir páginas: se pide el JSON del catálogo con el contexto del
 * navegador (así usa el mismo proxy si hay). Son pocos autos: 1 o 2 pedidos.
 */
export async function recolectarBrunoFritsch(s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion): Promise<ResultadoRecoleccion> {
  const t0 = Date.now();
  const r: ResultadoRecoleccion = { url: urlLista(), paginasLeidas: 0, paginasTotales: 1, avisos: [], detalles: {}, descartadas: [], bloqueo: null, errores: [], capturas: [], kb: 0, ms: 0 };
  try {
    for (let desde = 0, n = 0; n < Math.min(op.maxPaginas ?? 3, 5); n++, desde += POR_PAGINA) {
      if (n > 0) await esperar(2000);
      const resp = await s.context.request.get(urlLista(desde), { headers: { Accept: "application/json" }, timeout: 30_000 });
      if (resp.status() === 403 || resp.status() === 429) {
        r.bloqueo = `Bruno Fritsch respondió HTTP ${resp.status()}`;
        break;
      }
      if (!resp.ok()) throw new Error(`HTTP ${resp.status()}`);
      const cuerpo = await resp.text();
      r.kb += Math.round(cuerpo.length / 1024);
      const j = JSON.parse(cuerpo) as unknown;
      r.paginasLeidas++;
      const total = totalDe(j);
      r.totalAvisos = total;
      r.paginasTotales = Math.max(1, Math.ceil(total / POR_PAGINA));
      for (const a of registros(j)) {
        const leido = leerAuto(a);
        if (!leido) {
          r.descartadas.push(JSON.stringify(a).slice(0, 120));
          continue;
        }
        if (!esDeLaFicha(leido.aviso, ficha)) continue;
        r.avisos.push(leido.aviso);
        // Todo viene en la lista: el "detalle" (versión, patente, fotos) se guarda al tiro.
        r.detalles[leido.aviso.id] = leido.detalle;
      }
      if (desde + POR_PAGINA >= total) break;
    }
  } catch (e) {
    r.errores.push(e instanceof Error ? e.message.split("\n")[0]! : String(e));
  }
  r.ms = Date.now() - t0;
  return r;
}
