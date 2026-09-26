"use client";

import { Car, MessageSquarePlus, RadioTower } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", etiqueta: "Seguimientos", Icono: MessageSquarePlus },
  { href: "/resultados", etiqueta: "Resultados", Icono: Car },
  { href: "/fuentes", etiqueta: "Fuentes", Icono: RadioTower },
];

export function NavInferior() {
  const ruta = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid h-16 max-w-2xl grid-cols-3">
        {ITEMS.map(({ href, etiqueta, Icono }) => {
          const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                  activo ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className="size-5" />
                {etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
