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
          compacto ? "bg-barra shadow-[0_1px_0_var(--separador)] backdrop-blur-xl" : "bg-background",
        )}
      >
        <div className="relative flex h-11 items-center px-5">
          <div className="relative z-10 flex items-center gap-4">{izquierda}</div>
          <span className={cn("pointer-events-none absolute truncate text-[17px] font-semibold transition-opacity duration-200", izquierda ? "inset-x-24 text-center" : "left-5 right-44 text-left", compacto ? "opacity-100" : "opacity-0")}>
            {titulo}
          </span>
          <div className="relative z-10 -mr-2 ml-auto flex items-center gap-1 text-foreground">{children}</div>
        </div>
      </div>
      <h1 ref={grande} className="px-5 pb-3 pt-1 text-[28px] font-bold leading-[34px] tracking-[-0.5px]">
        {titulo}
      </h1>
    </>
  );
}
