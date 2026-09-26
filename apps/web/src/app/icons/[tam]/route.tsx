import { icono } from "@/lib/icono";

const TAMANOS = new Set([192, 512]);

export async function GET(_req: Request, ctx: RouteContext<"/icons/[tam]">) {
  const { tam } = await ctx.params;
  const n = Number(tam.replace("-maskable", ""));
  if (!TAMANOS.has(n)) return new Response("Tamaño no válido", { status: 404 });
  return icono(n, tam.endsWith("-maskable"));
}
