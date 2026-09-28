"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const trazo = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ITEMS = [
  {
    href: "/",
    etiqueta: "Seguimientos",
    icono: (activo: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" {...trazo} strokeWidth={activo ? 2 : 1.7}>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
  },
  {
    href: "/resultados",
    etiqueta: "Resultados",
    icono: (activo: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" {...trazo} strokeWidth={activo ? 2 : 1.7}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    href: "/fuentes",
    etiqueta: "Fuentes",
    icono: (activo: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" {...trazo} strokeWidth={activo ? 2 : 1.7}>
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
    ),
  },
];

const indiceDe = (ruta: string) => {
  const i = ITEMS.findIndex((x) => (x.href === "/" ? ruta === "/" : ruta.startsWith(x.href)));
  // El detalle de un auto y "Agregar aviso" se abren desde Resultados.
  return i < 0 ? (ruta.startsWith("/auto") || ruta.startsWith("/compartir") ? 1 : 0) : i;
};

/** Barra de pestañas: se marca apenas se toca, sin esperar a que cambie la página. */
export function NavInferior() {
  const ruta = usePathname();
  const [activo, setActivo] = useState(() => indiceDe(ruta));
  useEffect(() => setActivo(indiceDe(ruta)), [ruta]);

  return (
    <nav style={{ viewTransitionName: "nav-inferior" }} className="fixed inset-x-0 bottom-0 z-30 border-t border-separador bg-barra pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto grid h-[56px] max-w-2xl grid-cols-3">
        {ITEMS.map(({ href, etiqueta, icono }, i) => (
          <li key={href}>
            <Link
              href={href}
              prefetch
              transitionTypes={i === activo ? [] : [i > activo ? "nav-adelante" : "nav-atras"]}
              onClick={() => {
                if (i !== activo) navigator.vibrate?.(6);
                setActivo(i);
              }}
              aria-current={i === activo ? "page" : undefined}
              className={cn("presionable flex h-full flex-col items-center justify-center gap-1 text-[11px]", i === activo ? "font-semibold text-foreground" : "font-medium text-tenue")}
            >
              {icono(i === activo)}
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
