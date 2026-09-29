"use client";

import { ChevronLeft, ExternalLink, Share, Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { guardarNota } from "@/app/(app)/acciones";
import { corregirAuto, separarAviso } from "@/app/(app)/acciones-auto";
import { ContactoAuto } from "@/components/auto/contacto";
import { Corregir } from "@/components/auto/corregir";
import { Galeria } from "@/components/auto/galeria";
import { GraficoPrecio } from "@/components/auto/grafico-precio";
import { Opiniones } from "@/components/auto/opiniones";
import { Preguntar } from "@/components/auto/preguntar";
import { Hoja } from "@/components/ui/hoja";
import { useAlmacen } from "@/lib/almacen";
import { distanciaDeCasa } from "@/lib/lugares";
import { useMarcar } from "@/lib/marcar";
import { bajo, caja, ETIQUETA_ALERTA, etiquetas, haceDias, lugar, miles, NOMBRE_FUENTE, pesos, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const fecha = (s: string) => new Date(s).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" });
const NOMBRE_CAMPO: Record<string, string> = { modelo: "modelo", version: "versión", anio: "año", motor: "motor", caja: "caja", traccion: "tracción", km: "km", comuna: "comuna", tipoVendedor: "tipo de vendedor" };

/** Por qué se descarta: sirve para sugerir cambios a la ficha. */
export const MOTIVOS_DESCARTE = ["Muy caro", "Muchos km", "Caja manual", "No es Cross Country", "Se ve mal", "Vendido", "Sospechoso", "Otro"];

/**
 * El auto completo. Como página (/auto?id=, para links directos) o dentro de la
 * hoja que se abre desde Resultados (con id y alCerrar).
 */
export function DetalleAuto({ id: idHoja, alCerrar }: { id?: string; alCerrar?: () => void } = {}) {
  const idUrl = useSearchParams().get("id") ?? "";
  const id = idHoja ?? idUrl;
  const enHoja = idHoja !== undefined;
  const router = useRouter();
  const { datos, cambiar, detalles, pedirDetalle, refrescar } = useAlmacen();
  const marcar = useMarcar();
  const todos = [...(datos?.resultados ?? []), ...(datos?.casi ?? [])];
  const r = todos.find((x) => x.autoId === id || x.enlaces.some((e) => e.id === id));
  const detalle = r ? detalles[r.autoId] : undefined;
  const [verMas, setVerMas] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [descartando, setDescartando] = useState(false);
  const [separando, setSeparando] = useState<string | null>(null);
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
  const textoNota = nota ?? r.marca?.nota ?? "";
  const revisar = etiquetas({ ...r, alertas: r.alertas.filter((a) => a !== "precio_distinto") });
  const distancia = distanciaDeCasa(r, datos?.ajustes?.casa?.comuna);
  const vende = r.tipoVendedor === "automotora" ? (r.vendedor?.replace(/\s*\/\s*Vehículo Usado$/i, "").replace(/^Automotora\s+/i, "") ?? "Automotora") : r.tipoVendedor === "particular" ? "Particular" : null;
  const datosTabla = [
    ["Año", r.anio ?? "?"],
    ["Km", r.km !== null ? miles(r.km) : "?"],
    ["Caja", caja(r.caja) ?? "?"],
    ["Motor", r.motor],
    ["Tracción", r.traccion === "AWD" ? "AWD" : r.traccion ? "4x2" : null],
    ["Vende", [vende, lugar(r)].filter(Boolean).join(", ") || null],
    ["Distancia", distancia ? distancia.texto : null],
  ].filter((x): x is [string, string | number] => x[1] !== null && x[1] !== "");
  const pie = [r.porConfirmar.length ? `Por confirmar: ${r.porConfirmar.map((c) => NOMBRE_CAMPO[c] ?? c).join(", ")}` : null].filter(Boolean);

  const descartar = (motivo: string | null) => {
    setDescartando(false);
    marcar.estado(r.autoId, "descartado", motivo);
    // "No es Cross Country" también corrige el modelo (y enseña a la IA).
    if (motivo === "No es Cross Country") void corregirAuto(r.autoId, "no_es_cc");
    volver();
  };
  const guardar = () => {
    if (nota === null || nota.trim() === (r.marca?.nota ?? "").trim()) return;
    cambiar((d) => ({ ...d, resultados: d.resultados.map((x) => (x.autoId === r.autoId ? { ...x, marca: { ...(x.marca ?? { estado: null }), nota } } : x)) }));
    void guardarNota(r.autoId, nota);
  };
  const compartir = () => {
    if (!principal) return;
    if (navigator.share) navigator.share({ title: tituloAuto(r), url: principal.url }).catch(() => {});
    else navigator.clipboard?.writeText(principal.url);
  };
  const separar = async (avisoId: string) => {
    setSeparando(avisoId);
    const res = await separarAviso(avisoId);
    setSeparando(null);
    if (res.ok) {
      await refrescar();
      pedirDetalle(r.autoId);
    }
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
          <button
            type="button"
            aria-label={favorito ? "Quitar de guardados" : "Guardar"}
            aria-pressed={favorito}
            onClick={() => marcar.estado(r.autoId, favorito ? null : "favorito")}
            className="presionable flex size-11 items-center justify-center"
          >
            <Star key={String(favorito)} className={cn("size-[20px]", favorito && "animate-[pop_320ms_ease-out] fill-current")} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <main className={cn("flex flex-col px-5 pt-1.5", enHoja ? "pb-6" : "pb-[calc(10rem+env(safe-area-inset-bottom))]")}>
        <Galeria principal={r.foto} fotos={detalle?.fotos?.length ? detalle.fotos : (r.fotos ?? [])} alt={`${tituloAuto(r)} ${r.anio ?? ""}`} />

        <h1 className="mt-5 text-[24px] font-bold leading-[29px] tracking-[-0.4px]">{[r.marcaAuto, tituloAuto(r)].filter(Boolean).join(" ")}</h1>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[30px] font-bold tracking-[-0.6px] tabular-nums">{r.precio !== null ? pesos(r.precio) : "Sin precio"}</span>
          <span className={cn("shrink-0 text-[13px] font-semibold", r.casi ? "text-muted-foreground" : r.veredicto === "calza" ? "text-calza" : "text-advertencia")}>
            {r.casi ? "Casi calza" : r.veredicto === "calza" ? "Calza" : "Revisar"}
          </span>
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

        <Preguntar r={r} />

        <ContactoAuto r={r} detalle={detalle} />

        {detalle && detalle.fichas.filter((f) => f.veredicto !== "fuera").length > 1 && (
          <section className="mt-7">
            <h2 className="titulo-grupo !ml-0">Tus fichas</h2>
            <div className="flex flex-col divide-y divide-separador">
              {detalle.fichas.filter((f) => f.veredicto !== "fuera").map((f) => (
                <div key={f.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[15px]">
                  <span>{f.nombre}</span>
                  <span className={cn("text-[13px] font-semibold", f.veredicto === "calza" ? "text-calza" : f.veredicto === "fuera" ? "text-tenue" : "text-advertencia")}>
                    {f.veredicto === "calza" ? "Calza" : f.veredicto === "fuera" ? "No calza" : "Revisar"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <h2 className="titulo-grupo !ml-0">Publicado en</h2>
          <div className="flex flex-col divide-y divide-separador">
            {r.enlaces.map((e) => (
              <div key={e.id} className="py-3">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 text-[15px]">
                  <span>{NOMBRE_FUENTE[e.fuente] ?? e.fuente}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {e.precio !== null && <span className="tabular-nums">{pesos(e.precio)}</span>}
                    <span>{e.estado === "posible_vendido" ? "ya no aparece" : haceDias(e.primeraVez)}</span>
                    <ExternalLink className="size-4 text-tenue" strokeWidth={2} />
                  </span>
                </a>
                {r.enlaces.length > 1 && (
                  <button type="button" disabled={separando !== null} onClick={() => void separar(e.id)} className="mt-1 text-[13px] font-medium text-tenue disabled:opacity-50">
                    {separando === e.id ? "Separando…" : "No es el mismo auto"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {historial.length > 1 && (
          <section className="mt-7">
            <h2 className="titulo-grupo !ml-0">Precio</h2>
            <GraficoPrecio puntos={historial} />
            <div className="mt-2 flex flex-col divide-y divide-separador">
              {[...historial].reverse().map((p, i) => (
                <div key={p.visto_en} className="flex justify-between py-2.5 text-[15px]">
                  <span className="text-muted-foreground">{fecha(p.visto_en)}</span>
                  <span className={cn("tabular-nums", i === 0 ? "font-semibold" : "text-muted-foreground")}>{pesos(p.precio)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <Opiniones r={r} detalle={detalle} />

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

        <Corregir r={r} alQuitar={volver} />
      </main>

      <div
        className={cn(
          "z-20 mx-auto flex max-w-2xl items-center gap-2.5 px-5 pt-3",
          enHoja ? "sticky bottom-0 bg-hoja pb-[calc(12px+env(safe-area-inset-bottom))]" : "fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom))] bg-background pb-3",
        )}
      >
        <button
          type="button"
          onClick={() => (descartado ? marcar.estado(r.autoId, null) : setDescartando(true))}
          className="presionable h-[50px] shrink-0 rounded-full bg-card px-5 text-[15px] font-semibold"
        >
          {descartado ? "Recuperar" : "Descartar"}
        </button>
        {principal && (
          <a href={principal.url} target="_blank" rel="noopener noreferrer" className="presionable flex h-[50px] flex-grow items-center justify-center rounded-full bg-primary text-[15px] font-bold text-primary-foreground">
            Ver en {NOMBRE_FUENTE[principal.fuente] ?? principal.fuente}
          </a>
        )}
      </div>

      <Hoja abierta={descartando} onCerrar={() => setDescartando(false)} titulo="¿Por qué lo descartas?" izquierda={<button type="button" onClick={() => setDescartando(false)}>Cancelar</button>}>
        <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <p className="text-[14px] text-muted-foreground">Con el motivo la app te sugiere ajustar la ficha si se repite.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {MOTIVOS_DESCARTE.map((m) => (
              <button key={m} type="button" onClick={() => descartar(m)} className="presionable h-11 rounded-full bg-card px-4 text-[15px] font-medium">
                {m}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => descartar(null)} className="presionable mt-4 h-[50px] w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground">
            Descartar sin motivo
          </button>
        </div>
      </Hoja>
    </div>
  );
}
