"use client";

import { ExternalLink, EyeOff, Star, StickyNote, Undo2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { guardarNota, marcarAuto } from "@/app/(app)/acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ResultadoAuto } from "@/lib/datos";
import { cn } from "@/lib/utils";

const miles = (n: number) => n.toLocaleString("es-CL");
const NOMBRE_FUENTE: Record<string, string> = { chileautos: "Chileautos", facebook: "Facebook", mercadolibre: "MercadoLibre", kavak: "Kavak", yapo: "Yapo" };
const NOMBRE_ALERTA: Record<string, string> = {
  dano: "Posible daño",
  remate: "Remate",
  perdida_total: "Pérdida total",
  compania_seguros: "De compañía de seguros",
  precio_distinto: "Precio distinto en la descripción",
  datos_inconsistentes: "Datos inconsistentes",
};
const NOMBRE_CAMPO: Record<string, string> = {
  modelo: "modelo",
  version: "versión",
  anio: "año",
  motor: "motor",
  caja: "caja",
  traccion: "tracción",
  km: "km",
  comuna: "comuna",
  tipoVendedor: "tipo de vendedor",
};

function haceDias(fecha: string) {
  const d = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  return d <= 0 ? "hoy" : d === 1 ? "hace 1 día" : `hace ${d} días`;
}

const vibrar = () => navigator.vibrate?.(8);

export function ResultadoCard({ r, destacado, ocultarAlDescartar = true }: { r: ResultadoAuto; destacado?: boolean; ocultarAlDescartar?: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [editandoNota, setEditandoNota] = useState(false);
  const [nota, setNota] = useState(r.marca?.nota ?? "");
  // La marca cambia en pantalla al tiro; el servidor confirma por detrás.
  const [estado, marcarYa] = useOptimistic(r.marca?.estado ?? null, (_: string | null, nuevo: string | null) => nuevo);
  const [saliendo, setSaliendo] = useState(false);
  const favorito = estado === "favorito";
  const descartado = estado === "descartado";

  const marcar = (nuevo: "favorito" | "descartado" | null) => {
    vibrar();
    if (nuevo === "descartado" && ocultarAlDescartar) setSaliendo(true);
    iniciar(async () => {
      marcarYa(nuevo);
      // Se deja terminar el pliegue antes de que la lista se actualice.
      if (nuevo === "descartado" && ocultarAlDescartar) await new Promise((ok) => setTimeout(ok, 280));
      await marcarAuto(r.autoId, nuevo);
    });
  };
  const bajo = r.precio !== null && r.precioInicial !== null && r.precio < r.precioInicial;
  const titulo = r.modelo ? [r.anio, r.modelo, r.version && r.version !== "No declarada" ? r.version : null].filter(Boolean).join(" ") : r.titulo;
  const datos = [
    r.km !== null ? `${miles(r.km)} km` : null,
    r.motor,
    r.caja === "automatica" ? "Automática" : r.caja === "manual" ? "Manual" : null,
    r.traccion,
    r.comuna ?? r.region,
    r.tipoVendedor === "automotora" ? (r.vendedor?.replace(/\s*\/\s*Vehículo Usado$/i, "") ?? "Automotora") : r.tipoVendedor === "particular" ? "Particular" : null,
  ].filter(Boolean);

  return (
    <div className={cn("grid transition-[grid-template-rows,opacity,translate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]", saliendo ? "grid-rows-[0fr] -translate-x-6 opacity-0" : "grid-rows-[1fr]")}>
    <div className="min-h-0">
    <article
      id={`aviso-${r.avisoPrincipal}`}
      className={cn("rounded-xl border bg-card p-4 transition-opacity", destacado ? "border-primary ring-2 ring-primary/30" : "border-border", descartado && !saliendo && "opacity-60")}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {r.veredicto === "calza" ? (
          <Badge className="bg-emerald-600 text-white">Calza</Badge>
        ) : (
          <Badge className="bg-advertencia-fondo text-advertencia">Con advertencia</Badge>
        )}
        {r.nuevo && <Badge variant="secondary">Nuevo</Badge>}
        {bajo && <Badge variant="secondary">Bajó ${miles(r.precioInicial! - r.precio!)}</Badge>}
        {favorito && <Badge variant="outline" className="animate-in fade-in zoom-in-90 duration-200">Favorito</Badge>}
      </div>

      <h3 className="mt-2 font-heading text-lg font-bold leading-tight">{titulo}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{datos.join(" · ")}</p>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{r.precio !== null ? `$${miles(r.precio)}` : "Precio no informado"}</span>
        {bajo && <span className="text-sm text-muted-foreground line-through">${miles(r.precioInicial!)}</span>}
      </div>

      {r.historial.length > 1 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Historial: {r.historial.map((h) => `$${miles(h.precio)} (${new Date(h.fecha).toLocaleDateString("es-CL", { day: "numeric", month: "short" })})`).join(" → ")}
        </p>
      )}

      {r.veredicto === "advertencia" && r.motivos.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm text-advertencia">
          {r.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {r.alertas.length > 0 && (
        <div className="mt-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <strong>{r.alertas.map((a) => NOMBRE_ALERTA[a] ?? a).join(" · ")}</strong>
          {r.alertaDetalle && <p>{r.alertaDetalle}</p>}
          {r.precioDescripcion && <p>La descripción dice ${miles(r.precioDescripcion)}.</p>}
        </div>
      )}

      {r.porConfirmar.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Por confirmar: {r.porConfirmar.map((c) => NOMBRE_CAMPO[c] ?? c).join(", ")}</p>
      )}

      <ul className="mt-3 flex flex-col gap-1.5">
        {r.enlaces.map((e) => (
          <li key={e.id}>
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="presionable flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <ExternalLink className="size-3.5" /> {NOMBRE_FUENTE[e.fuente] ?? e.fuente}
                {e.estado === "posible_vendido" && <span className="font-normal text-muted-foreground">(ya no aparece)</span>}
              </span>
              <span className="text-muted-foreground">
                {e.precio !== null ? `$${miles(e.precio)} · ` : ""}
                {haceDias(e.primeraVez)}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {r.marca?.nota && !editandoNota && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{r.marca.nota}</p>}
      {editandoNota && (
        <div className="mt-3 flex animate-in flex-col gap-2 fade-in slide-in-from-top-1 duration-200">
          <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: llamar el martes, preguntar por la correa" className="min-h-16" />
          <div className="flex gap-2">
            <Button size="sm" disabled={pendiente} onClick={() => iniciar(async () => { await guardarNota(r.autoId, nota); setEditandoNota(false); })}>
              Guardar nota
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditandoNota(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => marcar(favorito ? null : "favorito")}>
          <Star key={String(favorito)} className={cn(favorito && "fill-current text-primary animate-[pop_320ms_ease-out]")} /> {favorito ? "Quitar favorito" : "Favorito"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => marcar(descartado ? null : "descartado")}>
          {descartado ? <Undo2 /> : <EyeOff />} {descartado ? "Recuperar" : "Descartar"}
        </Button>
        {!editandoNota && (
          <Button variant="ghost" size="sm" onClick={() => setEditandoNota(true)}>
            <StickyNote /> {r.marca?.nota ? "Editar nota" : "Nota"}
          </Button>
        )}
      </div>
    </article>
    </div>
    </div>
  );
}
