"use client";

import { useTransition } from "react";
import { cambiarFuente } from "@/app/(app)/acciones";

export function InterruptorFuente({ id, activa }: { id: "chileautos" | "kavak" | "yapo" | "mercadolibre"; activa: boolean }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <input
      type="checkbox"
      aria-label={activa ? "Desactivar" : "Activar"}
      checked={activa}
      disabled={pendiente}
      onChange={(e) => iniciar(() => cambiarFuente(id, e.target.checked))}
      className="size-5 accent-primary"
    />
  );
}
