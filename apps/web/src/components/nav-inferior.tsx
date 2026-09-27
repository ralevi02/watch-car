"use client";

import { Car, MessageSquarePlus, RadioTower } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", etiqueta: "Seguimientos", Icono: MessageSquarePlus },
  { href: "/resultados", etiqueta: "Resultados", Icono: Car },
  { href: "/fuentes", etiqueta: "Fuentes", Icono: RadioTower },
];

const indiceDe = (ruta: string) => {
  const i = ITEMS.findIndex((x) => (x.href === "/" ? ruta === "/" : ruta.startsWith(x.href)));
  return i < 0 ? 0 : i;
};

export function NavInferior() {
  const ruta = usePathname();
  // La pestaña se marca apenas se toca, sin esperar a que llegue la página.
  const [activo, setActivo] = useState(() => indiceDe(ruta));
  useEffect(() => setActivo(indiceDe(ruta)), [ruta]);

  return (
    <nav style={{ viewTransitionName: "nav-inferior" }} className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="relative mx-auto grid h-16 max-w-2xl grid-cols-3">
        {/* Indicador que se desliza hasta la pestaña activa. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1.5 h-[calc(100%-0.75rem)] w-1/3 px-3 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `translateX(${activo * 100}%)` }}
        >
          <span className="block h-full w-full rounded-2xl bg-secondary" />
        </span>
        {ITEMS.map(({ href, etiqueta, Icono }, i) => (
          <li key={href} className="relative">
            <Link
              href={href}
              prefetch
              transitionTypes={i === activo ? [] : [i > activo ? "nav-adelante" : "nav-atras"]}
              onClick={() => {
                if (i !== activo) navigator.vibrate?.(6);
                setActivo(i);
              }}
              className={cn(
                "presionable flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium",
                i === activo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icono className={cn("size-5 transition-transform duration-300", i === activo && "-translate-y-0.5")} />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
