"use client";

import { Car, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Hoja } from "@/components/ui/hoja";
import type { ResultadoAuto } from "@/lib/datos";
import { millones, tituloAuto } from "@/lib/presentar";

/** ¿Cuál me conviene? Los guardados en el orden que sugiere la IA, con el porqué. */
export function ConvieneHoja({ abierta, onCerrar, autos, abrir }: { abierta: boolean; onCerrar: () => void; autos: ResultadoAuto[]; abrir: (id: string) => void }) {
  const [orden, setOrden] = useState<{ autoId: string; motivo: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = autos.map((r) => r.autoId).sort().join();

  useEffect(() => {
    if (!abierta || orden) return;
    setError(null);
    fetch("/api/conviene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoIds: autos.slice(0, 12).map((r) => r.autoId) }) })
      .then(async (r) => {
        const j = (await r.json()) as { orden?: { autoId: string; motivo: string }[]; error?: string };
        if (!r.ok || !j.orden) throw new Error(j.error ?? "No se pudo ordenar");
        setOrden(j.orden);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo ordenar"));
  }, [abierta, clave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setOrden(null), [clave]);

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="¿Cuál me conviene?" derecha={<button type="button" onClick={onCerrar}>Listo</button>}>
      <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <p className="text-[14px] text-muted-foreground">Tus guardados ordenados por la IA según precio, año, km, estado y lo que sabes de cada uno.</p>
        {error && <p className="mt-4 text-[14px] text-destructive">{error}</p>}
        {!orden && !error && (
          <p className="mt-6 flex items-center gap-2 text-[15px] text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Comparando {autos.length} autos…
          </p>
        )}
        {orden && (
          <ol className="mt-4 flex flex-col gap-3">
            {orden.map((o, i) => {
              const r = autos.find((x) => x.autoId === o.autoId);
              if (!r) return null;
              return (
                <li key={o.autoId}>
                  <button type="button" onClick={() => abrir(r.autoId)} className="presionable flex w-full gap-3 text-left">
                    <span className="mt-1 w-5 shrink-0 text-[15px] font-bold tabular-nums text-tenue">{i + 1}</span>
                    <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-card">
                      {r.foto ? <img src={r.foto} alt="" className="size-full object-cover" /> : <Car className="m-auto mt-5 size-6 text-tenue" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">
                        {r.precio !== null ? millones(r.precio) : "Sin precio"} <span className="font-normal text-suave">{tituloAuto(r)} {r.anio}</span>
                      </span>
                      <span className="block text-[14px] leading-[20px] text-suave">{o.motivo}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Hoja>
  );
}
