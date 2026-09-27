"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";

/** Interruptor de iOS (verde encendido). Cambia al instante y avisa con onCambio. */
export function Interruptor({ activo, onCambio, etiqueta, deshabilitado }: { activo: boolean; onCambio: (v: boolean) => void | Promise<void>; etiqueta: string; deshabilitado?: boolean }) {
  const [, iniciar] = useTransition();
  const [valor, setValor] = useOptimistic(activo, (_: boolean, v: boolean) => v);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={(e) => {
        e.preventDefault();
        navigator.vibrate?.(6);
        iniciar(async () => {
          setValor(!valor);
          await onCambio(!valor);
        });
      }}
      className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200", valor ? "bg-[#34C759]" : "bg-[#E9E9EA]")}
    >
      <span
        className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ transform: valor ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
