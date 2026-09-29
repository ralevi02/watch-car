"use client";

import { useAlmacen } from "@/lib/almacen";
import { cn } from "@/lib/utils";

const NOMBRE_MODELO = (m: string) => (m.includes("lite") ? "Gemini liviano" : "Gemini");

function Barra({ usado, total }: { usado: number; total: number }) {
  const p = Math.min(1, total ? usado / total : 0);
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
      <div className={cn("h-full rounded-full transition-[width] duration-500", p > 0.85 ? "bg-destructive" : p > 0.6 ? "bg-advertencia" : "bg-calza")} style={{ width: `${Math.max(2, p * 100)}%` }} />
    </div>
  );
}

/** Lo que se gasta: consultas de Gemini de hoy (cuota gratis por modelo), MB del proxy y minutos de Actions. */
export function Gastos() {
  const { datos } = useAlmacen();
  const g = datos?.gastos;
  if (!g) return null;
  // Siempre los dos de la capa gratis, aunque hoy no se hayan usado.
  const modelos = [
    ...g.ia,
    ...["gemini-flash-latest", "gemini-flash-lite-latest"].filter((m) => !g.ia.some((x) => x.modelo === m)).map((modelo) => ({ modelo, consultas: 0 })),
  ];
  const desde = new Date(`${g.proxy.desde}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  return (
    <section>
      <h2 className="titulo-grupo">Gastos</h2>
      <div className="lista-ios">
        {modelos.map((m) => (
          <div key={m.modelo} className="fila-ios flex-col !items-stretch !gap-0">
            <div className="flex justify-between">
              <span>{NOMBRE_MODELO(m.modelo)} hoy</span>
              <span className="tabular-nums text-muted-foreground">
                {m.consultas} de {g.cuotaIa}
              </span>
            </div>
            <Barra usado={m.consultas} total={g.cuotaIa} />
          </div>
        ))}
        <div className="fila-ios flex-col !items-stretch !gap-0">
          <div className="flex justify-between">
            <span>Proxy desde el {desde}</span>
            <span className="tabular-nums text-muted-foreground">
              {g.proxy.usadoMb.toLocaleString("es-CL")} de {g.proxy.limiteMb.toLocaleString("es-CL")} MB
            </span>
          </div>
          <Barra usado={g.proxy.usadoMb} total={g.proxy.limiteMb} />
        </div>
        <div className="fila-ios justify-between">
          <span>GitHub Actions este mes</span>
          <span className="tabular-nums text-muted-foreground">~{g.actionsMin} min</span>
        </div>
      </div>
      <p className="pie-grupo">La capa gratis de Gemini da {g.cuotaIa} consultas diarias por modelo; si se acaba una, se usa la otra. Actions no cobra en un repositorio público.</p>
    </section>
  );
}
