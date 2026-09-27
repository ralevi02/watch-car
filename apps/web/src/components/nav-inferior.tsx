"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const Seguimientos = ({ activo }: { activo: boolean }) =>
  activo ? (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H9.4l-4.8 3.8A.4.4 0 014 20.5V5a1 1 0 011-1z" /></svg>
  ) : (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M4 4.8h16v11.4H9.2L4 20.2z" /></svg>
  );
const Resultados = ({ activo }: { activo: boolean }) => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill={activo ? "currentColor" : "none"} stroke="currentColor" strokeWidth={activo ? 0 : 1.6} strokeLinejoin="round">
    <path d="M5.5 10.5l1.6-4.2A2 2 0 019 5h6a2 2 0 011.9 1.3l1.6 4.2A2 2 0 0120 12.4V17a1 1 0 01-1 1h-1.2a1 1 0 01-1-1v-1H7.2v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-4.6a2 2 0 011.5-1.9zM7.6 10h8.8l-1.2-3.2a.8.8 0 00-.7-.5H9.5a.8.8 0 00-.7.5z" />
  </svg>
);
const Fuentes = ({ activo }: { activo: boolean }) => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2.2 : 1.7} strokeLinecap="round">
    <circle cx="12" cy="12" r="2" fill={activo ? "currentColor" : "none"} />
    <path d="M8.5 15.5a5 5 0 010-7M15.5 8.5a5 5 0 010 7M5.6 18.4a9 9 0 010-12.8M18.4 5.6a9 9 0 010 12.8" />
  </svg>
);

const ITEMS = [
  { href: "/", etiqueta: "Seguimientos", Icono: Seguimientos },
  { href: "/resultados", etiqueta: "Resultados", Icono: Resultados },
  { href: "/fuentes", etiqueta: "Fuentes", Icono: Fuentes },
];

const indiceDe = (ruta: string) => {
  const i = ITEMS.findIndex((x) => (x.href === "/" ? ruta === "/" : ruta.startsWith(x.href)));
  // El detalle de un auto y "Agregar aviso" se abren desde Resultados.
  return i < 0 ? (ruta.startsWith("/auto") || ruta.startsWith("/compartir") ? 1 : 0) : i;
};

/** Barra de pestañas al estilo iOS: translúcida, con la pestaña activa en el color de tinte. */
export function NavInferior() {
  const ruta = usePathname();
  // La pestaña se marca apenas se toca, sin esperar a que llegue la página.
  const [activo, setActivo] = useState(() => indiceDe(ruta));
  useEffect(() => setActivo(indiceDe(ruta)), [ruta]);

  return (
    <nav
      style={{ viewTransitionName: "nav-inferior" }}
      className="fixed inset-x-0 bottom-0 z-30 bg-barra pb-[env(safe-area-inset-bottom)] shadow-[0_-0.5px_0_var(--separador)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid h-[50px] max-w-2xl grid-cols-3">
        {ITEMS.map(({ href, etiqueta, Icono }, i) => (
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
              className={cn("presionable flex h-full flex-col items-center justify-center gap-0.5 pt-1 text-[10px] font-medium", i === activo ? "text-primary" : "text-[#8A8A8E]")}
            >
              <Icono activo={i === activo} />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
