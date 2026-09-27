import { ViewTransition } from "react";

/** Tipos de navegación que marcan las pestañas: adelante (hacia la derecha) o atrás. */
const DIRECCION = { "nav-adelante": "nav-adelante", "nav-atras": "nav-atras" } as const;

/**
 * Envuelve el contenido de cada página: al cambiar de pestaña se desliza en la
 * dirección de la pestaña; al llegar los datos después de la pantalla de
 * carga, sube suave. Otras actualizaciones (filtros, marcar) no la animan.
 */
export function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={{ ...DIRECCION, default: "aparecer" }} exit={{ ...DIRECCION, default: "none" }} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}

/** Lo mismo para la pantalla de carga: se va rápido cuando llegan los datos. */
export function PantallaCarga({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={{ ...DIRECCION, default: "none" }} exit={{ ...DIRECCION, default: "esfumar" }} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
