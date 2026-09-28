"use client";

import { LoaderCircle, Play } from "lucide-react";
import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { correrAhora, leerCorridas } from "@/app/(app)/acciones";
import { useAlmacen } from "@/lib/almacen";
import type { EstadoCorrida, FuenteCorrible } from "@/lib/github";
import { cn } from "@/lib/utils";

const TODAS: FuenteCorrible[] = ["chileautos", "facebook", "kavak", "yapo", "mercadolibre"];
const TEXTO: Record<EstadoCorrida, string> = { pedida: "Pidiendo la corrida…", en_cola: "En cola en GitHub…", corriendo: "Corriendo ahora…" };

type Estados = Partial<Record<FuenteCorrible, EstadoCorrida>>;

const Contexto = createContext<{
  estados: Estados;
  correr: (f: FuenteCorrible | "todas") => void;
  error: string | null;
  limpiarError: () => void;
} | null>(null);

const useCorridas = () => {
  const c = use(Contexto);
  if (!c) throw new Error("Falta ProveedorCorridas");
  return c;
};

/**
 * Lleva el estado de las corridas manuales: marca al tiro lo pedido, pregunta a
 * GitHub cada 5 s mientras algo corre y recarga la pantalla para ver el registro.
 */
export function ProveedorCorridas({ conGithub, children }: { conGithub: boolean; children: React.ReactNode }) {
  const { refrescar } = useAlmacen();
  const [estados, setEstados] = useState<Estados>({});
  const [error, setError] = useState<string | null>(null);
  const pedidas = useRef<Partial<Record<FuenteCorrible, number>>>({});
  const activas = Object.keys(estados).length > 0;

  useEffect(() => {
    if (!conGithub) return;
    let vivo = true;
    let vueltas = 0;
    const leer = async () => {
      const deGithub = await leerCorridas().catch(() => ({}) as Estados);
      if (!vivo) return;
      setEstados(() => {
        const nuevo: Estados = { ...deGithub };
        // Lo recién pedido tarda unos segundos en aparecer en GitHub.
        for (const f of TODAS) if (!nuevo[f] && Date.now() - (pedidas.current[f] ?? 0) < 25_000) nuevo[f] = "pedida";
        return nuevo;
      });
      if (activas && ++vueltas % 2 === 0) void refrescar();
    };
    void leer();
    if (!activas) return () => void (vivo = false);
    const t = setInterval(leer, 5000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [activas, conGithub, refrescar]);

  // Al terminar todo, una última recarga para ver el resultado en el registro.
  const habia = useRef(false);
  useEffect(() => {
    if (habia.current && !activas) void refrescar();
    habia.current = activas;
  }, [activas, refrescar]);

  const correr = useCallback(
    (f: FuenteCorrible | "todas") => {
      setError(null);
      if (!conGithub) {
        setError("Para correr desde aquí, primero conecta GitHub (más abajo, en «Correr desde la app»).");
        document.getElementById("github")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      navigator.vibrate?.(10);
      const cuales = f === "todas" ? TODAS : [f];
      const ahora = Date.now();
      for (const x of cuales) pedidas.current[x] = ahora;
      setEstados((e) => ({ ...e, ...Object.fromEntries(cuales.map((x) => [x, e[x] ?? "pedida"])) }));
      void correrAhora(f).then((r) => {
        if (r.ok) return;
        for (const x of cuales) delete pedidas.current[x];
        setEstados((e) => Object.fromEntries(Object.entries(e).filter(([k, v]) => !(cuales.includes(k as FuenteCorrible) && v === "pedida"))));
        setError(r.error);
      });
    },
    [conGithub],
  );

  return (
    <Contexto value={{ estados, correr, error, limpiarError: () => setError(null) }}>{children}</Contexto>
  );
}

/** Por qué no se pudo correr (se cierra al tocarlo). */
export function AvisoCorridas() {
  const { error, limpiarError } = useCorridas();
  if (!error) return null;
  return (
    <button type="button" onClick={limpiarError} className="animate-in rounded-xl bg-card px-3.5 py-2.5 text-left text-[15px] leading-5 text-destructive fade-in duration-200">
      {error}
    </button>
  );
}

/** Botón redondo ▶ para correr una fuente. */
export function BotonCorrer({ fuente, nombre }: { fuente: FuenteCorrible; nombre: string }) {
  const { estados, correr } = useCorridas();
  const estado = estados[fuente];
  return (
    <button
      type="button"
      aria-label={estado ? `${nombre}: ${TEXTO[estado]}` : `Correr ${nombre} ahora`}
      disabled={Boolean(estado)}
      onClick={() => correr(fuente)}
      className={cn("presionable flex size-[30px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground", estado && "bg-transparent")}
    >
      {estado ? <LoaderCircle className="size-[18px] animate-spin" strokeWidth={2.4} /> : <Play className="ml-0.5 size-3.5 fill-current" strokeWidth={0} />}
    </button>
  );
}

/** Reemplaza el subtítulo de una fila mientras la fuente corre. */
export function EstadoFuente({ fuente, children }: { fuente: FuenteCorrible; children: React.ReactNode }) {
  const estado = useCorridas().estados[fuente];
  return estado ? <span className="text-suave">{TEXTO[estado]}</span> : <>{children}</>;
}

/** "Correr todo" para la barra de arriba. */
export function BotonCorrerTodas() {
  const { estados, correr } = useCorridas();
  const todas = TODAS.every((f) => estados[f]);
  return (
    <button type="button" disabled={todas} onClick={() => correr("todas")} className="presionable px-2 text-[15px] font-medium text-foreground disabled:opacity-40">
      Correr todo
    </button>
  );
}
