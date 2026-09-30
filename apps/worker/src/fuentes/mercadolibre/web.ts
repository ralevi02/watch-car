import type { Seguimiento } from "@radar/core";
import type { Sesion } from "../../lib/navegador.js";
import { recolectarLista } from "../lista.js";
import type { AvisoPortal, OpcionesRecoleccion, ResultadoRecoleccion } from "../tipos.js";
import { pideCuenta } from "./sesion.js";

/**
 * MercadoLibre por el sitio (autos.mercadolibre.cl), con la sesión del dueño:
 * desde 2025 la API ya no deja buscar y el sitio pide cuenta incluso para ver la
 * lista. 48 avisos por página; la página N es /_Desde_<48·(N-1)+1>.
 */
const POR_PAGINA = 48;
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function urlWeb(f: Seguimiento, pagina = 1): string {
  const base = `https://autos.mercadolibre.cl/${slug(f.marca)}/${slug(f.modeloPortal || f.modelo)}`;
  return pagina > 1 ? `${base}/_Desde_${POR_PAGINA * (pagina - 1) + 1}` : base;
}

export interface TarjetaML {
  url: string;
  titulo?: string;
  texto: string;
  foto?: string;
}

const entero = (s?: string) => (s ? Number(s.replace(/\D/g, "")) || undefined : undefined);

/** Lee una tarjeta de la lista por su texto (título, "$ 11.990.000", "2017 | 80.000 Km", "Comuna - Región"). */
export function leerTarjetaML(c: TarjetaML): AvisoPortal | null {
  const id = c.url.match(/MLC-?(\d{6,})/)?.[1];
  if (!id) return null;
  const texto = c.texto.replace(/ /g, " ");
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  // El precio puede venir partido en dos líneas ("$" y "11.990.000"); en UF no se usa.
  const precio = /\bUF\b/.test(texto) ? undefined : entero(texto.match(/\$\s*([\d.]{5,})/)?.[1]);
  const anio = entero(texto.match(/\b(19[89]\d|20[0-3]\d)\b/)?.[1]);
  const km = entero(texto.match(/([\d.]+)\s*km\b/i)?.[1]);
  const lugar = [...lineas].reverse().find((l) => / - /.test(l) && !/\$|km\b/i.test(l));
  return {
    id: `MLC${id}`,
    url: c.url.split("#")[0]!.split("?")[0]!,
    titulo: c.titulo?.trim() || lineas[0] || `Aviso MLC${id}`,
    anio,
    precio,
    km,
    region: lugar?.split(" - ").pop(),
    tipoVendedor: /tienda oficial|concesionari|automotora/i.test(texto) ? "Automotora" : undefined,
    destacado: /promocionado/i.test(texto),
    foto: c.foto && !c.foto.startsWith("data:") ? c.foto : undefined,
  };
}

export async function recolectarMLWeb(s: Sesion, ficha: Seguimiento, op: OpcionesRecoleccion): Promise<ResultadoRecoleccion> {
  const visto: { sinSesion: boolean; vacia: { url: string; titulo: string; texto: string; enlaces: number; muestraEnlaces: string[] } | null } = { sinSesion: false, vacia: null };
  const r = await recolectarLista(s, {
    nombre: "MercadoLibre",
    maxPaginas: Math.min(op.maxPaginas ?? 2, 3),
    porPagina: POR_PAGINA,
    url: (n) => urlWeb(ficha, n),
    leer: async (page) => {
      if (pideCuenta(page.url())) {
        visto.sinSesion = true;
        return [];
      }
      const crudas = await page.evaluate(() => {
        const tarjetas = [...document.querySelectorAll<HTMLElement>("li.ui-search-layout__item, .poly-card, .ui-search-result")];
        const base = tarjetas.length
          ? tarjetas
          : [...new Set([...document.querySelectorAll<HTMLAnchorElement>('a[href*="MLC"]')].map((a) => a.closest("li") ?? a.parentElement))].filter((x): x is HTMLElement => Boolean(x));
        return base.map((el) => {
          const a = el.querySelector<HTMLAnchorElement>('a[href*="MLC"]') ?? (el instanceof HTMLAnchorElement ? el : null);
          const img = el.querySelector("img");
          const src = img?.getAttribute("src") ?? "";
          return {
            url: a?.href ?? "",
            titulo: el.querySelector(".poly-component__title, .ui-search-item__title, h2, h3")?.textContent ?? undefined,
            texto: el.innerText,
            foto: src.startsWith("data:") ? (img?.getAttribute("data-src") ?? undefined) : src || undefined,
          };
        });
      });
      const avisos = crudas.flatMap((c) => {
        const a = c.url ? leerTarjetaML(c) : null;
        return a ? [a] : [];
      });
      if (!avisos.length) {
        const info = await page.evaluate(() => ({
          titulo: document.title,
          texto: document.body?.innerText.slice(0, 3000) ?? "",
          enlaces: [...document.querySelectorAll("a")].map((a) => a.href).filter((h) => /mercadolibre/.test(h)).slice(0, 15),
        }));
        visto.vacia = { url: page.url(), titulo: info.titulo, texto: info.texto, enlaces: info.enlaces.length, muestraEnlaces: info.enlaces };
      }
      return avisos;
    },
  });
  if (visto.sinSesion) r.bloqueo = "La sesión de MercadoLibre venció o pide verificar la cuenta";
  else if (!r.avisos.length && visto.vacia) r.diagnostico = { ...visto.vacia, descartadas: [] };
  return r;
}
