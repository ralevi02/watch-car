import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { ResultadoCard } from "@/components/resultado-card";
import { leerBusquedas, leerResultados, type Filtro } from "@/lib/datos";
import { cn } from "@/lib/utils";

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "nuevos", etiqueta: "Nuevos" },
  { id: "bajo", etiqueta: "Bajó de precio" },
  { id: "advertencia", etiqueta: "Con advertencia" },
  { id: "favoritos", etiqueta: "Favoritos" },
  { id: "descartados", etiqueta: "Descartados" },
];

export default async function Resultados({ searchParams }: PageProps<"/resultados">) {
  const sp = await searchParams;
  const filtro = (FILTROS.find((f) => f.id === sp.filtro)?.id ?? "todos") as Filtro;
  const busqueda = typeof sp.busqueda === "string" ? sp.busqueda : undefined;
  const aviso = typeof sp.aviso === "string" ? sp.aviso : undefined;
  const [busquedas, { resultados, cuentas }] = await Promise.all([leerBusquedas(), leerResultados(busqueda, filtro)]);

  const enlace = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const todo = { filtro: filtro === "todos" ? undefined : filtro, busqueda, ...cambios };
    for (const [k, v] of Object.entries(todo)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/resultados?${q}` : "/resultados";
  };

  return (
    <>
      <Encabezado titulo="Resultados" />
      <div className="flex flex-col gap-3 px-4 pt-3">
        {busquedas.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link href={enlace({ busqueda: undefined })} className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", !busqueda ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
              Todas
            </Link>
            {busquedas.map((b) => (
              <Link key={b.id} href={enlace({ busqueda: b.id })} className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", busqueda === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                {b.nombre}
              </Link>
            ))}
          </div>
        )}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTROS.map((f) => (
            <Link
              key={f.id}
              href={enlace({ filtro: f.id === "todos" ? undefined : f.id })}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                filtro === f.id ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border",
              )}
            >
              {f.etiqueta} <span className="opacity-60">{cuentas[f.id]}</span>
            </Link>
          ))}
        </div>
      </div>

      <main className="flex flex-col gap-3 px-4 py-4">
        {resultados.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            {busquedas.length === 0
              ? "Todavía no tienes seguimientos. Crea uno en la pestaña Seguimientos."
              : filtro === "todos"
                ? "Aún no hay avisos que calcen. La próxima pasada corre dentro de las próximas 3 horas."
                : "Nada por aquí con este filtro."}
          </p>
        ) : (
          resultados.map((r) => <ResultadoCard key={r.autoId} r={r} destacado={r.enlaces.some((e) => e.id === aviso)} />)
        )}
      </main>
    </>
  );
}
