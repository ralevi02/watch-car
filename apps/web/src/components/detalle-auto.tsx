"use client";

import { Car, ChevronLeft, ExternalLink, Share, Star, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { guardarNota, marcarAuto } from "@/app/(app)/acciones";
import { Pantalla } from "@/components/pantalla";
import { haceDias, NOMBRE_ALERTA, NOMBRE_FUENTE, tituloAuto } from "@/components/resultado-card";
import type { DetalleAuto as Datos } from "@/lib/datos";
import { fotoGrande } from "@/lib/fotos";
import { cn } from "@/lib/utils";

const miles = (n: number) => n.toLocaleString("es-CL");
const fecha = (s: string) => new Date(s).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" });
const NOMBRE_CAMPO: Record<string, string> = { modelo: "modelo", version: "versión", anio: "año", motor: "motor", caja: "caja", traccion: "tracción", km: "km", comuna: "comuna", tipoVendedor: "tipo de vendedor" };

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="fila-ios justify-between">
      <span>{etiqueta}</span>
      <span className="text-right text-muted-foreground">{valor}</span>
    </div>
  );
}

export function DetalleAuto({ auto: r, descripcion, fichas, precios }: Datos) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [estado, marcarYa] = useOptimistic(r.marca?.estado ?? null, (_: string | null, nuevo: string | null) => nuevo);
  const [nota, setNota] = useState(r.marca?.nota ?? "");
  const [notaGuardada, setNotaGuardada] = useState(r.marca?.nota ?? "");
  const [verMas, setVerMas] = useState(false);
  const favorito = estado === "favorito";
  const descartado = estado === "descartado";
  const principal = r.enlaces.find((e) => e.id === r.avisoPrincipal) ?? r.enlaces[0];
  const historial = precios.filter((p) => p.aviso_id === r.avisoPrincipal);
  const foto = fotoGrande(r.foto);

  const volver = () => {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back();
    else router.push("/resultados", { transitionTypes: ["nav-atras"] } as never);
  };
  const marcar = (nuevo: "favorito" | "descartado" | null) => {
    navigator.vibrate?.(8);
    iniciar(async () => {
      marcarYa(nuevo);
      await marcarAuto(r.autoId, nuevo);
      if (nuevo === "descartado") volver();
    });
  };
  const compartir = () => {
    if (!principal) return;
    if (navigator.share) navigator.share({ title: tituloAuto(r), url: principal.url }).catch(() => {});
    else navigator.clipboard?.writeText(principal.url);
  };

  const circulo = "presionable flex size-9 items-center justify-center rounded-full bg-white/85 text-black backdrop-blur";

  return (
    <Pantalla>
      <div className="pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <div className="relative aspect-[4/3] bg-[#E5E5EA]">
          {foto ? (
            <img src={foto} alt={`${tituloAuto(r)} ${r.anio ?? ""}`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[#AEAEB2]">
              <Car className="size-16" strokeWidth={1.2} />
            </div>
          )}
          <div className="absolute inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] flex justify-between">
            <button type="button" aria-label="Volver" onClick={volver} className={circulo}>
              <ChevronLeft className="size-6" strokeWidth={2.4} />
            </button>
            <div className="flex gap-2.5">
              <button type="button" aria-label="Compartir" onClick={compartir} className={circulo}>
                <Share className="size-[18px]" strokeWidth={2} />
              </button>
              <button type="button" aria-label={favorito ? "Quitar de guardados" : "Guardar"} aria-pressed={favorito} onClick={() => marcar(favorito ? null : "favorito")} className={circulo}>
                <Star key={String(favorito)} className={cn("size-[18px]", favorito && "animate-[pop_320ms_ease-out] fill-[#FF9500] text-[#FF9500]")} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-4 pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] text-muted-foreground">
              {[r.anio, [r.motor, r.traccion].filter(Boolean).join(" "), r.caja === "automatica" ? "Automática" : r.caja === "manual" ? "Manual" : null].filter(Boolean).join(" · ")}
            </span>
            <h1 className="text-[28px] font-bold leading-[34px]">{r.modelo ?? r.titulo}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="text-[28px] font-bold tracking-[-0.4px] text-primary">{r.precio !== null ? `$${miles(r.precio)}` : "Sin precio"}</span>
              {fichas.map((f) => (
                <span key={f.id} className={cn("rounded-full px-2.5 py-1 text-[13px] font-semibold", f.veredicto === "calza" ? "bg-calza-fondo text-calza" : "bg-advertencia-fondo text-advertencia")}>
                  {f.veredicto === "calza" ? `Calza con ${f.nombre}` : `Revisar para ${f.nombre}`}
                </span>
              ))}
            </div>
          </div>

          {(r.alertas.length > 0 || fichas.some((f) => f.veredicto !== "calza" && f.motivos.length)) && (
            <div className="flex gap-2.5 rounded-xl bg-advertencia-fondo px-3.5 py-3 text-[15px] leading-5 text-[#7A4800]">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
              <div className="flex flex-col gap-1">
                {r.alertas.length > 0 && (
                  <strong className="font-semibold">
                    {r.alertas
                      .map((a) => (a === "precio_distinto" && r.precioDescripcion ? `${NOMBRE_ALERTA[a] ?? a}: $${miles(r.precioDescripcion)}` : (NOMBRE_ALERTA[a] ?? a)))
                      .join(". ")}
                    .
                  </strong>
                )}
                {r.alertaDetalle && <span>{r.alertaDetalle}</span>}
                {fichas
                  .filter((f) => f.veredicto !== "calza")
                  .flatMap((f) => f.motivos)
                  .map((m) => (
                    <span key={m}>{m}</span>
                  ))}
              </div>
            </div>
          )}

          <section>
            <h2 className="titulo-grupo">Ficha</h2>
            <div className="lista-ios">
              {r.km !== null && <Fila etiqueta="Kilometraje" valor={`${miles(r.km)} km`} />}
              {r.version && r.version !== "No declarada" && <Fila etiqueta="Versión" valor={r.version} />}
              {r.motor && <Fila etiqueta="Motor" valor={r.motor} />}
              {r.traccion && <Fila etiqueta="Tracción" valor={r.traccion} />}
              {r.caja && <Fila etiqueta="Caja" valor={r.caja === "automatica" ? "Automática" : "Manual"} />}
              {(r.comuna || r.region) && <Fila etiqueta="Ubicación" valor={[r.comuna, r.region?.replace("Metropolitana de Santiago", "RM")].filter(Boolean).join(", ")} />}
              {r.tipoVendedor && <Fila etiqueta="Vende" valor={r.tipoVendedor === "automotora" ? (r.vendedor?.replace(/\s*\/\s*Vehículo Usado$/i, "").replace(/^Automotora\s+/i, "") ?? "Automotora") : "Particular"} />}
            </div>
            {r.porConfirmar.length > 0 && <p className="pie-grupo">Por confirmar con el vendedor: {r.porConfirmar.map((c) => NOMBRE_CAMPO[c] ?? c).join(", ")}.</p>}
          </section>

          <section>
            <h2 className="titulo-grupo">Publicado en</h2>
            <div className="lista-ios">
              {r.enlaces.map((e) => (
                <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="fila-ios justify-between active:bg-black/5">
                  <span>{NOMBRE_FUENTE[e.fuente] ?? e.fuente}</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {e.precio !== null && `$${miles(e.precio)} · `}
                    {e.estado === "posible_vendido" ? "ya no aparece" : haceDias(e.primeraVez)}
                    <ExternalLink className="size-4 text-[#C4C4C6]" strokeWidth={2.4} />
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="titulo-grupo">Precio</h2>
            <div className="lista-ios">
              {historial.length > 1 ? (
                [...historial].reverse().map((p, i) => <Fila key={p.visto_en} etiqueta={fecha(p.visto_en)} valor={<span className={i === 0 ? "font-semibold text-foreground" : undefined}>${miles(p.precio)}</span>} />)
              ) : (
                <Fila etiqueta="Sin cambios" valor={principal ? `desde ${fecha(principal.primeraVez)}` : ""} />
              )}
            </div>
          </section>

          {descripcion && (
            <section>
              <h2 className="titulo-grupo">Lo que dice el vendedor</h2>
              <div className="lista-ios">
                <div className="px-4 py-3">
                  <p className={cn("whitespace-pre-line text-[15px] leading-[21px]", !verMas && "line-clamp-5")}>{descripcion}</p>
                  {descripcion.length > 260 && (
                    <button type="button" onClick={() => setVerMas((v) => !v)} className="mt-1 text-[15px] font-medium text-primary">
                      {verMas ? "Ver menos" : "Ver más"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="titulo-grupo">Nota</h2>
            <div className="lista-ios">
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onBlur={() => {
                  if (nota.trim() === notaGuardada.trim()) return;
                  setNotaGuardada(nota);
                  iniciar(() => guardarNota(r.autoId, nota));
                }}
                placeholder="Ej: llamar el martes, preguntar por la correa"
                rows={2}
                className="block w-full resize-none bg-transparent px-4 py-3 text-[17px] leading-[22px] outline-none placeholder:text-[#C4C4C6]"
              />
            </div>
            <p className="pie-grupo">Se guarda sola al salir del campo.</p>
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(50px+env(safe-area-inset-bottom))] z-20 flex items-center gap-5 bg-barra px-4 py-2.5 shadow-[0_-0.5px_0_var(--separador)] backdrop-blur-xl">
        <button type="button" onClick={() => marcar(descartado ? null : "descartado")} className="presionable text-[17px] text-primary">
          {descartado ? "Recuperar" : "Descartar"}
        </button>
        {principal && (
          <a href={principal.url} target="_blank" rel="noopener noreferrer" className="presionable ml-auto flex h-11 items-center rounded-full bg-primary px-5 text-[17px] font-semibold text-primary-foreground">
            Ver en {NOMBRE_FUENTE[principal.fuente] ?? principal.fuente}
          </a>
        )}
      </div>
    </Pantalla>
  );
}
