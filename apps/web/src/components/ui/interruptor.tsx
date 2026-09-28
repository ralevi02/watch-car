"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Interruptor: cambia al instante y avisa con onCambio; si el valor de afuera cambia, lo sigue. */
export function Interruptor({ activo, onCambio, etiqueta, deshabilitado }: { activo: boolean; onCambio: (v: boolean) => void | Promise<unknown>; etiqueta: string; deshabilitado?: boolean }) {
  const [valor, setValor] = useState(activo);
  useEffect(() => setValor(activo), [activo]);
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
        setValor(!valor);
        void onCambio(!valor);
      }}
      className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50", valor ? "bg-[#30d158]" : "bg-[#3a3d44]")}
    >
      <span
        className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ transform: valor ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
