export function Encabezado({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <header
      style={{ viewTransitionName: "encabezado" }}
      className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Radar seminuevos</p>
          <h1 className="font-heading text-2xl font-bold">{titulo}</h1>
        </div>
        {children}
      </div>
    </header>
  );
}
