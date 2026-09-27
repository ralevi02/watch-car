"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Encabezado al estilo iOS: título grande que, al hacer scroll, pasa a la
 * barra de arriba en chico. Las acciones (botones) van a la derecha.
 */
export function Encabezado({ titulo, children, izquierda }: { titulo: string; children?: React.ReactNode; izquierda?: React.ReactNode }) {
  const grande = useRef<HTMLHeadingElement>(null);
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    const el = grande.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompacto(!e?.isIntersecting), { rootMargin: "-52px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        style={{ viewTransitionName: "encabezado" }}
        className={cn(
          "sticky top-0 z-20 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-200",
          compacto ? "bg-barra shadow-[0_0.5px_0_var(--separador)] backdrop-blur-xl" : "bg-background",
        )}
      >
        <div className="relative flex h-11 items-center px-4">
          <div className="relative z-10 flex items-center gap-4">{izquierda}</div>
          <span className={cn("pointer-events-none absolute inset-x-16 truncate text-center text-[17px] font-semibold transition-opacity duration-200", compacto ? "opacity-100" : "opacity-0")}>
            {titulo}
          </span>
          <div className="relative z-10 ml-auto flex items-center gap-5 text-primary">{children}</div>
        </div>
      </div>
      <h1 ref={grande} className="px-4 pb-2 text-[34px] font-bold leading-[41px] tracking-[0.37px]">
        {titulo}
      </h1>
    </>
  );
}
