import { PantallaCarga } from "@/components/pantalla";

/** Pantalla de carga: se muestra apenas se toca una pestaña, mientras llegan los datos. */
export function Esqueleto({ titulo, tarjetas = 3 }: { titulo: string; tarjetas?: number }) {
  return (
    <>
      <div style={{ viewTransitionName: "encabezado" }} className="sticky top-0 z-20 bg-background pt-[env(safe-area-inset-top)]">
        <div className="h-11" />
      </div>
      <h1 className="px-4 pb-2 text-[34px] font-bold leading-[41px] tracking-[0.37px]">{titulo}</h1>
      <PantallaCarga>
        <div className="flex flex-col gap-4 px-4 py-2" aria-busy="true" aria-label="Cargando">
          <div className="h-9 animate-pulse rounded-[10px] bg-muted" />
          {Array.from({ length: tarjetas }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-[14px] bg-card" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="aspect-[16/9] animate-pulse bg-secondary" />
              <div className="flex flex-col gap-2 p-3.5">
                <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-card" />
              </div>
            </div>
          ))}
        </div>
      </PantallaCarga>
    </>
  );
}
