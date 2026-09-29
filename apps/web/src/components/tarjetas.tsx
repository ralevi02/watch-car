"use client";

import { Car, Star } from "lucide-react";
import Link from "next/link";
import { marcarAuto } from "@/app/(app)/acciones";
import { useAlmacen } from "@/lib/almacen";
import type { ResultadoAuto } from "@/lib/datos";
import { fotoGrande } from "@/lib/fotos";
import { bajo, etiquetas, lugar, miles, millones, pesos, tituloAuto } from "@/lib/presentar";
import { useLejos } from "@/lib/regiones";
import { cn } from "@/lib/utils";

export type Vista = "riel" | "vitrina" | "mosaico" | "lista" | "mapa";
export const VISTAS: Vista[] = ["riel", "vitrina", "mosaico", "lista", "mapa"];

/** Abrir el auto en la hoja; con Ctrl/Cmd o clic medio se deja pasar el link a /auto. */
export type Abrir = (autoId: string) => void;
export const alTocar = (abrir: Abrir, id: string) => (e: React.MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  abrir(id);
};

const Veredicto = ({ r, className }: { r: ResultadoAuto; className?: string }) => (
  <span className={cn("shrink-0 text-[12.5px] font-semibold", r.veredicto === "calza" ? "text-calza" : "text-advertencia", className)}>{r.veredicto === "calza" ? "Calza" : "Revisar"}</span>
);

function Foto({ r, ancho, className }: { r: ResultadoAuto; ancho?: number; className?: string }) {
  const src = ancho ? fotoGrande(r.foto, ancho) : r.foto;
  return (
    <div className={cn("relative overflow-hidden bg-card", className)}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-tenue">
          <Car className="size-9" strokeWidth={1.3} />
        </div>
      )}
    </div>
  );
}

/** Estrella sobre la foto: guarda al tiro, sin abrir el auto. */
function Estrella({ r }: { r: ResultadoAuto }) {
  const { cambiar } = useAlmacen();
  const favorito = r.marca?.estado === "favorito";
  const marcar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.vibrate?.(8);
    const nuevo = favorito ? null : "favorito";
    cambiar((d) => ({ ...d, resultados: d.resultados.map((x) => (x.autoId === r.autoId ? { ...x, marca: { estado: nuevo, nota: x.marca?.nota ?? null } } : x)) }));
    void marcarAuto(r.autoId, nuevo);
  };
  return (
    <button
      type="button"
      aria-label={favorito ? "Quitar de guardados" : "Guardar"}
      aria-pressed={favorito}
      onClick={marcar}
      className="presionable absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md"
    >
      <Star key={String(favorito)} className={cn("size-[17px]", favorito && "animate-[pop_320ms_ease-out] fill-current")} strokeWidth={2} />
    </button>
  );
}

export const NOMBRE_CONTACTO: Record<string, string> = { por_contactar: "Por contactar", escribi: "Escribí", respondio: "Respondió", visita: "Visita", comprado: "Comprado" };

export const Etiquetas = ({ r, max = 3 }: { r: ResultadoAuto; max?: number }) => {
  const lejos = useLejos()(r);
  const revisar = etiquetas(r).slice(0, max);
  const contacto = r.marca?.contacto ? NOMBRE_CONTACTO[r.marca.contacto] : null;
  if (!revisar.length && !bajo(r) && !contacto && !lejos) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-[5px]">
      {contacto && <span className="etiqueta etiqueta-neutra">{contacto}</span>}
      {lejos && <span className={cn("etiqueta", lejos.includes("menos") ? "etiqueta-calza" : "etiqueta-neutra")}>{lejos}</span>}
      {bajo(r) && <span className="etiqueta etiqueta-calza">Bajó ${miles(r.precioInicial! - r.precio!)}</span>}
      {revisar.map((e) => (
        <span key={e} className="etiqueta">
          {e}
        </span>
      ))}
    </span>
  );
};

const detalle = (r: ResultadoAuto) => [r.anio, r.km !== null ? `${miles(r.km)} km` : null, lugar(r)].filter(Boolean).join(", ");

/** Riel: tarjeta angosta que se desliza de lado, texto bajo la foto. */
export function TarjetaRiel({ r, abrir }: { r: ResultadoAuto; abrir: Abrir }) {
  return (
    <Link href={`/auto?id=${r.autoId}`} onClick={alTocar(abrir, r.autoId)} className={cn("presionable block", r.marca?.estado === "descartado" && "opacity-55")}>
      <div className="relative">
        <Foto r={r} ancho={640} className="aspect-[4/3] rounded-2xl" />
        <Estrella r={r} />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 px-0.5">
        <span className="text-[19px] font-bold tracking-[-0.3px] tabular-nums">{r.precio !== null ? pesos(r.precio) : "Sin precio"}</span>
        <Veredicto r={r} />
      </div>
      <p className="truncate px-0.5 text-[14px] text-suave">{tituloAuto(r)}</p>
      <p className="truncate px-0.5 text-[13.5px] text-tenue">{detalle(r)}</p>
      <div className="px-0.5">
        <Etiquetas r={r} max={2} />
      </div>
    </Link>
  );
}

/** Vitrina: una columna, foto grande. */
export function TarjetaVitrina({ r, abrir }: { r: ResultadoAuto; abrir: Abrir }) {
  return (
    <Link href={`/auto?id=${r.autoId}`} onClick={alTocar(abrir, r.autoId)} className={cn("presionable block", r.marca?.estado === "descartado" && "opacity-55")}>
      <div className="relative">
        <Foto r={r} ancho={900} className="aspect-[3/2] rounded-[14px]" />
        <Estrella r={r} />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-3">
        <span className="text-[20px] font-bold tracking-[-0.3px] tabular-nums">{r.precio !== null ? pesos(r.precio) : "Sin precio"}</span>
        <Veredicto r={r} />
      </div>
      <p className="truncate text-[14px] text-suave">
        {tituloAuto(r)}
        <span className="text-tenue">, {detalle(r)}</span>
      </p>
      <Etiquetas r={r} />
    </Link>
  );
}

/** Mosaico: dos columnas, foto cuadrada y lo justo. */
export function TarjetaMosaico({ r, abrir }: { r: ResultadoAuto; abrir: Abrir }) {
  return (
    <Link href={`/auto?id=${r.autoId}`} onClick={alTocar(abrir, r.autoId)} className={cn("presionable block min-w-0", r.marca?.estado === "descartado" && "opacity-55")}>
      <div className="relative">
        <Foto r={r} ancho={500} className="aspect-square rounded-[14px]" />
        {r.marca?.estado === "favorito" && <Star className="absolute right-2 top-2 size-4 fill-white text-white drop-shadow" strokeWidth={0} aria-label="Guardado" />}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[16px] font-bold tabular-nums">{r.precio !== null ? millones(r.precio) : "Sin precio"}</span>
        {r.veredicto === "advertencia" && <span className="size-[7px] rounded-full bg-advertencia" aria-label="Revisar" />}
      </div>
      <p className="truncate text-[13px] text-suave">{[r.modelo?.replace("Cross Country", "CC") ?? r.titulo, r.anio].filter(Boolean).join(" ")}</p>
      <p className="truncate text-[12.5px] text-tenue">{r.km !== null ? `${miles(r.km)} km` : lugar(r)}</p>
    </Link>
  );
}

/** Esqueleto de la vista elegida mientras llegan los datos. */
export function Esqueleto({ vista }: { vista: Vista }) {
  const caja = "animate-pulse bg-card";
  if (vista === "mosaico")
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-5" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <div className={cn(caja, "aspect-square rounded-[14px]")} />
            <div className={cn(caja, "mt-2 h-4 w-16 rounded")} />
          </div>
        ))}
      </div>
    );
  if (vista === "riel")
    return (
      <div className="flex gap-3 overflow-hidden" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="w-[72%] shrink-0">
            <div className={cn(caja, "aspect-[4/3] rounded-2xl")} />
            <div className={cn(caja, "mt-2.5 h-4 w-28 rounded")} />
            <div className={cn(caja, "mt-2 h-3.5 w-40 rounded")} />
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i}>
          <div className={cn(caja, "aspect-[3/2] rounded-[14px]")} />
          <div className={cn(caja, "mt-2.5 h-4 w-28 rounded")} />
        </div>
      ))}
    </div>
  );
}
