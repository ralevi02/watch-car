"use client";

import { useCallback } from "react";
import { cambiarContacto, type Contacto, marcarConMotivo } from "@/app/(app)/acciones-auto";
import { useAlmacen } from "@/lib/almacen";
import type { MarcaAuto } from "@/lib/datos";

/** Cambios sobre la marca de un auto: al tiro en el teléfono y después en el servidor. */
export function useMarcar() {
  const { cambiar } = useAlmacen();
  const tocar = useCallback(
    (autoId: string, f: (m: MarcaAuto) => MarcaAuto) =>
      cambiar((d) => {
        const aplicar = (x: (typeof d.resultados)[number]) => (x.autoId === autoId ? { ...x, marca: f(x.marca ?? { estado: null, nota: null }) } : x);
        return { ...d, resultados: d.resultados.map(aplicar), casi: (d.casi ?? []).map(aplicar) };
      }),
    [cambiar],
  );
  const estado = useCallback(
    (autoId: string, nuevo: "favorito" | "descartado" | null, motivo?: string | null) => {
      navigator.vibrate?.(8);
      tocar(autoId, (m) => ({ ...m, estado: nuevo, motivoDescarte: nuevo === "descartado" ? (motivo ?? null) : null }));
      void marcarConMotivo(autoId, nuevo, motivo);
    },
    [tocar],
  );
  const contacto = useCallback(
    (autoId: string, nuevo: Contacto | null) => {
      navigator.vibrate?.(5);
      tocar(autoId, (m) => ({ ...m, contacto: nuevo }));
      void cambiarContacto(autoId, nuevo);
    },
    [tocar],
  );
  return { estado, contacto, tocar };
}
