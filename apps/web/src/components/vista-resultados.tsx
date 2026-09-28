"use client";

import { Link2, MoreHorizontal, Search, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Encabezado } from "@/components/encabezado";
import { FilaEsqueleto, FilaResultado } from "@/components/fila-resultado";
import { Pantalla } from "@/components/pantalla";
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

  const busquedas = (datos?.busquedas ?? []).map((b) => ({ id: b.id, nombre: b.nombre }));
  const laBusqueda = busquedas.some((b) => b.id === busqueda) ? busqueda : undefined;
  const { visibles, cuentas } = filtrar(datos?.resultados ?? [], filtro, laBusqueda, texto);
  const grupos = !laBusqueda && busquedas.length > 1 ? agrupar(visibles, busquedas) : [{ id: "todas", nombre: busquedas.find((b) => b.id === laBusqueda)?.nombre ?? busquedas[0]?.nombre ?? "", autos: visibles }];

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
                <button type="button" onClick={() => cambiar(filtro === "descartados" ? "todos" : "descartados", busqueda)} className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-white/5">
                  {filtro === "descartados" ? "Ver todos" : "Ver descartados"} <Trash2 className="size-[18px] text-suave" strokeWidth={1.8} />
                </button>
                <Link href="/compartir" className="flex items-center justify-between border-t border-separador px-4 py-3 active:bg-white/5">
                  Agregar aviso por link <Link2 className="size-[18px] text-suave" strokeWidth={1.8} />
                </Link>
              </div>
            </>
          )}
        </div>
      </Encabezado>

      <Pantalla>
        <div className="flex flex-col gap-3 px-5">
          {busquedas.length > 1 && (
            <label className="relative -mt-1 flex w-fit items-center gap-1 text-[15px] font-medium text-muted-foreground">
              <span>{busquedas.find((b) => b.id === laBusqueda)?.nombre ?? "Todas las fichas"}</span>
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

        <main key={`${filtro}-${laBusqueda ?? "todas"}`} className="flex flex-col px-5 pb-8 pt-4">
          {!datos ? (
            Array.from({ length: 5 }, (_, i) => <FilaEsqueleto key={i} />)
          ) : visibles.length === 0 ? (
            <p className="entrada-escalonada px-6 py-14 text-center text-[15px] text-muted-foreground">{vacio}</p>
          ) : (
            grupos.map((g, gi) => (
              <section key={g.id} className={cn(gi > 0 && "mt-6")}>
                {grupos.length > 1 && <h2 className="mb-1 text-[14px] font-medium text-tenue">{g.nombre}</h2>}
                <div className="flex flex-col divide-y divide-separador">
                  {g.autos.map((r, i) => (
                    <div key={r.autoId} className="entrada-escalonada" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                      <FilaResultado r={r} destacado={r.enlaces.some((e) => e.id === aviso)} />
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </Pantalla>
    </>
  );
}
