import type { Seguimiento } from "@radar/core";
import type { Sesion } from "../../lib/navegador.js";
import { recolectarLista } from "../lista.js";
import type { OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { BASE, leerTarjeta, urlBusqueda } from "./lector.js";

export async function recolectarYapo(s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion): Promise<ResultadoRecoleccion> {
  return recolectarLista(s, {
    nombre: "Yapo",
    maxPaginas: Math.min(op.maxPaginas ?? 3, 3),
    porPagina: 20,
    url: (n) => urlBusqueda(ficha, n),
    leer: async (page) => {
      const crudas = await page.evaluate(() => {
        const vistos = new Set<string>();
        return [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/autos-usados/"]')].flatMap((a) => {
          const id = a.getAttribute("href")?.match(/\/(\d{6,})$/)?.[1];
          if (!id || vistos.has(id)) return [];
          vistos.add(id);
          return [{ id, href: a.getAttribute("href")!, texto: a.innerText, foto: a.querySelector("img")?.getAttribute("src") ?? undefined }];
        });
      });
      return crudas.flatMap((c) => {
        const a = leerTarjeta(c.id, new URL(c.href, BASE).href, c.texto);
        return a ? [{ ...a, foto: c.foto }] : [];
      });
    },
  });
}
