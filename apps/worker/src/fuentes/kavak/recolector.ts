import type { Seguimiento } from "@radar/core";
import type { Sesion } from "../../lib/navegador.js";
import { recolectarLista } from "../lista.js";
import type { OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { leerTarjeta, urlBusqueda } from "./lector.js";

export async function recolectarKavak(s: Sesion, ficha: Seguimiento, _op: OpcionesRecoleccion): Promise<ResultadoRecoleccion> {
  return recolectarLista(s, {
    nombre: "Kavak",
    maxPaginas: 1,
    url: () => urlBusqueda(ficha),
    leer: async (page) => {
      const crudas = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/cl/venta/"]')].map((a) => ({
          id: a.getAttribute("data-testid")?.match(/(\d+)$/)?.[1] ?? a.href,
          url: a.href.split("?")[0] ?? a.href,
          textos: [...a.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent?.trim()).map((e) => e.textContent!.trim()),
          foto: a.querySelector("img")?.getAttribute("src") ?? undefined,
        })),
      );
      return crudas.flatMap((c) => {
        const a = leerTarjeta(c.id, c.url, c.textos);
        return a ? [{ ...a, foto: c.foto }] : [];
      });
    },
  });
}
