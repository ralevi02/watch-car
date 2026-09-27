import { PantallaCarga } from "@/components/pantalla";

export default function Cargando() {
  return (
    <PantallaCarga>
      <div aria-busy="true" aria-label="Cargando">
        <div className="aspect-[4/3] animate-pulse bg-[#E5E5EA]" />
        <div className="flex flex-col gap-3 p-4">
          <div className="h-7 w-3/4 animate-pulse rounded bg-[#E5E5EA]" />
          <div className="h-7 w-1/2 animate-pulse rounded bg-[#E5E5EA]" />
          <div className="mt-2 h-48 animate-pulse rounded-xl bg-card" />
        </div>
      </div>
    </PantallaCarga>
  );
}
