import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { FormCompartir } from "@/components/form-compartir";
import { Badge } from "@/components/ui/badge";
import { leerCompartidos, NOMBRE_FUENTE } from "@/lib/datos";

const ESTADO: Record<string, string> = { pendiente: "Pendiente", procesado: "Leído", error: "Error", no_soportado: "No soportado" };

/** Destino de "Compartir" en Android (share target) y del Atajo de iPhone; también sirve para pegar links. */
export default async function Compartir({ searchParams }: PageProps<"/compartir">) {
  const sp = await searchParams;
  const inicial = [sp.url, sp.text, sp.title].filter((x): x is string => typeof x === "string").join(" ").trim();
  const compartidos = await leerCompartidos();
  return (
    <>
      <Encabezado titulo="Agregar aviso" />
      <main className="flex flex-col gap-6 px-4 py-4">
        <FormCompartir inicial={inicial} />
        <p className="text-xs text-muted-foreground">
          En Android: «Compartir» desde Facebook o Chileautos y elige Radar. En iPhone: crea un Atajo que reciba URLs desde la hoja de compartir y abra
          «/compartir?url=» + la URL.
        </p>
        {compartidos.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Últimos agregados</h2>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card text-sm">
              {compartidos.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.avisos?.titulo ?? NOMBRE_FUENTE[c.fuente_id ?? ""] ?? "Link"}</span>
                    <Badge variant={c.estado === "error" ? "destructive" : "secondary"}>{ESTADO[c.estado] ?? c.estado}</Badge>
                  </div>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="truncate text-muted-foreground">
                    {c.url}
                  </a>
                  {c.error && <span className="text-destructive">{c.error}</span>}
                  {c.aviso_id && (
                    <Link href={`/resultados?aviso=${c.aviso_id}`} className="text-primary">
                      Ver en resultados
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
