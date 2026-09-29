"use client";

import { Car, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fotoGrande } from "@/lib/fotos";

/**
 * Todas las fotos del aviso: se deslizan de lado y, al tocar una, se abre a
 * pantalla completa. La primera es la chica que ya está en caché (se ve al tiro).
 */
export function Galeria({ principal, fotos, alt }: { principal: string | null; fotos: string[]; alt: string }) {
  const lista = fotos.length ? fotos : principal ? [principal] : [];
  const [i, setI] = useState(0);
  const [completa, setCompleta] = useState<number | null>(null);
  const riel = useRef<HTMLDivElement>(null);

  const alDeslizar = () => {
    const el = riel.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (!lista.length) {
    return (
      <div className="flex aspect-[3/2] items-center justify-center rounded-[18px] bg-card text-tenue">
        <Car className="size-14" strokeWidth={1.2} />
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={riel} onScroll={alDeslizar} className="flex aspect-[3/2] snap-x snap-mandatory overflow-x-auto rounded-[18px] bg-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lista.map((f, n) => (
          <button key={f} type="button" onClick={() => setCompleta(n)} className="relative size-full shrink-0 snap-center" aria-label={`Ver foto ${n + 1} en grande`}>
            {/* La chica de la lista queda debajo mientras llega la grande. */}
            {n === 0 && principal && <img src={principal} alt="" className="absolute inset-0 size-full object-cover" />}
            <img src={fotoGrande(f) ?? f} alt={n === 0 ? alt : ""} loading={n < 2 ? "eager" : "lazy"} decoding="async" className="relative size-full object-cover" />
          </button>
        ))}
      </div>
      {lista.length > 1 && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[12px] font-medium tabular-nums text-white backdrop-blur-md">
          {i + 1} / {lista.length}
        </span>
      )}
      {completa !== null && <Visor fotos={lista} inicio={completa} onCerrar={() => setCompleta(null)} />}
    </div>
  );
}

function Visor({ fotos, inicio, onCerrar }: { fotos: string[]; inicio: number; onCerrar: () => void }) {
  const riel = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(inicio);
  useEffect(() => {
    const el = riel.current;
    if (el) el.scrollLeft = inicio * el.clientWidth;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [inicio, onCerrar]);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-in flex-col bg-black fade-in duration-200" role="dialog" aria-label="Fotos">
      <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+8px)] text-white">
        <span className="px-2 text-[14px] tabular-nums text-white/70">
          {i + 1} / {fotos.length}
        </span>
        <button type="button" aria-label="Cerrar" onClick={onCerrar} className="presionable flex size-11 items-center justify-center">
          <X className="size-6" strokeWidth={2} />
        </button>
      </div>
      <div
        ref={riel}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex flex-grow snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((f) => (
          <div key={f} className="flex size-full shrink-0 snap-center items-center justify-center">
            <img src={fotoGrande(f, 1600) ?? f} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
