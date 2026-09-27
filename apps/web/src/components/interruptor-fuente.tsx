"use client";

import { cambiarFuente } from "@/app/(app)/acciones";
import { Interruptor } from "@/components/ui/interruptor";

export function InterruptorFuente({ id, activa, nombre }: { id: "chileautos" | "kavak" | "yapo" | "mercadolibre"; activa: boolean; nombre: string }) {
  return <Interruptor activo={activa} etiqueta={`Buscar en ${nombre}`} onCambio={(v) => cambiarFuente(id, v)} />;
}
