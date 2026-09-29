"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const CURVA = "cubic-bezier(0.32, 0.72, 0, 1)"; // cajón de iOS
const DURACION = 460;

/**
 * Hoja modal que sube desde abajo. Se cierra tocando el velo, con los botones
 * del encabezado o arrastrándola hacia abajo: basta un gesto rápido (se mide la
 * velocidad), no hay que llegar a un umbral. Hacia arriba se frena con fricción.
 */
export function Hoja({
  abierta,
  onCerrar,
  titulo,
  izquierda,
  derecha,
  children,
  pie,
  sinEncabezado,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  izquierda?: React.ReactNode;
  derecha?: React.ReactNode;
  children: React.ReactNode;
  /** Zona fija abajo (ej. el campo para escribir del chat). */
  pie?: React.ReactNode;
  /** Solo la manija, sin título ni botones (el contenido trae los suyos). */
  sinEncabezado?: boolean;
}) {
  // Se mantiene montada mientras termina la animación de salida.
  const [montada, setMontada] = useState(abierta);
  const hoja = useRef<HTMLElement>(null);
  const velo = useRef<HTMLButtonElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ y0: number; t0: number; dy: number } | null>(null);

  const poner = (y: number, animar: boolean) => {
    const h = hoja.current, v = velo.current;
    if (!h || !v) return;
    const alto = h.getBoundingClientRect().height || innerHeight;
    h.style.transition = animar ? `transform ${DURACION}ms ${CURVA}` : "none";
    v.style.transition = animar ? `opacity ${DURACION}ms ${CURVA}` : "none";
    h.style.transform = `translateY(${y}px)`;
    v.style.opacity = String(Math.max(0, 1 - y / alto));
  };

  useEffect(() => {
    if (abierta) {
      setMontada(true);
      document.body.style.overflow = "hidden";
      return;
    }
    document.body.style.overflow = "";
    if (!hoja.current) return;
    poner(hoja.current.getBoundingClientRect().height, true);
    const t = setTimeout(() => setMontada(false), DURACION);
    return () => clearTimeout(t);
  }, [abierta]);

  // Al montarse, parte abajo y sube.
  useEffect(() => {
    if (!montada || !abierta || !hoja.current) return;
    poner(hoja.current.getBoundingClientRect().height, false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => poner(0, true)));
    return () => cancelAnimationFrame(r);
  }, [montada]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void (document.body.style.overflow = ""), []);

  const empezar = (e: React.PointerEvent) => {
    if (arrastre.current || (e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    // Dentro del contenido solo se arrastra si está arriba del todo.
    if (cuerpo.current?.contains(e.target as Node) && cuerpo.current.scrollTop > 0) return;
    arrastre.current = { y0: e.clientY, t0: performance.now(), dy: 0 };
  };
  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    const d = e.clientY - a.y0;
    if (Math.abs(d) < 4 && a.dy === 0) return;
    if (a.dy === 0) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    a.dy = d < 0 ? d * 0.15 : d;
    poner(a.dy, false);
  };
  const soltar = () => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || a.dy === 0) return;
    const v = a.dy / (performance.now() - a.t0);
    const alto = hoja.current?.getBoundingClientRect().height ?? innerHeight;
    if (a.dy > alto * 0.3 || v > 0.11) onCerrar();
    else poner(0, true);
  };

  if (!montada) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo} onKeyDown={(e) => e.key === "Escape" && onCerrar()}>
      <button ref={velo} type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 cursor-default bg-[var(--velo)] opacity-0" />
      <section
        ref={hoja}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        style={{ transform: "translateY(100%)" }}
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-w-2xl flex-col rounded-t-[22px] bg-hoja shadow-[0_-10px_40px_rgba(0,0,0,0.18)] will-change-transform",
          "top-[max(2.5rem,env(safe-area-inset-top))]",
        )}
      >
        <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2">
          <span className="h-[5px] w-10 rounded-full bg-[var(--agarre)]" />
        </div>
        {!sinEncabezado && (
          <header className="grid shrink-0 touch-none grid-cols-[1fr_auto_1fr] items-center px-4 pb-3 pt-1.5">
            <div className="justify-self-start text-[16px] text-primary">{izquierda}</div>
            <h2 className="truncate text-[16px] font-semibold">{titulo}</h2>
            <div className="justify-self-end text-[16px] font-semibold text-primary">{derecha}</div>
          </header>
        )}
        <div ref={cuerpo} className="min-h-0 flex-grow overflow-y-auto overscroll-contain">
          {children}
        </div>
        {pie}
      </section>
    </div>,
    document.body,
  );
}
