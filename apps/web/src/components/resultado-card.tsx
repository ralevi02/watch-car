"use client";

import { Car, Star, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { marcarAuto } from "@/app/(app)/acciones";
import type { ResultadoAuto } from "@/lib/datos";
import { cn } from "@/lib/utils";

const miles = (n: number) => n.toLocaleString("es-CL");
export const NOMBRE_FUENTE: Record<string, string> = { chileautos: "Chileautos", facebook: "Facebook", mercadolibre: "MercadoLibre", kavak: "Kavak", yapo: "Yapo" };
export const NOMBRE_ALERTA: Record<string, string> = {
  dano: "Posible daño",
  remate: "Remate",
  perdida_total: "Pérdida total",
  compania_seguros: "De compañía de seguros",
  precio_distinto: "Otro precio en la descripción",
  datos_inconsistentes: "Datos que no cuadran",
};

export const haceDias = (fecha: string) => {
  const d = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
};

/** "V40 Cross Country T4 AWD": el modelo con lo que distingue a este auto. */
export function tituloAuto(r: Pick<ResultadoAuto, "modelo" | "titulo" | "motor" | "traccion" | "version">) {
  if (!r.modelo) return r.titulo;
  const version = r.version && !["No declarada", "Base CC"].includes(r.version) ? r.version : null;
  return [r.modelo, version, r.motor, r.traccion === "AWD" ? "AWD" : null].filter(Boolean).join(" ");
}

export function lineaAuto(r: Pick<ResultadoAuto, "anio" | "km" | "caja" | "comuna" | "region">) {
  return [
    r.anio,
    r.km !== null ? `${miles(r.km)} km` : null,
    r.caja === "automatica" ? "Automática" : r.caja === "manual" ? "Manual" : null,
    r.comuna ?? r.region?.replace("Metropolitana de Santiago", "RM"),
  ]
    .filter(Boolean)
    .join(" · ");
}

const vibrar = () => navigator.vibrate?.(8);

export function ResultadoCard({ r, destacado, ocultarAlDescartar = true }: { r: ResultadoAuto; destacado?: boolean; ocultarAlDescartar?: boolean }) {
  const [, iniciar] = useTransition();
  // La marca cambia en pantalla al tiro; el servidor confirma por detrás.
  const [estado, marcarYa] = useOptimistic(r.marca?.estado ?? null, (_: string | null, nuevo: string | null) => nuevo);
  const [saliendo, setSaliendo] = useState(false);
  const favorito = estado === "favorito";
  const descartado = estado === "descartado";
  const bajo = r.precio !== null && r.precioInicial !== null && r.precio < r.precioInicial;
  const fuente = r.enlaces.find((e) => e.id === r.avisoPrincipal) ?? r.enlaces[0];

  const marcar = (nuevo: "favorito" | "descartado" | null) => {
    vibrar();
    if (nuevo === "descartado" && ocultarAlDescartar) setSaliendo(true);
    iniciar(async () => {
      marcarYa(nuevo);
      if (nuevo === "descartado" && ocultarAlDescartar) await new Promise((ok) => setTimeout(ok, 280));
      await marcarAuto(r.autoId, nuevo);
    });
  };

  return (
    <div className={cn("grid transition-[grid-template-rows,opacity,translate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]", saliendo ? "grid-rows-[0fr] -translate-x-6 opacity-0" : "grid-rows-[1fr]")}>
      <div className="min-h-0">
        <article
          id={`aviso-${r.avisoPrincipal}`}
          className={cn("relative overflow-hidden rounded-[14px] bg-card", destacado && "ring-2 ring-primary", descartado && !saliendo && "opacity-60")}
        >
          <Link href={`/auto/${r.autoId}`} transitionTypes={["nav-adelante"]} className="presionable block">
            <div className="relative aspect-[16/9] bg-[#E5E5EA]">
              {r.foto ? (
                <img src={r.foto} alt={`${tituloAuto(r)} ${r.anio ?? ""}`} loading="lazy" decoding="async" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-[#AEAEB2]">
                  <Car className="size-12" strokeWidth={1.4} />
                </div>
              )}
              <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                {r.nuevo && <span className="rounded-full bg-white/85 px-2.5 py-[3px] text-xs font-semibold text-black backdrop-blur">Nuevo</span>}
                {bajo && <span className="rounded-full bg-white/85 px-2.5 py-[3px] text-xs font-semibold text-calza backdrop-blur">Bajó ${miles(r.precioInicial! - r.precio!)}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 px-3.5 pb-3.5 pt-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[17px] font-semibold leading-[22px]">{tituloAuto(r)}</span>
                {r.veredicto === "calza" ? (
                  <span className="shrink-0 rounded-full bg-calza-fondo px-2 py-[3px] text-xs font-semibold text-calza">Calza</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-advertencia-fondo px-2 py-[3px] text-xs font-semibold text-advertencia">Revisar</span>
                )}
              </div>
              <span className="text-[15px] leading-5 text-muted-foreground">{lineaAuto(r)}</span>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-[22px] font-bold tracking-[-0.3px]">{r.precio !== null ? `$${miles(r.precio)}` : "Sin precio"}</span>
                <span className="text-[13px] text-muted-foreground">
                  {fuente ? `${NOMBRE_FUENTE[fuente.fuente] ?? fuente.fuente} · ${haceDias(fuente.primeraVez)}` : ""}
                  {r.enlaces.length > 1 ? ` y ${r.enlaces.length - 1} más` : ""}
                </span>
              </div>
              {(r.alertas.length > 0 || (r.veredicto === "advertencia" && r.motivos.length > 0)) && (
                <span className="mt-1 flex items-start gap-1.5 text-[13px] leading-[18px] text-advertencia">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={2.2} />
                  {r.alertas.length > 0 ? r.alertas.map((a, i) => { const n = NOMBRE_ALERTA[a] ?? a; return i ? n.charAt(0).toLowerCase() + n.slice(1) : n; }).join(", ") : r.motivos[0]}
                </span>
              )}
            </div>
          </Link>

          <div className="absolute right-2.5 top-2.5 flex gap-2">
            <button
              type="button"
              aria-label={favorito ? "Quitar de guardados" : "Guardar"}
              aria-pressed={favorito}
              onClick={() => marcar(favorito ? null : "favorito")}
              className="presionable flex size-[34px] items-center justify-center rounded-full bg-white/85 text-black backdrop-blur"
            >
              <Star key={String(favorito)} className={cn("size-[18px]", favorito && "animate-[pop_320ms_ease-out] fill-[#FF9500] text-[#FF9500]")} strokeWidth={2} />
            </button>
          </div>
          {descartado && !ocultarAlDescartar && (
            <button type="button" onClick={() => marcar(null)} className="presionable w-full py-3 text-[15px] font-medium text-primary shadow-[inset_0_0.5px_0_var(--separador)]">
              Recuperar
            </button>
          )}
        </article>
      </div>
    </div>
  );
}
