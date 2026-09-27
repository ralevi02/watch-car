/** Pantalla de carga: se muestra apenas se toca una pestaña, mientras llegan los datos. */
export function Esqueleto({ titulo, tarjetas = 3 }: { titulo: string; tarjetas?: number }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Radar seminuevos</p>
        <h1 className="font-heading text-2xl font-bold">{titulo}</h1>
      </header>
      <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true" aria-label="Cargando">
        <div className="h-8 w-3/4 animate-pulse rounded-full bg-muted" />
        {Array.from({ length: tarjetas }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    </>
  );
}
