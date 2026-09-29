"use client";

import { Car, ChevronLeft, ExternalLink, Share, Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { guardarNota, marcarAuto } from "@/app/(app)/acciones";
import { useAlmacen } from "@/lib/almacen";
import { fotoGrande } from "@/lib/fotos";
import { bajo, caja, ETIQUETA_ALERTA, etiquetas, haceDias, lugar, miles, NOMBRE_FUENTE, pesos, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const fecha = (s: string) => new Date(s).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" });
const NOMBRE_CAMPO: Record<string, string> = { modelo: "modelo", version: "versión", anio: "año", motor: "motor", caja: "caja", traccion: "tracción", km: "km", comuna: "comuna", tipoVendedor: "tipo de vendedor" };

/**
 * El auto completo. Como página (/auto?id=, para links directos) o dentro de la
 * hoja que se abre desde Resultados (enHoja, con alCerrar).
 */
export function DetalleAuto({ id: idHoja, alCerrar }: { id?: string; alCerrar?: () => void } = {}) {
  const idUrl = useSearchParams().get("id") ?? "";
  const id = idHoja ?? idUrl;
  const enHoja = idHoja !== undefined;
  const router = useRouter();
  const { datos, cambiar, detalles, pedirDetalle } = useAlmacen();
  const r = datos?.resultados.find((x) => x.autoId === id || x.enlaces.some((e) => e.id === id));
  const detalle = r ? detalles[r.autoId] : undefined;
  const [verMas, setVerMas] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const autoId = r?.autoId;

  useEffect(() => {
    if (autoId) pedirDetalle(autoId);
  }, [autoId, pedirDetalle]);

  const volver = () => {
    if (alCerrar) alCerrar();
    else if (window.history.length > 1) router.back();
    else router.push("/resultados", { transitionTypes: ["nav-atras"] } as never);
  };

  if (!r) {
    return (
      <div className="animate-in fade-in duration-150">
        <header className="flex items-center px-2 pt-[calc(env(safe-area-inset-top)+6px)]">
          <Link href="/resultados" transitionTypes={["nav-atras"]} className="flex h-11 items-center gap-0.5 pr-2 text-[16px] font-medium text-suave">
            <ChevronLeft className="size-6" strokeWidth={2} /> Resultados
          </Link>
        </header>
        {datos ? (
          <p className="px-8 py-20 text-center text-[15px] text-muted-foreground">Este auto ya no está entre tus resultados: se vendió o dejó de calzar con tus fichas.</p>
        ) : (
          <div className="mx-5 mt-2 aspect-[3/2] animate-pulse rounded-[18px] bg-card" aria-busy="true" aria-label="Cargando" />
        )}
      </div>
    );
  }

  const estado = r.marca?.estado ?? null;
  const favorito = estado === "favorito";
  const descartado = estado === "descartado";
  const principal = r.enlaces.find((e) => e.id === r.avisoPrincipal) ?? r.enlaces[0];
  const historial = (detalle?.precios ?? []).filter((p) => p.aviso_id === r.avisoPrincipal);
  const foto = fotoGrande(r.foto);
  const textoNota = nota ?? r.marca?.nota ?? "";
  const revisar = etiquetas({ ...r, alertas: r.alertas.filter((a) => a !== "precio_distinto") });
  const vende = r.tipoVendedor === "automotora" ? (r.vendedor?.replace(/\s*\/\s*Vehículo Usado$/i, "").replace(/^Automotora\s+/i, "") ?? "Automotora") : r.tipoVendedor === "particular" ? "Particular" : null;
  const datosTabla = [
    ["Año", r.anio ?? "?"],
    ["Km", r.km !== null ? miles(r.km) : "?"],
    ["Caja", caja(r.caja) ?? "?"],
    ["Motor", r.motor],
    ["Tracción", r.traccion === "AWD" ? "AWD" : r.traccion ? "4x2" : null],
    ["Vende", [vende, lugar(r)].filter(Boolean).join(", ") || null],
  ].filter((x): x is [string, string | number] => x[1] !== null && x[1] !== "");
  const pie = [
    r.porConfirmar.length ? `Por confirmar: ${r.porConfirmar.map((c) => NOMBRE_CAMPO[c] ?? c).join(", ")}` : null,
  ].filter(Boolean);

  const marcar = (nuevo: "favorito" | "descartado" | null) => {
    navigator.vibrate?.(8);
    cambiar((d) => ({ ...d, resultados: d.resultados.map((x) => (x.autoId === r.autoId ? { ...x, marca: { estado: nuevo, nota: x.marca?.nota ?? null } } : x)) }));
    void marcarAuto(r.autoId, nuevo);
    if (nuevo === "descartado") volver();
  };
  const guardar = () => {
    if (nota === null || nota.trim() === (r.marca?.nota ?? "").trim()) return;
    cambiar((d) => ({ ...d, resultados: d.resultados.map((x) => (x.autoId === r.autoId ? { ...x, marca: { estado: x.marca?.estado ?? null, nota } } : x)) }));
    void guardarNota(r.autoId, nota);
  };
  const compartir = () => {
    if (!principal) return;
    if (navigator.share) navigator.share({ title: tituloAuto(r), url: principal.url }).catch(() => {});
    else navigator.clipboard?.writeText(principal.url);
  };

  return (
    <div className="animate-in fade-in duration-150">
      <header className={cn("flex items-center justify-between px-2", enHoja ? "-mt-1" : "pt-[calc(env(safe-area-inset-top)+6px)]")}>
        {enHoja ? (
          <button type="button" onClick={volver} className="presionable flex h-11 items-center px-3 text-[16px] font-medium text-suave">
            Cerrar
          </button>
        ) : (
          <button type="button" onClick={volver} className="presionable flex h-11 items-center gap-0.5 pr-2 text-[16px] font-medium text-suave">
            <ChevronLeft className="size-6" strokeWidth={2} /> Resultados
          </button>
        )}
        <div className="flex">
          <button type="button" aria-label="Compartir" onClick={compartir} className="presionable flex size-11 items-center justify-center">
            <Share className="size-[19px]" strokeWidth={1.8} />
          </button>
          <button type="button" aria-label={favorito ? "Quitar de guardados" : "Guardar"} aria-pressed={favorito} onClick={() => marcar(favorito ? null : "favorito")} className="presionable flex size-11 items-center justify-center">
            <Star key={String(favorito)} className={cn("size-[20px]", favorito && "animate-[pop_320ms_ease-out] fill-current")} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <main className={cn("flex flex-col px-5 pt-1.5", enHoja ? "pb-6" : "pb-[calc(10rem+env(safe-area-inset-bottom))]")}>
        <div className="relative aspect-[3/2] overflow-hidden rounded-[18px] bg-card">
          {foto && r.foto ? (
            <>
              {/* La foto chica ya está en caché por la lista: se ve al tiro y la grande la tapa al llegar. */}
              <img src={r.foto} alt="" className="absolute inset-0 size-full object-cover" />
              <img src={foto} alt={`${tituloAuto(r)} ${r.anio ?? ""}`} decoding="async" className="relative size-full object-cover" />
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-tenue">
              <Car className="size-14" strokeWidth={1.2} />
            </div>
          )}
        </div>

        <h1 className="mt-5 text-[24px] font-bold leading-[29px] tracking-[-0.4px]">{[r.marcaAuto, tituloAuto(r)].filter(Boolean).join(" ")}</h1>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[30px] font-bold tracking-[-0.6px] tabular-nums">{r.precio !== null ? pesos(r.precio) : "Sin precio"}</span>
          <span className={cn("shrink-0 text-[13px] font-semibold", r.veredicto === "calza" ? "text-calza" : "text-advertencia")}>{r.veredicto === "calza" ? "Calza" : "Revisar"}</span>
        </div>

        {(revisar.length > 0 || bajo(r) || r.alertas.includes("precio_distinto")) && (
          <div className="mt-2 flex flex-wrap gap-[5px]">
            {bajo(r) && <span className="etiqueta etiqueta-calza">Bajó ${miles(r.precioInicial! - r.precio!)}</span>}
            {revisar.map((e) => (
              <span key={e} className="etiqueta">
                {e}
              </span>
            ))}
            {r.alertas.includes("precio_distinto") && (
              <span className="etiqueta">{r.precioDescripcion ? `La descripción dice ${pesos(r.precioDescripcion)}` : ETIQUETA_ALERTA.precio_distinto}</span>
            )}
          </div>
        )}

        <dl className="mt-5 flex flex-col divide-y divide-separador border-y border-separador text-[15px]">
          {datosTabla.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate text-right font-medium first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>

        {detalle?.descripcion && (
          <div className="mt-5">
            <p className={cn("whitespace-pre-line text-[15px] leading-[23px] text-suave", !verMas && "line-clamp-5")}>{detalle.descripcion}</p>
            {detalle.descripcion.length > 260 && (
              <button type="button" onClick={() => setVerMas((v) => !v)} className="mt-1 text-[15px] font-medium text-foreground">
                {verMas ? "Ver menos" : "Ver más"}
              </button>
            )}
          </div>
        )}
        {pie.length > 0 && <p className="mt-3 text-[13px] leading-[19px] text-tenue">{pie.join(". ")}.</p>}

        {detalle && detalle.fichas.length > 1 && (
          <section className="mt-7">
            <h2 className="titulo-grupo !ml-0">Tus fichas</h2>
            <div className="flex flex-col divide-y divide-separador">
              {detalle.fichas.map((f) => (
                <div key={f.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[15px]">
                  <span>{f.nombre}</span>
                  <span className={cn("text-[13px] font-semibold", f.veredicto === "calza" ? "text-calza" : "text-advertencia")}>{f.veredicto === "calza" ? "Calza" : "Revisar"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <h2 className="titulo-grupo !ml-0">Publicado en</h2>
          <div className="flex flex-col divide-y divide-separador">
            {r.enlaces.map((e) => (
              <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-3 text-[15px]">
                <span>{NOMBRE_FUENTE[e.fuente] ?? e.fuente}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {e.precio !== null && <span className="tabular-nums">{pesos(e.precio)}</span>}
                  <span>{e.estado === "posible_vendido" ? "ya no aparece" : haceDias(e.primeraVez)}</span>
                  <ExternalLink className="size-4 text-tenue" strokeWidth={2} />
                </span>
              </a>
            ))}
          </div>
        </section>

        {historial.length > 1 && (
          <section className="mt-7">
            <h2 className="titulo-grupo !ml-0">Precio</h2>
            <div className="flex flex-col divide-y divide-separador">
              {[...historial].reverse().map((p, i) => (
                <div key={p.visto_en} className="flex justify-between py-2.5 text-[15px]">
                  <span className="text-muted-foreground">{fecha(p.visto_en)}</span>
                  <span className={cn("tabular-nums", i === 0 ? "font-semibold" : "text-muted-foreground")}>{pesos(p.precio)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <h2 className="titulo-grupo !ml-0">Nota</h2>
          <textarea
            value={textoNota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={guardar}
            placeholder="Ej: llamar el martes, preguntar por la correa"
            rows={2}
            className="block w-full resize-none rounded-[14px] bg-card px-4 py-3 text-[16px] leading-[22px] outline-none placeholder:text-tenue"
          />
        </section>
      </main>

      <div
        className={cn(
          "z-20 mx-auto flex max-w-2xl items-center gap-2.5 px-5 pt-3",
          enHoja ? "sticky bottom-0 bg-hoja pb-[calc(12px+env(safe-area-inset-bottom))]" : "fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom))] bg-background pb-3",
        )}
      >
        <button type="button" onClick={() => marcar(descartado ? null : "descartado")} className="presionable h-[50px] shrink-0 rounded-full bg-card px-5 text-[15px] font-semibold">
          {descartado ? "Recuperar" : "Descartar"}
        </button>
        {principal && (
          <a href={principal.url} target="_blank" rel="noopener noreferrer" className="presionable flex h-[50px] flex-grow items-center justify-center rounded-full bg-primary text-[15px] font-bold text-primary-foreground">
            Ver en {NOMBRE_FUENTE[principal.fuente] ?? principal.fuente}
          </a>
        )}
      </div>
    </div>
  );
}
