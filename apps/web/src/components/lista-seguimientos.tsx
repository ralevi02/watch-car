"use client";

import type { Seguimiento } from "@radar/core";
import { ChevronRight, Info, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { borrarBusqueda, cambiarBusqueda } from "@/app/(app)/acciones";
import { Chat } from "@/components/chat";
import { Encabezado } from "@/components/encabezado";
import { FichaCard } from "@/components/ficha-card";
import { Pantalla } from "@/components/pantalla";
import { Hoja } from "@/components/ui/hoja";
import { Interruptor } from "@/components/ui/interruptor";
import { useAlmacen } from "@/lib/almacen";
import { cn } from "@/lib/utils";

interface Busqueda {
  id: string;
  nombre: string;
  ficha: Seguimiento;
  activa: boolean;
  alertas: boolean;
  avisos: number;
}

const miles = (n: number) => n.toLocaleString("es-CL");

function resumen(f: Seguimiento) {
  return [
    f.anio.min ? `${f.anio.min}+` : null,
    f.km.max ? `hasta ${miles(f.km.max / 1000)} mil km` : null,
    f.precio.max ? `hasta $${miles(f.precio.max / 1_000_000)} M` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function DetalleFicha({ b, onCerrar }: { b: Busqueda; onCerrar: () => void }) {
  const { cambiar, refrescar } = useAlmacen();
  const ajustar = (cambios: { activa?: boolean; alertas?: boolean }) => {
    cambiar((d) => ({ ...d, busquedas: d.busquedas.map((x) => (x.id === b.id ? { ...x, ...cambios } : x)) }));
    return cambiarBusqueda(b.id, cambios);
  };
  return (
    <div className="flex flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <FichaCard ficha={b.ficha} />
      <div className="lista-ios">
        <div className="fila-ios justify-between">
          <span>Buscar</span>
          <Interruptor activo={b.activa} etiqueta="Buscar este auto" onCambio={(v) => ajustar({ activa: v })} />
        </div>
        <div className="fila-ios justify-between">
          <span>Avisarme por notificación</span>
          <Interruptor activo={b.alertas} etiqueta="Avisarme por notificación" onCambio={(v) => ajustar({ alertas: v })} />
        </div>
      </div>
      <div className="lista-ios">
        <button
          type="button"
          onClick={() => {
            if (!confirm(`¿Borrar el seguimiento «${b.nombre}»? Los avisos ya encontrados se mantienen.`)) return;
            cambiar((d) => ({ ...d, busquedas: d.busquedas.filter((x) => x.id !== b.id) }));
            onCerrar();
            void borrarBusqueda(b.id).then(() => refrescar());
          }}
          className="fila-ios w-full justify-center text-destructive active:bg-presion"
        >
          Borrar seguimiento
        </button>
      </div>
    </div>
  );
}

export function ListaSeguimientos() {
  const { datos, refrescar } = useAlmacen();
  const cuentas: Record<string, number> = {};
  for (const r of datos?.resultados ?? []) {
    if (r.marca?.estado === "descartado") continue;
    for (const id of Object.keys(r.porBusqueda)) cuentas[id] = (cuentas[id] ?? 0) + 1;
  }
  const busquedas: Busqueda[] = (datos?.busquedas ?? []).map((b) => ({ ...b, avisos: cuentas[b.id] ?? 0 }));
  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const actual = busquedas.find((b) => b.id === abierta);

  return (
    <>
      <Encabezado titulo="Seguimientos">
        <button type="button" aria-label="Nuevo seguimiento" onClick={() => setNueva(true)} className="presionable flex size-9 items-center justify-center">
          <Plus className="size-[24px]" strokeWidth={1.9} />
        </button>
      </Encabezado>

      <Pantalla>
        <main className="flex flex-col gap-6 px-5 pb-8 pt-2">
          {!datos ? (
            <div className="lista-ios" aria-busy="true" aria-label="Cargando">
              {[0, 1].map((i) => (
                <div key={i} className="fila-ios">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : busquedas.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <p className="text-[17px] text-muted-foreground">Todavía no sigues ningún auto. Cuéntale a la app qué buscas y ella trae los avisos que calcen.</p>
              <button type="button" onClick={() => setNueva(true)} className="presionable h-[50px] rounded-full bg-primary px-6 text-[16px] font-semibold text-primary-foreground">
                Nuevo seguimiento
              </button>
            </div>
          ) : (
            <section>
              <div className="lista-ios" style={{ "--sangria": "60px" } as React.CSSProperties}>
                {busquedas.map((b) => (
                  <div key={b.id} className="flex items-center">
                    <Link href={`/resultados?busqueda=${b.id}`} transitionTypes={["nav-adelante"]} className="flex min-w-0 flex-grow items-center gap-3 py-2.5 pl-4 active:bg-presion">
                      <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-[8px]", b.activa ? "bg-secondary text-foreground" : "bg-card text-tenue")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M5.5 10.5l1.6-4.2A2 2 0 019 5h6a2 2 0 011.9 1.3l1.6 4.2A2 2 0 0120 12.4V17a1 1 0 01-1 1h-1.2a1 1 0 01-1-1v-1H7.2v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-4.6a2 2 0 011.5-1.9zM7.6 10h8.8l-1.2-3.2a.8.8 0 00-.7-.5H9.5a.8.8 0 00-.7.5z" />
                        </svg>
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[16px] font-medium leading-[22px]">{b.nombre}</span>
                        <span className="truncate text-[13px] leading-[18px] text-muted-foreground">{b.activa ? resumen(b.ficha) : "En pausa"}</span>
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[16px] text-muted-foreground">
                        {b.avisos}
                        <ChevronRight className="size-5 text-tenue" strokeWidth={2} />
                      </span>
                    </Link>
                    <button type="button" aria-label={`Ver ficha de ${b.nombre}`} onClick={() => setAbierta(b.id)} className="presionable flex h-full items-center px-4 text-suave">
                      <Info className="size-[21px]" strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="pie-grupo">El número es cuántos avisos calzan o entran con advertencia. La ⓘ abre la ficha.</p>
            </section>
          )}
        </main>
      </Pantalla>

      <Hoja abierta={nueva} onCerrar={() => setNueva(false)} titulo="Nuevo seguimiento" izquierda={<button type="button" onClick={() => setNueva(false)}>Cancelar</button>}>
        <Chat onGuardado={() => { setNueva(false); void refrescar(); }} />
      </Hoja>

      <Hoja abierta={Boolean(actual)} onCerrar={() => setAbierta(null)} titulo={actual?.nombre ?? ""} derecha={<button type="button" onClick={() => setAbierta(null)}>Listo</button>}>
        {actual && <DetalleFicha b={actual} onCerrar={() => setAbierta(null)} />}
      </Hoja>
    </>
  );
}
