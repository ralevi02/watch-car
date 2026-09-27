"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Hoja modal al estilo iOS: sube desde abajo sobre un velo oscuro, con
 * manija, título al centro y acciones a los lados. Se cierra tocando el velo.
 */
export function Hoja({
  abierta,
  onCerrar,
  titulo,
  izquierda,
  derecha,
  children,
  pie,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  izquierda?: React.ReactNode;
  derecha?: React.ReactNode;
  children: React.ReactNode;
  /** Zona fija abajo (ej. el campo para escribir del chat). */
  pie?: React.ReactNode;
}) {
  // Se mantiene montada mientras termina la animación de salida.
  const [montada, setMontada] = useState(abierta);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (abierta) {
      setMontada(true);
      const t = setTimeout(() => setVisible(true), 10);
      document.body.style.overflow = "hidden";
      return () => clearTimeout(t);
    }
    setVisible(false);
    document.body.style.overflow = "";
    const t = setTimeout(() => setMontada(false), 320);
    return () => clearTimeout(t);
  }, [abierta]);

  useEffect(() => () => void (document.body.style.overflow = ""), []);

  if (!montada) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className={cn("absolute inset-0 cursor-default bg-black/40 transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")} />
      <section
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-h-[calc(100dvh-2.5rem)] max-w-2xl flex-col rounded-t-[12px] bg-background shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-[320ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          "top-[max(2.5rem,env(safe-area-inset-top))]",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pt-1.5">
          <span className="h-[5px] w-9 rounded-full bg-[#C6C6C8]" />
        </div>
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-3 pt-2.5">
          <div className="justify-self-start text-[17px] text-primary">{izquierda}</div>
          <h2 className="truncate text-[17px] font-semibold">{titulo}</h2>
          <div className="justify-self-end text-[17px] font-semibold text-primary">{derecha}</div>
        </header>
        <div className="min-h-0 flex-grow overflow-y-auto overscroll-contain">{children}</div>
        {pie}
      </section>
    </div>,
    document.body,
  );
}
