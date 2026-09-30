"use client";

import { Bell, BellRing, ChevronLeft, Columns3, ExternalLink, Share, Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { guardarNota } from "@/app/(app)/acciones";
import { corregirAuto, separarAviso } from "@/app/(app)/acciones-auto";
import { ContactoAuto } from "@/components/auto/contacto";
import { Corregir } from "@/components/auto/corregir";
import { Galeria } from "@/components/auto/galeria";
import { Historia } from "@/components/auto/historia";
import { Patente } from "@/components/auto/patente";
import { PrecioJusto } from "@/components/auto/precio-justo";
import { GraficoPrecio } from "@/components/auto/grafico-precio";
import { Opiniones } from "@/components/auto/opiniones";
import { Preguntar } from "@/components/auto/preguntar";
import { Hoja } from "@/components/ui/hoja";
import { useAlmacen } from "@/lib/almacen";
import { useComparar } from "@/lib/comparar";
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
  const comparar = useComparar();
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
      <header className={cn("flex items-center justify-between px-2", enHoja ? "sticky top-0 z-20 -mt-1 bg-hoja" : "pt-[calc(env(safe-area-inset-top)+6px)]")}>
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
          <button
            type="button"
            aria-label={r.marca?.seguir ? "Dejar de seguir" : "Seguir este auto"}
            aria-pressed={Boolean(r.marca?.seguir)}
            onClick={() => marcar.seguir(r.autoId, !r.marca?.seguir)}
            className={cn("presionable flex size-11 items-center justify-center", r.marca?.seguir && "text-calza")}
          >
            {r.marca?.seguir ? <BellRing key="si" className="size-[19px] animate-[pop_320ms_ease-out]" strokeWidth={1.9} /> : <Bell className="size-[19px]" strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            aria-label={comparar.tiene(r.autoId) ? "Quitar de la comparación" : "Comparar"}
            aria-pressed={comparar.tiene(r.autoId)}
            onClick={() => {
              navigator.vibrate?.(5);
              comparar.alternar(r.autoId);
            }}
            className={cn("presionable flex size-11 items-center justify-center", comparar.tiene(r.autoId) && "text-calza")}
          >
            <Columns3 className="size-[19px]" strokeWidth={comparar.tiene(r.autoId) ? 2.2 : 1.8} />
          </button>
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

        {r.remate && (
          <a href={r.remate.url ?? undefined} target="_blank" rel="noopener noreferrer" className="presionable mt-4 block rounded-[14px] border border-advertencia-borde px-4 py-3">
            <p className="text-[15px] font-semibold text-advertencia">{r.remate.tipo === "patente" ? "Salió de remate" : "Puede haber salido de remate"}</p>
            <p className="mt-0.5 text-[14px] leading-[20px] text-suave">
              {r.remate.tipo === "patente" ? "Misma patente que" : "Mismo modelo y año, con km parecido, que"} el lote {r.remate.lote ?? ""} de {r.remate.fuente === "karcal" ? "Karcal" : "Remates Zárate"}
              {r.remate.fecha ? ` del ${new Date(r.remate.fecha).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}` : ""}
              {r.remate.condicion ? `: ${r.remate.condicion}` : ""}
              {r.remate.km ? `, ${miles(r.remate.km)} km` : ""}. Ver el lote.
            </p>
          </a>
        )}

        {(r.senales?.length ?? 0) >= 2 && (
          <div className="mt-4 rounded-[14px] border border-destructive/40 px-4 py-3">
            <p className="text-[15px] font-semibold text-destructive">Ojo: tiene señales de posible estafa</p>
            <p className="mt-0.5 text-[14px] leading-[20px] text-suave">{r.senales!.join(", ")}. No transfieras nada antes de ver el auto y los papeles.</p>
          </div>
        )}
        {(r.marca?.seguir || comparar.tiene(r.autoId)) && (
          <p className="mt-3 text-[13px] text-tenue">
            {[r.marca?.seguir ? "Lo sigues: te aviso si cambia de precio o deja de aparecer" : null, comparar.tiene(r.autoId) ? "Está en la comparación" : null].filter(Boolean).join(". ")}.
          </p>
        )}

        <dl className="mt-5 flex flex-col divide-y divide-separador border-y border-separador text-[15px]">
          {datosTabla.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate text-right font-medium first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>

        {r.resumen && (
          <p className="mt-5 text-[15px] leading-[22px]">
            <span className="font-semibold">En corto: </span>
            {r.resumen}
          </p>
        )}
        {detalle?.descripcion && (
          <div className={r.resumen ? "mt-3" : "mt-5"}>
            <p className={cn("whitespace-pre-line text-[15px] leading-[23px] text-suave", !verMas && "line-clamp-5")}>{detalle.descripcion}</p>
            {detalle.descripcion.length > 260 && (
              <button type="button" onClick={() => setVerMas((v) => !v)} className="mt-1 text-[15px] font-medium text-foreground">
                {verMas ? "Ver menos" : "Ver más"}
              </button>
            )}
          </div>
        )}
        {pie.length > 0 && <p className="mt-3 text-[13px] leading-[19px] text-tenue">{pie.join(". ")}.</p>}
        {(r.senales?.length ?? 0) === 1 && <p className="mt-2 text-[13px] leading-[19px] text-advertencia">{r.senales![0]}.</p>}

        {r.vision && r.vision.fotosDeAuto !== undefined && (
          <section className="mt-6">
            <h2 className="titulo-grupo !ml-0">En las fotos</h2>
            <ul className="flex flex-col gap-1.5 text-[15px] leading-[21px]">
              {r.vision.crossCountry && r.vision.crossCountry !== "no_se" && (
                <li>
                  <span className="font-medium">{r.vision.crossCountry === "si" ? "Es Cross Country" : "No es Cross Country"}</span>
                  {r.vision.porQue && <span className="text-suave">: {r.vision.porQue.charAt(0).toLowerCase() + r.vision.porQue.slice(1)}</span>}
                </li>
              )}
              {r.vision.kmTablero ? <li className="text-suave">El tablero marca {miles(r.vision.kmTablero)} km{r.km && Math.abs(r.km - r.vision.kmTablero) > r.km * 0.1 ? <span className="text-advertencia">, distinto a lo que dice el aviso</span> : null}.</li> : null}
              {(r.vision.danos?.length ?? 0) > 0 && <li className="text-advertencia">Se ve: {r.vision.danos!.join(", ")}.</li>}
              {r.vision.fotosDeAuto === false && <li className="text-advertencia">Las fotos no parecen de un auto a la venta.</li>}
            </ul>
            <p className="mt-1 text-[12.5px] text-tenue">Lo revisó la IA mirando las fotos: confírmalo en persona.</p>
          </section>
        )}

        <PrecioJusto r={r} />

        <Preguntar r={r} />

        <ContactoAuto r={r} detalle={detalle} />

        {detalle && <Historia detalle={detalle} />}

        <Patente patente={r.patente} />

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
