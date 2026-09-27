import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { ListaResultados } from "@/components/lista-resultados";
import { Pantalla } from "@/components/pantalla";
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
      <Encabezado titulo="Resultados">
        <Link href="/compartir" className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium">
          + Pegar link
        </Link>
      </Encabezado>
      <Pantalla>
      <div className="flex flex-col gap-3 px-4 pt-3">
        {busquedas.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={enlace({ busqueda: undefined })} className={cn("presionable shrink-0 rounded-full border px-3 py-1 text-sm", !busqueda ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
              Todas
            </Link>
            {busquedas.map((b) => (
              <Link key={b.id} href={enlace({ busqueda: b.id })} className={cn("presionable shrink-0 rounded-full border px-3 py-1 text-sm", busqueda === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                {b.nombre}
              </Link>
            ))}
          </div>
        )}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTROS.map((f) => (
            <Link
              key={f.id}
              href={enlace({ filtro: f.id === "todos" ? undefined : f.id })}
              className={cn(
                "presionable shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                filtro === f.id ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border",
              )}
            >
              {f.etiqueta} <span className="opacity-60">{cuentas[f.id]}</span>
            </Link>
          ))}
        </div>
      </div>

      <ListaResultados clave={`${filtro}-${busqueda ?? "todas"}`} resultados={resultados} aviso={aviso} filtro={filtro} vacio={
            busquedas.length === 0
              ? "Todavía no tienes seguimientos. Crea uno en la pestaña Seguimientos."
              : filtro === "todos"
                ? "Aún no hay avisos que calcen. La próxima pasada corre dentro de las próximas 3 horas."
                : "Nada por aquí con este filtro."
          } />
      </Pantalla>
    </>
  );
}
