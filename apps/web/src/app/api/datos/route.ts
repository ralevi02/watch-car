import { leerTodo } from "@/lib/datos";

export const dynamic = "force-dynamic";

/** Lo lee el teléfono al abrir la app y cada tanto por detrás; las pestañas nunca esperan esto. */
export async function GET() {
  return Response.json(await leerTodo(), { headers: { "Cache-Control": "no-store" } });
}
