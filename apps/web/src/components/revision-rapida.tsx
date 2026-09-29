"use client";

import { Car, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResultadoAuto } from "@/lib/datos";
import { fotoGrande } from "@/lib/fotos";
import { useMarcar } from "@/lib/marcar";
import { bajo, etiquetas, lineaAuto, lugar, miles, pesos, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const SALIDA = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Revisar de a uno: la tarjeta se arrastra a la derecha para guardar o a la
 * izquierda para descartar (basta un gesto rápido). Tocarla abre el auto.
 */
export function RevisionRapida({ autos, onCerrar, abrir }: { autos: ResultadoAuto[]; onCerrar: () => void; abrir: (id: string) => void }) {
  const marcar = useMarcar();
  // La cola se fija al abrir: marcar un auto no la reordena.
  const [cola] = useState(() => autos.map((r) => r.autoId));
  const porId = new Map(autos.map((r) => [r.autoId, r]));
  const [i, setI] = useState(0);
  const [hechos, setHechos] = useState({ guardados: 0, descartados: 0 });
  const tarjeta = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x0: number; y0: number; t0: number; dx: number; movio: boolean } | null>(null);
  const actual = porId.get(cola[i] ?? "");
  const siguiente = porId.get(cola[i + 1] ?? "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowRight") decidir("favorito");
      if (e.key === "ArrowLeft") decidir("descartado");
    };
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  });

  const poner = (dx: number, animar: boolean) => {
    const t = tarjeta.current;
    if (!t) return;
    t.style.transition = animar ? `transform 380ms ${SALIDA}` : "none";
    t.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    const g = t.querySelector<HTMLElement>("[data-sello='guardar']");
    const d = t.querySelector<HTMLElement>("[data-sello='descartar']");
    if (g) g.style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
    if (d) d.style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
  };

  function decidir(estado: "favorito" | "descartado") {
    if (!actual) return;
    const id = actual.autoId;
    poner((estado === "favorito" ? 1 : -1) * (window.innerWidth + 120), true);
    marcar.estado(id, estado);
    setHechos((h) => (estado === "favorito" ? { ...h, guardados: h.guardados + 1 } : { ...h, descartados: h.descartados + 1 }));
    setTimeout(() => {
      setI((n) => n + 1);
      requestAnimationFrame(() => poner(0, false));
    }, 260);
  }
  const saltar = () => {
    poner(0, false);
    setI((n) => n + 1);
  };

  const empezar = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    arrastre.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, movio: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    a.dx = e.clientX - a.x0;
    if (Math.abs(a.dx) > 6) a.movio = true;
    if (a.movio) poner(a.dx, false);
  };
  const soltar = () => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    if (!a.movio) return actual && abrir(actual.autoId);
    const v = a.dx / (performance.now() - a.t0);
    if (a.dx > 110 || v > 0.5) decidir("favorito");
    else if (a.dx < -110 || v < -0.5) decidir("descartado");
    else poner(0, true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-in flex-col bg-background fade-in duration-200" role="dialog" aria-label="Revisar de a uno">
      <header className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+6px)]">
        <button type="button" onClick={onCerrar} className="presionable flex h-11 items-center px-2 text-[16px] font-medium text-suave">
          Terminar
        </button>
        <span className="pr-3 text-[14px] tabular-nums text-muted-foreground">{actual ? `${i + 1} de ${cola.length}` : ""}</span>
      </header>

      <div className="relative mx-auto flex w-full max-w-md flex-grow items-center px-5">
        {actual ? (
          <>
            {siguiente && (
              <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 scale-[0.94] opacity-60" aria-hidden>
                <Tarjeta r={siguiente} />
              </div>
            )}
            <div
              key={actual.autoId}
              ref={tarjeta}
              onPointerDown={empezar}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerCancel={() => {
                arrastre.current = null;
                poner(0, true);
              }}
              className="relative w-full cursor-grab touch-none select-none animate-in fade-in zoom-in-95 duration-200"
            >
              <Tarjeta r={actual} />
              <span data-sello="guardar" className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-calza px-2.5 py-1 text-[16px] font-bold text-calza opacity-0">
                Guardar
              </span>
              <span data-sello="descartar" className="pointer-events-none absolute right-4 top-4 rounded-lg border-2 border-destructive px-2.5 py-1 text-[16px] font-bold text-destructive opacity-0">
                Descartar
              </span>
            </div>
          </>
        ) : (
          <div className="w-full animate-in py-10 text-center fade-in duration-200">
            <p className="text-[22px] font-bold">Listo, revisaste todo</p>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {hechos.guardados} {hechos.guardados === 1 ? "guardado" : "guardados"}, {hechos.descartados} {hechos.descartados === 1 ? "descartado" : "descartados"}.
            </p>
            <button type="button" onClick={onCerrar} className="presionable mt-6 h-[50px] rounded-full bg-primary px-8 text-[15px] font-bold text-primary-foreground">
              Volver a Resultados
            </button>
          </div>
        )}
      </div>

      {actual && (
        <div className="flex items-center justify-center gap-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4">
          <button type="button" aria-label="Descartar" onClick={() => decidir("descartado")} className="presionable flex size-16 items-center justify-center rounded-full bg-card text-destructive">
            <X className="size-7" strokeWidth={2.2} />
          </button>
          <button type="button" onClick={saltar} className="presionable h-11 rounded-full px-4 text-[15px] font-medium text-suave">
            Después
          </button>
          <button type="button" aria-label="Guardar" onClick={() => decidir("favorito")} className="presionable flex size-16 items-center justify-center rounded-full bg-card text-calza">
            <Star className="size-7" strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Tarjeta({ r }: { r: ResultadoAuto }) {
  const revisar = etiquetas(r).slice(0, 3);
  const foto = fotoGrande(r.foto, 800);
  return (
    <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      <div className="aspect-[4/3] bg-secondary">
        {foto ? (
          <img src={foto} alt="" draggable={false} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-tenue">
            <Car className="size-12" strokeWidth={1.2} />
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[24px] font-bold tabular-nums tracking-[-0.4px]">{r.precio !== null ? pesos(r.precio) : "Sin precio"}</span>
          <span className={cn("text-[13px] font-semibold", r.veredicto === "calza" ? "text-calza" : "text-advertencia")}>{r.veredicto === "calza" ? "Calza" : "Revisar"}</span>
        </div>
        <p className="truncate text-[16px] text-suave">{tituloAuto(r)}</p>
        <p className="truncate text-[14px] text-tenue">{[lineaAuto(r), lugar(r)].filter(Boolean).join(", ")}</p>
        {(revisar.length > 0 || bajo(r)) && (
          <div className="mt-2 flex flex-wrap gap-[5px]">
            {bajo(r) && <span className="etiqueta etiqueta-calza">Bajó ${miles(r.precioInicial! - r.precio!)}</span>}
            {revisar.map((e) => (
              <span key={e} className="etiqueta">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
