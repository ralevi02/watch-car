"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import type { DetalleAuto, Todo } from "@/lib/datos";

const CLAVE = "radar:datos:v1";
/** Cada cuánto se actualiza por detrás mientras la app está a la vista. */
const CADA_MS = 60_000;
/** Al volver a la app, se actualiza si lo guardado tiene más que esto. */
const VIEJO_MS = 20_000;

interface Almacen {
  /** null solo la primera vez que se abre la app en este teléfono. */
  datos: Todo | null;
  actualizando: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
  /** Cambia lo guardado al tiro (acciones optimistas); la próxima lectura lo confirma. */
  cambiar: (f: (d: Todo) => Todo) => void;
  detalles: Record<string, DetalleAuto>;
  pedirDetalle: (id: string) => void;
}

const Contexto = createContext<Almacen | null>(null);

export function useAlmacen() {
  const a = use(Contexto);
  if (!a) throw new Error("Falta ProveedorAlmacen");
  return a;
}

function leerGuardado(): Todo | null {
  try {
    const t = localStorage.getItem(CLAVE);
    return t ? (JSON.parse(t) as Todo) : null;
  } catch {
    return null;
  }
}

function guardar(d: Todo) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d));
  } catch {
    /* sin espacio o modo privado: no pasa nada */
  }
}

export function borrarGuardado() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {}
}

/**
 * Los datos de las pestañas viven aquí, en el teléfono. Las pantallas los
 * muestran al tiro (lo guardado de la vez anterior) y se actualizan por detrás:
 * cambiar de pestaña nunca espera al servidor.
 */
export function ProveedorAlmacen({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<Record<string, DetalleAuto>>({});
  const enCurso = useRef<Promise<void> | null>(null);
  const leidoEn = useRef(0);
  const pidiendo = useRef(new Set<string>());

  const refrescar = useCallback(() => {
    if (enCurso.current) return enCurso.current;
    setActualizando(true);
    const p = (async () => {
      try {
        const r = await fetch("/api/datos", { cache: "no-store" });
        if (r.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
        if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
        const d = (await r.json()) as Todo;
        leidoEn.current = Date.now();
        setDatos(d);
        setError(null);
        guardar(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sin conexión");
      } finally {
        enCurso.current = null;
        setActualizando(false);
      }
    })();
    enCurso.current = p;
    return p;
  }, []);

  const cambiar = useCallback((f: (d: Todo) => Todo) => {
    setDatos((d) => {
      if (!d) return d;
      const nuevo = f(d);
      guardar(nuevo);
      return nuevo;
    });
  }, []);

  const pedirDetalle = useCallback((id: string) => {
    if (pidiendo.current.has(id)) return;
    pidiendo.current.add(id);
    fetch(`/api/auto/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<DetalleAuto>) : null))
      .then((d) => d && setDetalles((x) => ({ ...x, [id]: d })))
      .catch(() => {})
      .finally(() => pidiendo.current.delete(id));
  }, []);

  useEffect(() => {
    const guardado = leerGuardado();
    if (guardado) setDatos(guardado);
    void refrescar();
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - leidoEn.current > VIEJO_MS) void refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alVolver);
    const t = setInterval(() => document.visibilityState === "visible" && refrescar(), CADA_MS);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
      clearInterval(t);
    };
  }, [refrescar]);

  return <Contexto value={{ datos, actualizando, error, refrescar, cambiar, detalles, pedirDetalle }}>{children}</Contexto>;
}
