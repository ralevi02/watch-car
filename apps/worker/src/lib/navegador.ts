import { chromium, type BrowserContext, type Page } from "patchright";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LlamadaRed } from "./tipos.js";

export const OUT = join(process.cwd(), "out");
export const CAPTURAS = join(OUT, "capturas");

/** http://usuario:clave@host:puerto → formato de Playwright. */
function leerProxy(raw: string | undefined) {
  if (!raw) return undefined;
  const u = new URL(raw);
  return {
    server: `${u.protocol}//${u.hostname}:${u.port}`,
    username: decodeURIComponent(u.username) || undefined,
    password: decodeURIComponent(u.password) || undefined,
  };
}

export interface Sesion {
  context: BrowserContext;
  usaProxy: boolean;
  /** Empieza a medir tráfico y llamadas JSON desde cero. */
  medir(): { kb: () => number; json: () => LlamadaRed[] };
  cerrar(): Promise<void>;
}

const RECURSOS_BLOQUEADOS = new Set(["image", "media", "font"]);

export interface OpcionesNavegador {
  /**
   * Si se indica, solo se dejan pasar pedidos a estos dominios (y sus
   * subdominios). Corta publicidad y analítica de terceros, que es casi todo
   * el peso de las páginas.
   */
  soloDominios?: string[];
  /** Argumentos extra para Chrome (ej. tamaño de ventana en la reconexión). */
  args?: string[];
  /** false = cargar imágenes y fuentes (la reconexión las necesita para el login). */
  bloquearRecursos?: boolean;
}

const dominioPermitido = (url: string, dominios: string[]) => {
  try {
    const host = new URL(url).hostname;
    return dominios.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return true;
  }
};

export async function abrirNavegador(op: OpcionesNavegador = {}): Promise<Sesion> {
  await mkdir(CAPTURAS, { recursive: true });
  const perfil = await mkdtemp(join(tmpdir(), "radar-perfil-"));
  const proxy = leerProxy(process.env.PROXY_URL);
  const ejecutable = process.env.BROWSER_EXECUTABLE || undefined;

  // Patchright recomienda un perfil persistente, Chrome real y sin viewport fijo.
  const context = await chromium.launchPersistentContext(perfil, {
    channel: ejecutable ? undefined : "chrome",
    executablePath: ejecutable,
    headless: process.env.HEADLESS === "1",
    viewport: null,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    proxy,
    args: op.args,
  });

  // Ahorra tráfico del proxy: sin imágenes, videos ni fuentes.
  const bloquearRecursos = op.bloquearRecursos ?? process.env.BLOQUEAR_RECURSOS !== "0";
  const dominios = op.soloDominios;
  if (bloquearRecursos || dominios) {
    await context.route("**/*", (route) => {
      const req = route.request();
      if (bloquearRecursos && RECURSOS_BLOQUEADOS.has(req.resourceType())) return route.abort();
      if (dominios && !dominioPermitido(req.url(), dominios)) return route.abort();
      return route.continue();
    });
  }

  let bytes = 0;
  let llamadas: LlamadaRed[] = [];
  context.on("requestfinished", async (req) => {
    try {
      const tam = await req.sizes();
      const b = tam.responseBodySize + tam.responseHeadersSize;
      bytes += b;
      const tipo = req.resourceType();
      if (tipo !== "xhr" && tipo !== "fetch") return;
      const resp = await req.response();
      const ct = resp?.headers()["content-type"] ?? "";
      if (!ct.includes("json") && !req.url().includes("graphql")) return;
      llamadas.push({ url: req.url().slice(0, 220), status: resp?.status() ?? 0, contentType: ct, kb: Math.round(b / 1024) });
    } catch {
      /* la página se cerró antes de terminar: se ignora */
    }
  });

  return {
    context,
    usaProxy: Boolean(proxy),
    medir() {
      const base = bytes;
      llamadas = [];
      return { kb: () => Math.round((bytes - base) / 1024), json: () => [...llamadas] };
    },
    async cerrar() {
      await context.close();
    },
  };
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pausa "humana": entre min y max milisegundos. */
export const pausa = (min = 1500, max = 4000) => esperar(min + Math.random() * (max - min));

const PATRONES_BLOQUEO: [RegExp, string][] = [
  [/access denied/i, "Access Denied"],
  [/pardon our interruption/i, "Pantalla anti-bot (Pardon Our Interruption)"],
  [/just a moment|cf-chl|checking your browser/i, "Desafío de Cloudflare"],
  [/captcha|verify you are (a )?human|no soy un robot/i, "Captcha"],
  [/request blocked|forbidden|error 1020/i, "Solicitud bloqueada"],
  [/unusual traffic|tráfico inusual/i, "Tráfico inusual"],
];

export function detectarBloqueo(status: number | undefined, titulo: string, texto: string): string | null {
  if (status === 403 || status === 429) return `HTTP ${status}`;
  const muestra = `${titulo}\n${texto.slice(0, 4000)}`;
  for (const [re, nombre] of PATRONES_BLOQUEO) if (re.test(muestra)) return nombre;
  return null;
}

export async function capturar(page: Page, nombre: string): Promise<string | undefined> {
  const archivo = `${nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.png`;
  try {
    await page.screenshot({ path: join(CAPTURAS, archivo), fullPage: false });
    return `capturas/${archivo}`;
  } catch {
    return undefined;
  }
}

/** Baja la página de a poco, como una persona. */
export async function scrollHumano(page: Page, veces: number) {
  for (let i = 0; i < veces; i++) {
    await page.mouse.wheel(0, 700 + Math.random() * 500);
    await pausa(1200, 2600);
  }
}
