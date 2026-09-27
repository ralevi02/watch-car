import { notFound } from "next/navigation";
import { DetalleAuto } from "@/components/detalle-auto";
import { leerAuto } from "@/lib/datos";

export default async function Auto({ params }: PageProps<"/auto/[id]">) {
  const { id } = await params;
  const detalle = await leerAuto(id);
  if (!detalle) notFound();
  return <DetalleAuto {...detalle} />;
}
