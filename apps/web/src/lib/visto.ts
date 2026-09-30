"use client";

/**
 * Lo nuevo desde tu última visita: al abrir Resultados se toma la fecha de la
 * visita anterior (queda fija mientras la app está abierta) y al salir se
 * guarda la de ahora. Lo publicado después de esa fecha se marca "Nuevo para ti".
 */
const CLAVE = "radar:ultima-visita";
let desde: number | null = null;

export function iniciarVisita() {
  if (desde !== null) return;
  try {
    desde = Number(localStorage.getItem(CLAVE)) || 0;
  } catch {
    desde = 0;
  }
  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {}
  };
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && guardar());
  window.addEventListener("pagehide", guardar);
}

/** Apareció después de tu última visita (la primera vez que se abre la app no marca nada). */
export const nuevoParaTi = (primeraVez: string) => Boolean(desde) && new Date(primeraVez).getTime() > desde!;
