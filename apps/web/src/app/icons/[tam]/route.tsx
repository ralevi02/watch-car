import { icono } from "@/lib/icono";

const TAMANOS = new Set([32, 64, 192, 512]);

/** /icons/512, /icons/512-maskable, /icons/64-claro (favicon en modo claro). */
export async function GET(_req: Request, ctx: RouteContext<"/icons/[tam]">) {
  const { tam } = await ctx.params;
  const n = Number(tam.replace(/-(maskable|claro)$/, ""));
  if (!TAMANOS.has(n)) return new Response("Tamaño no válido", { status: 404 });
  return icono(n, tam.endsWith("-maskable"), tam.endsWith("-claro") ? "claro" : "oscuro");
}
