"use client";

import { CircleEllipsis, Link2, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Encabezado } from "@/components/encabezado";
import { Pantalla } from "@/components/pantalla";
import { ResultadoCard } from "@/components/resultado-card";
import { Segmentado } from "@/components/ui/segmentado";
import type { Filtro, ResultadoAuto } from "@/lib/datos";
import { filtrar, SEGMENTOS } from "@/lib/filtros";
import { cn } from "@/lib/utils";

const TITULO_FILTRO: Partial<Record<Filtro, string>> = { favoritos: "Guardados", descartados: "Descartados" };

/**
 * Resultados: todo se filtra en el teléfono (ficha, vista, texto) sin volver
 * al servidor. La URL se actualiza igual para que atrás y compartir funcionen.
 */
export function VistaResultados({
  resultados,
  busquedas,
  filtroInicial,
  busquedaInicial,
  aviso,
}: {
  resultados: ResultadoAuto[];
  busquedas: { id: string; nombre: string }[];
  filtroInicial: Filtro;
  busquedaInicial?: string;
  aviso?: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [busqueda, setBusqueda] = useState<string | undefined>(busquedaInicial);
  const [texto, setTexto] = useState("");
  const [menu, setMenu] = useState(false);
  const { visibles, cuentas } = filtrar(resultados, filtro, busqueda, texto);

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
        <button
          type="button"
          aria-label={filtro === "favoritos" ? "Ver todos" : "Ver guardados"}
          aria-pressed={filtro === "favoritos"}
          onClick={() => cambiar(filtro === "favoritos" ? "todos" : "favoritos", busqueda)}
          className="presionable flex size-9 items-center justify-center"
        >
          <Star className={cn("size-[22px]", filtro === "favoritos" && "fill-current")} strokeWidth={2} />
        </button>
        <div className="relative">
          <button type="button" aria-label="Más opciones" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="presionable flex size-9 items-center justify-center">
            <CircleEllipsis className="size-[24px]" strokeWidth={1.9} />
          </button>
          {menu && (
            <>
              <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-10 z-40 w-60 origin-top-right animate-in overflow-hidden rounded-[13px] bg-[rgba(250,250,250,0.92)] text-[17px] text-foreground shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl fade-in zoom-in-90 duration-150">
                <button type="button" onClick={() => cambiar(filtro === "descartados" ? "todos" : "descartados", busqueda)} className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-black/5">
                  {filtro === "descartados" ? "Ver todos" : "Ver descartados"} <Trash2 className="size-5" />
                </button>
                <Link href="/compartir" className="flex items-center justify-between px-4 py-3 shadow-[inset_0_0.5px_0_var(--separador)] active:bg-black/5">
                  Agregar aviso por link <Link2 className="size-5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </Encabezado>

      <Pantalla>
        <div className="flex flex-col gap-2.5 px-4 pb-2">
          {busquedas.length > 0 && (
            <label className="relative flex w-fit items-center gap-1 text-[17px] font-semibold text-primary">
              <span>{busquedas.find((b) => b.id === busqueda)?.nombre ?? (busquedas.length > 1 ? "Todas las fichas" : busquedas[0]?.nombre)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
              </svg>
              <select
                aria-label="Ficha"
                value={busqueda ?? ""}
                onChange={(e) => cambiar(filtro, e.target.value || undefined)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {busquedas.length > 1 && <option value="">Todas las fichas</option>}
                {busquedas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex h-9 items-center gap-1.5 rounded-[10px] bg-muted px-2 text-muted-foreground">
            <Search className="size-4 shrink-0" strokeWidth={2.4} />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Versión, comuna o vendedor"
              aria-label="Buscar"
              className="min-w-0 flex-grow bg-transparent text-[17px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          {!especial && (
            <Segmentado
              etiqueta="Vista"
              valor={filtro}
              onCambio={(f) => cambiar(f, busqueda)}
              opciones={SEGMENTOS.map((s) => ({ ...s, cuenta: cuentas[s.id] }))}
            />
          )}
        </div>

        {/* La lista se vuelve a montar al cambiar de vista: las tarjetas entran escalonadas. */}
        <main key={`${filtro}-${busqueda ?? "todas"}`} className="flex flex-col gap-4 px-4 pb-6 pt-2">
          {visibles.length === 0 ? (
            <p className="entrada-escalonada px-6 py-14 text-center text-[15px] text-muted-foreground">{vacio}</p>
          ) : (
            visibles.map((r, i) => (
              <div key={r.autoId} className="entrada-escalonada" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                <ResultadoCard r={r} destacado={r.enlaces.some((e) => e.id === aviso)} ocultarAlDescartar={filtro !== "descartados"} />
              </div>
            ))
          )}
        </main>
      </Pantalla>
    </>
  );
}
