"use client";

import { Columns3, Download, GalleryHorizontalEnd, Handshake, LoaderCircle, Mic, Route, Sparkles, SlidersHorizontal, LayoutGrid, Link2, List, Map as IconoMapa, MoreHorizontal, RectangleHorizontal, Search, Star, Trash2, Waves, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DetalleAuto } from "@/components/detalle-auto";
import { Encabezado } from "@/components/encabezado";
import { FilaEsqueleto, FilaResultado } from "@/components/fila-resultado";
import { Pantalla } from "@/components/pantalla";
import { Esqueleto, TarjetaMosaico, TarjetaRiel, TarjetaVitrina, type Vista, VISTAS } from "@/components/tarjetas";
import { RevisionRapida } from "@/components/revision-rapida";
import { Hoja } from "@/components/ui/hoja";
import { Segmentado } from "@/components/ui/segmentado";
import { useAlmacen } from "@/lib/almacen";
import type { Filtro, ResultadoAuto } from "@/lib/datos";
import { type Afinar, afinar, cuantosFiltros, FILTROS, filtrar, type Orden, ORDENES, ordenar, SEGMENTOS } from "@/lib/filtros";
import { distanciaDeCasa } from "@/lib/lugares";
import { FiltrosActivos, FiltrosHoja } from "@/components/filtros-hoja";
import { CompararHoja } from "@/components/comparar-hoja";
import { ConvieneHoja } from "@/components/conviene-hoja";
import { interpretarBusqueda } from "@radar/core";
import { useComparar } from "@/lib/comparar";
import { useDictado } from "@/lib/dictado";
import { compartirCsv } from "@/lib/exportar";
import { rutaDeVisitas } from "@/lib/ruta";
import { iniciarVisita } from "@/lib/visto";
import { cn } from "@/lib/utils";

const TITULO_FILTRO: Partial<Record<Filtro, string>> = { favoritos: "Guardados", descartados: "Descartados", casi: "Casi calzan", contacto: "En contacto" };

// Leaflet necesita el navegador: el mapa se carga solo si lo eliges.
const MapaAutos = dynamic(() => import("@/components/mapa-autos").then((m) => m.MapaAutos), {
  ssr: false,
  loading: () => <div className="-mx-5 h-[calc(100dvh-300px)] min-h-[360px] animate-pulse bg-card" />,
});

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
const CLAVE_AFINAR = "radar:afinar";
const ICONO_VISTA: Record<Vista, { icono: typeof List; nombre: string }> = {
  riel: { icono: GalleryHorizontalEnd, nombre: "Riel" },
  vitrina: { icono: RectangleHorizontal, nombre: "Vitrina" },
  mosaico: { icono: LayoutGrid, nombre: "Mosaico" },
  lista: { icono: List, nombre: "Lista" },
  mapa: { icono: IconoMapa, nombre: "Mapa" },
};

/** Selector de vista: cuatro íconos con un fondo que se desliza al elegido. */
function SelectorVista({ valor, onCambio }: { valor: Vista; onCambio: (v: Vista) => void }) {
  const i = VISTAS.indexOf(valor);
  return (
    <div role="radiogroup" aria-label="Vista" className="relative ml-auto grid h-9 w-[184px] shrink-0 grid-cols-5 rounded-[10px] bg-card p-[3px]">
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc((100%-6px)/5)] rounded-[7px] bg-[var(--pulgar)] shadow-[var(--pulgar-sombra)] transition-transform duration-[280ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
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
  const [afinados, setAfinados] = useState<Afinar>({});
  const [orden, setOrden] = useState<Orden>("recomendado");
  const [hojaFiltros, setHojaFiltros] = useState(false);
  const [hojaComparar, setHojaComparar] = useState(false);
  const [hojaConviene, setHojaConviene] = useState(false);
  const comparar = useComparar();
  // La fecha de tu visita anterior queda fija mientras la app está abierta (para "Nuevo para ti").
  if (typeof window !== "undefined") iniciarVisita();
  // La hoja del auto: el id se queda mientras se anima la salida.
  const [idHoja, setIdHoja] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CLAVE_VISTA) as Vista | null;
      if (v && VISTAS.includes(v)) setVista(v);
      const a = JSON.parse(localStorage.getItem(CLAVE_AFINAR) ?? "null") as { filtros?: Afinar; orden?: Orden } | null;
      if (a?.filtros) setAfinados(a.filtros);
      if (a?.orden && ORDENES.some((o) => o.id === a.orden)) setOrden(a.orden);
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

  const guardarAfinar = (filtros: Afinar, o: Orden) => {
    try {
      localStorage.setItem(CLAVE_AFINAR, JSON.stringify({ filtros, orden: o }));
    } catch {}
  };
  const cambiarFiltros = (f: Afinar) => {
    setAfinados(f);
    guardarAfinar(f, orden);
  };
  const cambiarOrden = (o: Orden) => {
    setOrden(o);
    guardarAfinar(afinados, o);
  };
  const nFiltros = cuantosFiltros(afinados) + (orden !== "recomendado" ? 1 : 0);

  /** "V40 automático bajo 12 millones del 2018": pasa lo que entiende a filtros y deja el resto como texto. */
  const aplicarFrase = (frase: string) => {
    const b = interpretarBusqueda(frase);
    const { texto: resto, orden: o, ...filtros } = b;
    const hay = Object.values(filtros).some((v) => v !== undefined);
    if (hay) cambiarFiltros({ ...afinados, ...filtros });
    if (o) cambiarOrden(o);
    setTexto(hay || o ? resto : frase);
    navigator.vibrate?.(6);
  };
  const dictado = useDictado({ alCambiar: (t) => setTexto(t), alTerminar: (t) => t.trim() && aplicarFrase(t) });
  const escuchando = dictado.estado === "escuchando";
  const fuentesVistas = [...new Set((datos?.resultados ?? []).flatMap((r) => r.enlaces.map((e) => e.fuente)))].sort();

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
  // Filtros y orden de la hoja "Filtros y orden": se aplican antes de contar, para que los números calcen.
  const casa = datos?.ajustes?.casa?.comuna ?? null;
  const distancia = (r: ResultadoAuto) => distanciaDeCasa(r, casa)?.km ?? null;
  const base = afinar(datos?.resultados ?? [], afinados, distancia);
  const baseCasi = afinar(datos?.casi ?? [], afinados, distancia);
  const filtrados = filtrar(base, filtro, laBusqueda, texto, baseCasi);
  const visibles = ordenar(filtrados.visibles, orden, distancia);
  const cuentas = filtrados.cuentas;
  const [rapida, setRapida] = useState(false);
  // Para revisar de a uno: primero lo nuevo sin marcar.
  const sinMarcar = visibles.filter((r) => !r.marca?.estado);
  const nuevosSinMarcar = sinMarcar.filter((r) => r.nuevo);
  const colaRapida = nuevosSinMarcar.length ? nuevosSinMarcar : sinMarcar;
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
  const conTitulo = (porFicha || vista === "riel") && vista !== "mapa";

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
        <button type="button" aria-label={nFiltros ? `Filtros y orden (${nFiltros})` : "Filtros y orden"} onClick={() => setHojaFiltros(true)} className="presionable relative flex size-9 items-center justify-center">
          <SlidersHorizontal className="size-[21px]" strokeWidth={1.8} />
          {nFiltros > 0 && (
            <span className="absolute -right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">{nFiltros}</span>
          )}
        </button>
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
                <button type="button" onClick={() => cambiar(filtro === "casi" ? "todos" : "casi", busqueda)} className="flex w-full items-center justify-between border-t border-separador px-4 py-3 text-left active:bg-presion">
                  {filtro === "casi" ? "Ver todos" : `Casi calzan${cuentas.casi ? ` (${cuentas.casi})` : ""}`} <Waves className="size-[18px] text-suave" strokeWidth={1.8} />
                </button>
                <button type="button" onClick={() => cambiar(filtro === "contacto" ? "todos" : "contacto", busqueda)} className="flex w-full items-center justify-between border-t border-separador px-4 py-3 text-left active:bg-presion">
                  {filtro === "contacto" ? "Ver todos" : `En contacto${cuentas.contacto ? ` (${cuentas.contacto})` : ""}`} <Handshake className="size-[18px] text-suave" strokeWidth={1.8} />
                </button>
                <Link href="/compartir" className="flex items-center justify-between border-t border-separador px-4 py-3 active:bg-presion">
                  Agregar aviso por link <Link2 className="size-[18px] text-suave" strokeWidth={1.8} />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    void compartirCsv(visibles);
                  }}
                  className="flex w-full items-center justify-between border-t border-separador px-4 py-3 text-left active:bg-presion"
                >
                  Exportar a planilla ({visibles.length}) <Download className="size-[18px] text-suave" strokeWidth={1.8} />
                </button>
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
                onKeyDown={(e) => e.key === "Enter" && texto.trim() && aplicarFrase(texto)}
                placeholder={escuchando ? "Te escucho…" : "Ej: V40 automático bajo 12 millones"}
                aria-label="Buscar"
                enterKeyHint="search"
                className="min-w-0 flex-grow bg-transparent text-[16px] text-foreground outline-none placeholder:text-tenue"
              />
              {dictado.disponible && !texto && (
                <button
                  type="button"
                  aria-label={escuchando ? "Terminar de dictar" : "Buscar hablando"}
                  onClick={() => (escuchando ? dictado.detener() : dictado.iniciar())}
                  className={cn("-mr-1 flex size-7 items-center justify-center rounded-full", escuchando && "bg-destructive text-white")}
                >
                  {dictado.estado === "transcribiendo" ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" strokeWidth={2} />}
                </button>
              )}
              {texto && (
                <button type="button" aria-label="Borrar búsqueda" onClick={() => setTexto("")} className="-mr-1 flex size-7 items-center justify-center">
                  <X className="size-4" strokeWidth={2} />
                </button>
              )}
            </label>
          )}
          {!especial && <Segmentado etiqueta="Vista" valor={filtro} onCambio={(f) => cambiar(f, busqueda)} opciones={SEGMENTOS.map((s) => ({ ...s, cuenta: s.id === "todos" ? undefined : cuentas[s.id] }))} />}
          <FiltrosActivos filtros={afinados} orden={orden} onFiltros={cambiarFiltros} onOrden={cambiarOrden} />
          {filtro === "favoritos" && visibles.length >= 2 && (
            <button type="button" onClick={() => setHojaConviene(true)} className="presionable flex h-11 items-center justify-center gap-2 rounded-xl bg-card text-[15px] font-semibold">
              <Sparkles className="size-[18px]" strokeWidth={1.8} /> ¿Cuál me conviene?
            </button>
          )}
          {filtro === "contacto" && visibles.length >= 1 && (() => {
            const ruta = rutaDeVisitas(visibles.filter((r) => r.marca?.contacto === "visita").length ? visibles.filter((r) => r.marca?.contacto === "visita") : visibles, casa);
            return ruta ? (
              <a href={ruta.url} target="_blank" rel="noopener noreferrer" className="presionable flex h-11 items-center justify-center gap-2 rounded-xl bg-card text-[15px] font-semibold">
                <Route className="size-[18px]" strokeWidth={1.8} /> Armar la ruta para verlos ({ruta.orden.length})
              </a>
            ) : null;
          })()}
          {filtro === "casi" && <p className="text-[14px] text-muted-foreground">Quedaron fuera por poco: hasta 10% sobre tu tope de precio o km, o un año antes. Si varios te gustan, sube el tope en la ficha.</p>}
          {datos && colaRapida.length > 1 && filtro !== "descartados" && (
            <button type="button" onClick={() => setRapida(true)} className="presionable flex h-11 items-center justify-center rounded-xl bg-card text-[15px] font-semibold">
              {nuevosSinMarcar.length ? `Revisar ${nuevosSinMarcar.length} ${nuevosSinMarcar.length === 1 ? "nuevo" : "nuevos"} de a uno` : `Revisar ${sinMarcar.length} de a uno`}
            </button>
          )}
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
          ) : vista === "mapa" ? (
            <MapaAutos autos={visibles} casa={datos.ajustes?.casa?.comuna} abrir={abrir} />
          ) : (
            grupos.map((g, gi) => (
              <section key={g.id} className={cn(gi > 0 && (vista === "lista" ? "mt-6" : "mt-8"), vista === "riel" && gi > 1 && "fuera-de-vista")} style={{ "--alto-estimado": "420px" } as React.CSSProperties}>
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

      {comparar.ids.length > 0 && !hojaAbierta && (
        <button
          type="button"
          onClick={() => setHojaComparar(true)}
          className="presionable fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-30 flex h-11 -translate-x-1/2 animate-in items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_30px_rgba(0,0,0,0.2)] fade-in slide-in-from-bottom-2 duration-200"
        >
          <Columns3 className="size-[18px]" strokeWidth={2} /> Comparar {comparar.ids.length}
        </button>
      )}
      <CompararHoja abierta={hojaComparar} onCerrar={() => setHojaComparar(false)} abrir={abrir} />
      <ConvieneHoja abierta={hojaConviene} onCerrar={() => setHojaConviene(false)} autos={visibles} abrir={abrir} />

      <FiltrosHoja
        abierta={hojaFiltros}
        onCerrar={() => setHojaFiltros(false)}
        orden={orden}
        onOrden={cambiarOrden}
        filtros={afinados}
        onFiltros={cambiarFiltros}
        fuentes={fuentesVistas}
        hayCasa={Boolean(casa)}
        cuantos={visibles.length}
      />

      {rapida && <RevisionRapida autos={colaRapida} onCerrar={() => setRapida(false)} abrir={abrir} />}

      <Hoja abierta={hojaAbierta} onCerrar={cerrar} titulo="Auto" sinEncabezado>
        {idHoja && <DetalleAuto key={idHoja} id={idHoja} alCerrar={cerrar} />}
      </Hoja>
    </>
  );
}

/** Solo las primeras tarjetas entran animadas: animar cien a la vez pesa en el teléfono. */
const animar = (i: number) => (i < 8 ? "entrada-escalonada" : "");
const escalon = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Los autos de un grupo en la vista elegida. */
const EN_RIEL = 10;
const DE_A = 24;

/** Cuántas tarjetas dibujar: de a DE_A, y más cuando el final de la lista se acerca a la pantalla. */
function useProgresivo(total: number, minimo = DE_A) {
  const [limite, setLimite] = useState(Math.max(DE_A, minimo));
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = fin.current;
    if (!el || limite >= total) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setLimite((l) => l + DE_A), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [limite, total]);
  return { limite, fin };
}

/** Los autos de un grupo en la vista elegida. Se dibujan de a poco: todo de una vez hacía lento el cambio de pestaña. */
function Grupo({ vista, autos, abrir, aviso }: { vista: Vista; autos: ResultadoAuto[]; abrir: (id: string) => void; aviso?: string }) {
  // Si una notificación trae un aviso, que quede dibujado aunque esté abajo.
  const posAviso = aviso ? autos.findIndex((r) => r.enlaces.some((e) => e.id === aviso)) + 1 : 0;
  const { limite, fin } = useProgresivo(autos.length, posAviso);
  const [todoRiel, setTodoRiel] = useState(false);
  if (vista === "riel") {
    const visibles = todoRiel ? autos : autos.slice(0, Math.max(EN_RIEL, posAviso));
    const quedan = autos.length - visibles.length;
    return (
      <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibles.map((r, i) => (
          <div key={r.autoId} className={cn(animar(i), "w-[72%] max-w-[320px] shrink-0 snap-start")} style={escalon(i)}>
            <TarjetaRiel r={r} abrir={abrir} />
          </div>
        ))}
        {quedan > 0 && (
          <button
            type="button"
            onClick={() => setTodoRiel(true)}
            className="presionable flex aspect-[4/3] w-[40%] max-w-[180px] shrink-0 snap-start flex-col items-center justify-center gap-1 self-start rounded-2xl bg-card text-center"
          >
            <span className="text-[22px] font-bold tabular-nums">+{quedan}</span>
            <span className="text-[13px] text-muted-foreground">Ver el resto</span>
          </button>
        )}
        <div className="w-2 shrink-0" aria-hidden />
      </div>
    );
  }
  const dibujados = autos.slice(0, limite);
  const cola = limite < autos.length && <div ref={fin} className="h-px" aria-hidden />;
  if (vista === "vitrina")
    return (
      <div className="flex flex-col gap-7">
        {dibujados.map((r, i) => (
          <div key={r.autoId} className={cn(animar(i), "fuera-de-vista")} style={{ ...escalon(i), "--alto-estimado": "340px" } as React.CSSProperties}>
            <TarjetaVitrina r={r} abrir={abrir} />
          </div>
        ))}
        {cola}
      </div>
    );
  if (vista === "mosaico")
    return (
      <>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {dibujados.map((r, i) => (
            <div key={r.autoId} className={cn(animar(i), "fuera-de-vista min-w-0")} style={{ ...escalon(i), "--alto-estimado": "240px" } as React.CSSProperties}>
              <TarjetaMosaico r={r} abrir={abrir} />
            </div>
          ))}
        </div>
        {cola}
      </>
    );
  return (
    <div className="flex flex-col divide-y divide-separador">
      {dibujados.map((r, i) => (
        <div key={r.autoId} className={cn(animar(i), "fuera-de-vista")} style={{ ...escalon(i), "--alto-estimado": "116px" } as React.CSSProperties}>
          <FilaResultado r={r} destacado={r.enlaces.some((e) => e.id === aviso)} abrir={abrir} />
        </div>
      ))}
      {cola}
    </div>
  );
}
