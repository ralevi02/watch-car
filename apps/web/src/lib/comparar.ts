"use client";

import { useSyncExternalStore } from "react";

/** Autos elegidos para comparar lado a lado (hasta 3), guardados en el teléfono. */
const CLAVE = "radar:comparar";
export const MAX_COMPARAR = 3;
const oyentes = new Set<() => void>();
let cache: string[] | null = null;

function leer(): string[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    cache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_COMPARAR) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function escribir(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ids));
  } catch {}
  for (const o of oyentes) o();
}

const vacio: string[] = [];
export function useComparar() {
  const ids = useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    leer,
    () => vacio,
  );
  return {
    ids,
    tiene: (id: string) => ids.includes(id),
    /** Agrega o saca; si ya hay 3, saca el más antiguo. */
    alternar: (id: string) => escribir(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-MAX_COMPARAR)),
    limpiar: () => escribir([]),
  };
}
