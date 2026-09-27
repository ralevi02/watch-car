"use client";

import type { Seguimiento } from "@radar/core";
import { Bell, BellOff, ChevronDown, Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { borrarBusqueda, cambiarBusqueda } from "@/app/(app)/acciones";
import { FichaCard } from "@/components/ficha-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Busqueda {
  id: string;
  nombre: string;
  ficha: Seguimiento;
  activa: boolean;
  alertas: boolean;
}

const miles = (n: number) => n.toLocaleString("es-CL");

function resumen(f: Seguimiento) {
  return [
    f.anio.min ? `${f.anio.min}+` : null,
    f.km.max ? `hasta ${miles(f.km.max / 1000)} mil km` : null,
    f.precio.max ? `hasta $${miles(f.precio.max)}` : null,
    f.motoresExcluidos.length ? `sin ${f.motoresExcluidos.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Item({ b }: { b: Busqueda }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <li className="rounded-xl border border-border bg-card">
      <details className="group">
        <summary className="presionable flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold">{b.nombre}</span>
              {!b.activa && <Badge variant="outline">En pausa</Badge>}
            </div>
            <p className="truncate text-sm text-muted-foreground">{resumen(b.ficha)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/resultados?busqueda=${b.id}`} transitionTypes={["nav-adelante"]} className="presionable text-sm font-medium text-primary" onClick={(e) => e.stopPropagation()}>
              Ver avisos
            </Link>
            <ChevronDown className="size-4 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
          </div>
        </summary>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          <FichaCard ficha={b.ficha} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={pendiente} onClick={() => iniciar(() => cambiarBusqueda(b.id, { activa: !b.activa }))}>
              {b.activa ? <Pause /> : <Play />} {b.activa ? "Pausar" : "Reanudar"}
            </Button>
            <Button variant="outline" size="sm" disabled={pendiente} onClick={() => iniciar(() => cambiarBusqueda(b.id, { alertas: !b.alertas }))}>
              {b.alertas ? <BellOff /> : <Bell />} {b.alertas ? "Silenciar avisos" : "Activar avisos"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pendiente}
              onClick={() => {
                if (confirm(`¿Borrar el seguimiento «${b.nombre}»? Los avisos ya encontrados se mantienen.`)) iniciar(() => borrarBusqueda(b.id));
              }}
            >
              <Trash2 /> Borrar
            </Button>
          </div>
        </div>
      </details>
    </li>
  );
}

export function ListaSeguimientos({ busquedas }: { busquedas: Busqueda[] }) {
  if (!busquedas.length) return null;
  return (
    <section className="px-4 pt-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tus seguimientos</h2>
      <ul className="flex flex-col gap-2">
        {busquedas.map((b) => (
          <Item key={b.id} b={b} />
        ))}
      </ul>
    </section>
  );
}
