/**
 * Envuelve el contenido de cada pestaña. Antes usaba View Transitions, pero en
 * Android sacar la "foto" de una pantalla con cientos de tarjetas demoraba el
 * cambio de pestaña: ahora la pestaña aparece al tiro con un fundido corto en CSS.
 */
export function Pantalla({ children }: { children: React.ReactNode }) {
  return <div className="pantalla-entra">{children}</div>;
}

/** Lo mismo para la pantalla de carga. */
export function PantallaCarga({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
