"use client";

import { GalleryHorizontalEnd, LayoutGrid, Link2, List, MoreHorizontal, RectangleHorizontal, Search, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DetalleAuto } from "@/components/detalle-auto";
import { Encabezado } from "@/components/encabezado";
import { FilaEsqueleto, FilaResultado } from "@/components/fila-resultado";
import { Pantalla } from "@/components/pantalla";
import { Esqueleto, TarjetaMosaico, TarjetaRiel, TarjetaVitrina, type Vista, VISTAS } from "@/components/tarjetas";
import { Hoja } from "@/components/ui/hoja";
import { Segmentado } from "@/components/ui/segmentado";
import { useAlmacen } from "@/lib/almacen";
import type { Filtro, ResultadoAuto } from "@/lib/datos";
import { FILTROS, filtrar, SEGMENTOS } from "@/lib/filtros";
import { cn } from "@/lib/utils";

const TITULO_FILTRO: Partial<Record<Filtro, string>> = { favoritos: "Guardados", descartados: "Descartados" };

/** Con todas las fichas a la vista, cada auto va bajo la primera ficha en que calza (o en que aparece). */
function agrupar(visibles: ResultadoAuto[], busquedas: { id: string; nombre: string }[]) {
  const grupos = busquedas.map((b) => ({ ...b, autos: [] as ResultadoAuto[] }));
  for (const r of visibles) {
    const g = grupos.find((x) => r.porBusqueda[x.id]?.veredicto === "calza") ?? grupos.find((x) => r.porBusqueda[x.id]);
    g?.autos.push(r);
  }
  return grupos.filter((g) => g.autos.length > 0);
}

const CLAVE_VISTA = "radar:vista";
const ICONO_VISTA: Record<Vista, { icono: typeof List; nombre: string }> = {
  riel: { icono: GalleryHorizontalEnd, nombre: "Riel" },
  vitrina: { icono: RectangleHorizontal, nombre: "Vitrina" },
  mosaico: { icono: LayoutGrid, nombre: "Mosaico" },
  lista: { icono: List, nombre: "Lista" },
};

/** Selector de vista: cuatro íconos con un fondo que se desliza al elegido. */
function SelectorVista({ valor, onCambio }: { valor: Vista; onCambio: (v: Vista) => void }) {
  const i = VISTAS.indexOf(valor);
  return (
    <div role="radiogroup" aria-label="Vista" className="relative ml-auto grid h-9 w-[152px] shrink-0 grid-cols-4 rounded-[10px] bg-card p-[3px]">
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc((100%-6px)/4)] rounded-[7px] bg-[var(--pulgar)] shadow-[var(--pulgar-sombra)] transition-transform duration-[280ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
        style={{ transform: `translateX(${i * 100}%)` }}
      />
      {VISTAS.map((v) => {
        const { icono: Icono, nombre } = ICONO_VISTA[v];
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === valor}
            aria-label={nombre}
            title={nombre}
            onClick={() => onCambio(v)}
            className={cn("relative z-10 flex items-center justify-center transition-colors duration-200", v === valor ? "text-foreground" : "text-tenue")}
          >
            <Icono className="size-[17px]" strokeWidth={v === valor ? 2.1 : 1.8} />
          </button>
        );
      })}
    </div>
  );
}

const resumen = (autos: ResultadoAuto[]) => {
  const calzan = autos.filter((r) => r.veredicto === "calza").length;
  const revisar = autos.length - calzan;
  return [calzan ? `${calzan} ${calzan === 1 ? "calza" : "calzan"}` : null, revisar ? `${revisar} revisar` : null].filter(Boolean).join(", ");
};

/**
 * Resultados: los datos vienen del teléfono y todo se filtra aquí (ficha, vista,
 * texto) sin ir al servidor. La URL se actualiza igual para atrás y compartir.
 */
export function VistaResultados() {
  const sp = useSearchParams();
  const { datos } = useAlmacen();
  const [filtro, setFiltro] = useState<Filtro>(() => FILTROS.find((f) => f === sp.get("filtro")) ?? "todos");
  const [busqueda, setBusqueda] = useState<string | undefined>(() => sp.get("busqueda") ?? undefined);
  const aviso = sp.get("aviso") ?? undefined;
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [vista, setVista] = useState<Vista>("riel");
  // La hoja del auto: el id se queda mientras se anima la salida.
  const [idHoja, setIdHoja] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CLAVE_VISTA) as Vista | null;
      if (v && VISTAS.includes(v)) setVista(v);
    } catch {}
    const a = new URLSearchParams(location.search).get("auto");
    if (a) {
      setIdHoja(a);
      setHojaAbierta(true);
    }
    // Atrás (el botón de Android) cierra la hoja.
    const alVolver = () => {
      if (!window.history.state?.hojaAuto) setHojaAbierta(false);
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  const elegirVista = (v: Vista) => {
    navigator.vibrate?.(5);
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {}
  };

  const abrir = useCallback((id: string) => {
    navigator.vibrate?.(5);
    setIdHoja(id);
    setHojaAbierta(true);
    const u = new URL(location.href);
    u.searchParams.set("auto", id);
    window.history.pushState({ hojaAuto: id }, "", u);
  }, []);

  const cerrar = useCallback(() => {
    if (window.history.state?.hojaAuto) return window.history.back();
    setHojaAbierta(false);
    const u = new URL(location.href);
    u.searchParams.delete("auto");
    window.history.replaceState(null, "", u);
  }, []);

  const busquedas = (datos?.busquedas ?? []).map((b) => ({ id: b.id, nombre: b.nombre }));
  const laBusqueda = busquedas.some((b) => b.id === busqueda) ? busqueda : undefined;
  const { visibles, cuentas } = filtrar(datos?.resultados ?? [], filtro, laBusqueda, texto);
  const porFicha = !laBusqueda && busquedas.length > 1;
  const nombreFicha = busquedas.find((b) => b.id === laBusqueda)?.nombre ?? busquedas[0]?.nombre ?? "";
  const grupos = porFicha
    ? agrupar(visibles, busquedas)
    : vista === "riel"
      ? [
          { id: "calza", nombre: "Calzan", autos: visibles.filter((r) => r.veredicto === "calza") },
          { id: "revisar", nombre: "Para revisar", autos: visibles.filter((r) => r.veredicto !== "calza") },
        ].filter((g) => g.autos.length > 0)
      : [{ id: "todas", nombre: nombreFicha, autos: visibles }];
  const conTitulo = porFicha || vista === "riel";

  const cambiar = (f: Filtro, b: string | undefined) => {
    navigator.vibrate?.(5);
    setFiltro(f);
    setBusqueda(b);
    setMenu(false);
    const p = new URLSearchParams();
    if (f !== "todos") p.set("filtro", f);
    if (b) p.set("busqueda", b);
    window.history.replaceState(null, "", p.size ? `/resultados?${p}` : "/resultados");
  };

  const especial = TITULO_FILTRO[filtro];
  const vacio =
    busquedas.length === 0
      ? "Todavía no tienes seguimientos. Crea uno en la pestaña Seguimientos."
      : texto
        ? `Nada coincide con «${texto}».`
        : filtro === "todos"
          ? "Aún no hay avisos que calcen. La próxima pasada corre dentro de las próximas 3 horas."
          : "Nada por aquí con este filtro.";

  return (
    <>
      <Encabezado titulo={especial ?? "Resultados"}>
        <button type="button" aria-label="Buscar" aria-pressed={buscando} onClick={() => setBuscando((b) => !b)} className="presionable flex size-9 items-center justify-center">
          <Search className="size-[21px]" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label={filtro === "favoritos" ? "Ver todos" : "Ver guardados"}
          aria-pressed={filtro === "favoritos"}
          onClick={() => cambiar(filtro === "favoritos" ? "todos" : "favoritos", busqueda)}
          className="presionable flex size-9 items-center justify-center"
        >
          <Star className={cn("size-[21px]", filtro === "favoritos" && "fill-current")} strokeWidth={1.8} />
        </button>
        <div className="relative">
          <button type="button" aria-label="Más opciones" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="presionable flex size-9 items-center justify-center">
            <MoreHorizontal className="size-[22px]" strokeWidth={1.8} />
          </button>
          {menu && (
            <>
              <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-10 z-40 w-60 origin-top-right animate-in overflow-hidden rounded-[14px] bg-popover text-[16px] text-foreground shadow-[0_12px_40px_rgba(0,0,0,0.5)] fade-in zoom-in-95 duration-150">
                <button type="button" onClick={() => cambiar(filtro === "descartados" ? "todos" : "descartados", busqueda)} className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-presion">
                  {filtro === "descartados" ? "Ver todos" : "Ver descartados"} <Trash2 className="size-[18px] text-suave" strokeWidth={1.8} />
                </button>
                <Link href="/compartir" className="flex items-center justify-between border-t border-separador px-4 py-3 active:bg-presion">
                  Agregar aviso por link <Link2 className="size-[18px] text-suave" strokeWidth={1.8} />
                </Link>
              </div>
            </>
          )}
        </div>
      </Encabezado>

      <Pantalla>
        <div className="flex flex-col gap-3 px-5">
          <div className="-mt-1 flex min-h-9 items-center gap-3">
          {busquedas.length > 1 && (
            <label className="relative flex min-w-0 items-center gap-1 text-[15px] font-medium text-muted-foreground">
              <span className="truncate">{busquedas.find((b) => b.id === laBusqueda)?.nombre ?? "Todas las fichas"}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select aria-label="Ficha" value={laBusqueda ?? ""} onChange={(e) => cambiar(filtro, e.target.value || undefined)} className="absolute inset-0 cursor-pointer opacity-0">
                <option value="">Todas las fichas</option>
                {busquedas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
            <SelectorVista valor={vista} onCambio={elegirVista} />
          </div>
          {(buscando || texto) && (
            <label className="flex h-10 animate-in items-center gap-2 rounded-xl bg-card px-3 text-muted-foreground fade-in duration-150">
              <Search className="size-4 shrink-0" strokeWidth={2} />
              <input
                type="search"
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Versión, comuna o vendedor"
                aria-label="Buscar"
                className="min-w-0 flex-grow bg-transparent text-[16px] text-foreground outline-none placeholder:text-tenue"
              />
              {texto && (
                <button type="button" aria-label="Borrar búsqueda" onClick={() => setTexto("")} className="-mr-1 flex size-7 items-center justify-center">
                  <X className="size-4" strokeWidth={2} />
                </button>
              )}
            </label>
          )}
          {!especial && <Segmentado etiqueta="Vista" valor={filtro} onCambio={(f) => cambiar(f, busqueda)} opciones={SEGMENTOS.map((s) => ({ ...s, cuenta: s.id === "todos" ? undefined : cuentas[s.id] }))} />}
        </div>

        <main key={`${vista}-${filtro}-${laBusqueda ?? "todas"}`} className="flex flex-col px-5 pb-8 pt-4">
          {!datos ? (
            vista === "lista" ? (
              Array.from({ length: 5 }, (_, i) => <FilaEsqueleto key={i} />)
            ) : (
              <Esqueleto vista={vista} />
            )
          ) : visibles.length === 0 ? (
            <p className="entrada-escalonada px-6 py-14 text-center text-[15px] text-muted-foreground">{vacio}</p>
          ) : (
            grupos.map((g, gi) => (
              <section key={g.id} className={cn(gi > 0 && (vista === "lista" ? "mt-6" : "mt-8"))}>
                {conTitulo && (
                  <div className="entrada-escalonada mb-3 flex items-baseline justify-between gap-3" style={{ "--i": 0 } as React.CSSProperties}>
                    <h2 className="truncate text-[17px] font-semibold tracking-[-0.2px]">{g.nombre}</h2>
                    {porFicha && <span className="shrink-0 text-[13px] text-tenue">{resumen(g.autos)}</span>}
                    {!porFicha && <span className="shrink-0 text-[13px] text-tenue">{g.autos.length}</span>}
                  </div>
                )}
                <Grupo vista={vista} autos={g.autos} abrir={abrir} aviso={aviso} />
              </section>
            ))
          )}
        </main>
      </Pantalla>

      <Hoja abierta={hojaAbierta} onCerrar={cerrar} titulo="Auto" sinEncabezado>
        {idHoja && <DetalleAuto key={idHoja} id={idHoja} alCerrar={cerrar} />}
      </Hoja>
    </>
  );
}

const escalon = (i: number) => ({ "--i": Math.min(i, 8) }) as React.CSSProperties;

/** Los autos de un grupo en la vista elegida. */
function Grupo({ vista, autos, abrir, aviso }: { vista: Vista; autos: ResultadoAuto[]; abrir: (id: string) => void; aviso?: string }) {
  if (vista === "riel")
    return (
      <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {autos.map((r, i) => (
          <div key={r.autoId} className="entrada-escalonada w-[72%] max-w-[320px] shrink-0 snap-start" style={escalon(i)}>
            <TarjetaRiel r={r} abrir={abrir} />
          </div>
        ))}
        <div className="w-2 shrink-0" aria-hidden />
      </div>
    );
  if (vista === "vitrina")
    return (
      <div className="flex flex-col gap-7">
        {autos.map((r, i) => (
          <div key={r.autoId} className="entrada-escalonada" style={escalon(i)}>
            <TarjetaVitrina r={r} abrir={abrir} />
          </div>
        ))}
      </div>
    );
  if (vista === "mosaico")
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {autos.map((r, i) => (
          <div key={r.autoId} className="entrada-escalonada min-w-0" style={escalon(i)}>
            <TarjetaMosaico r={r} abrir={abrir} />
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex flex-col divide-y divide-separador">
      {autos.map((r, i) => (
        <div key={r.autoId} className="entrada-escalonada" style={escalon(i)}>
          <FilaResultado r={r} destacado={r.enlaces.some((e) => e.id === aviso)} abrir={abrir} />
        </div>
      ))}
    </div>
  );
}
