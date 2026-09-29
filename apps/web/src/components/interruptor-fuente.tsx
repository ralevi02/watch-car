"use client";

import { cambiarFuente } from "@/app/(app)/acciones";
import { Interruptor } from "@/components/ui/interruptor";
import { useAlmacen } from "@/lib/almacen";

export function InterruptorFuente({ id, activa, nombre }: { id: "chileautos" | "kavak" | "yapo" | "mercadolibre" | "brunofritsch" | "remates"; activa: boolean; nombre: string }) {
  const { cambiar } = useAlmacen();
  return (
    <Interruptor
      activo={activa}
      etiqueta={`Buscar en ${nombre}`}
      onCambio={(v) => {
        cambiar((d) => ({ ...d, fuentes: { ...d.fuentes, fuentes: d.fuentes.fuentes.map((f) => (f.id === id ? { ...f, activa: v } : f)) } }));
        return cambiarFuente(id, v);
      }}
    />
  );
}
