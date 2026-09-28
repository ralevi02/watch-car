import { z } from "zod";
import { leerDetalle } from "@/lib/datos";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: RouteContext<"/api/auto/[id]">) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "Id inválido" }, { status: 400 });
  const detalle = await leerDetalle(id.data);
  return detalle ? Response.json(detalle, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "No existe" }, { status: 404 });
}
