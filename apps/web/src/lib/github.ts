import type { crearClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

export const REPO = process.env.GITHUB_REPO || "ralevi02/watch-car";

export const FUENTES_CORRIBLES = ["chileautos", "facebook", "kavak", "yapo", "mercadolibre", "brunofritsch"] as const;
export type FuenteCorrible = (typeof FUENTES_CORRIBLES)[number];
export type EstadoCorrida = "pedida" | "en_cola" | "corriendo";

const WORKFLOW: Record<FuenteCorrible, string> = {
  chileautos: "chileautos.yml",
  facebook: "facebook.yml",
  kavak: "otros-portales.yml",
  yapo: "otros-portales.yml",
  mercadolibre: "otros-portales.yml",
  brunofritsch: "otros-portales.yml",
};

/** Qué workflows lanzar (y con qué inputs) para correr una fuente o todas. */
export function pedidosPara(fuente: FuenteCorrible | "todas"): [string, Record<string, string>][] {
  if (fuente === "todas")
    return [
      ["chileautos.yml", {}],
      ["facebook.yml", {}],
      ["otros-portales.yml", { fuente: "todas" }],
    ];
  const w = WORKFLOW[fuente];
  return [[w, w === "otros-portales.yml" ? { fuente } : {}]];
}

/** El token lo pega el dueño en Fuentes y queda en Vault; GITHUB_DISPATCH_TOKEN sirve de respaldo. */
export async function tokenGithub(supabase: Cliente) {
  const { data } = await supabase.rpc("leer_token_github");
  return data || process.env.GITHUB_DISPATCH_TOKEN || null;
}

export function github(token: string, ruta: string, init?: RequestInit) {
  return fetch(`https://api.github.com/repos/${REPO}${ruta}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
}

/** Lanza un workflow. Devuelve null si partió, o el motivo si no. */
export async function lanzarWorkflow(token: string, workflow: string, inputs: Record<string, string> = {}): Promise<string | null> {
  const r = await github(token, `/actions/workflows/${workflow}/dispatches`, { method: "POST", body: JSON.stringify({ ref: "main", inputs }) });
  if (r.ok) return null;
  if (r.status === 401) return "GitHub rechazó el token (venció o se revocó). Conéctalo de nuevo en Fuentes.";
  if (r.status === 403 || r.status === 404) return `El token no tiene permiso para correr Actions en ${REPO}.`;
  const { message } = (await r.json().catch(() => ({}))) as { message?: string };
  return `GitHub respondió ${r.status}${message ? `: ${message}` : ""}`;
}

interface Run {
  path: string;
  display_title: string;
  status: string;
}

/** Fuentes con una corrida en cola o en curso en GitHub Actions. */
export async function corridasActivas(token: string): Promise<Partial<Record<FuenteCorrible, EstadoCorrida>>> {
  const listas = await Promise.all(
    ["queued", "in_progress"].map(async (status) => {
      const r = await github(token, `/actions/runs?status=${status}&per_page=30`);
      return r.ok ? ((await r.json()) as { workflow_runs: Run[] }).workflow_runs : [];
    }),
  );
  const activas: Partial<Record<FuenteCorrible, EstadoCorrida>> = {};
  for (const run of listas.flat()) {
    const archivo = run.path.split("/").pop() ?? "";
    const estado: EstadoCorrida = run.status === "in_progress" ? "corriendo" : "en_cola";
    // "Otros portales" dice en el título qué fuente corre (ver run-name en otros-portales.yml).
    const fuentes = FUENTES_CORRIBLES.filter(
      (f) => WORKFLOW[f] === archivo && (archivo !== "otros-portales.yml" || !/·\s*(kavak|yapo|mercadolibre|brunofritsch)$/.test(run.display_title) || run.display_title.endsWith(f)),
    );
    for (const f of fuentes) if (activas[f] !== "corriendo") activas[f] = estado;
  }
  return activas;
}
