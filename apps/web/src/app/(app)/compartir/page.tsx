import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { FormCompartir } from "@/components/form-compartir";
import { Pantalla } from "@/components/pantalla";
import { leerCompartidos, NOMBRE_FUENTE } from "@/lib/datos";
import { cn } from "@/lib/utils";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "text-muted-foreground" },
  procesado: { texto: "Leído", clase: "text-calza" },
  error: { texto: "Error", clase: "text-destructive" },
  no_soportado: { texto: "No soportado", clase: "text-muted-foreground" },
};

/** Destino de "Compartir" en Android (share target) y del Atajo de iPhone; también sirve para pegar links. */
export default async function Compartir({ searchParams }: PageProps<"/compartir">) {
  const sp = await searchParams;
  const inicial = [sp.url, sp.text, sp.title].filter((x): x is string => typeof x === "string").join(" ").trim();
  const compartidos = await leerCompartidos();
  return (
    <>
      <Encabezado titulo="Agregar aviso" />
      <Pantalla>
        <main className="flex flex-col gap-7 px-4 pb-10 pt-2">
          <section>
            <FormCompartir inicial={inicial} />
            <p className="pie-grupo">Sirven avisos de Chileautos, Facebook Marketplace y MercadoLibre. En Android usa «Compartir» desde el portal y elige Radar. En iPhone, un Atajo que reciba URLs y abra «/compartir?url=» con la URL.</p>
          </section>
          {compartidos.length > 0 && (
            <section>
              <h2 className="titulo-grupo">Últimos agregados</h2>
              <div className="lista-ios">
                {compartidos.map((c) => (
                  <div key={c.id} className="fila-ios justify-between">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{c.avisos?.titulo ?? NOMBRE_FUENTE[c.fuente_id ?? ""] ?? "Link"}</span>
                      {c.error ? (
                        <span className="text-[13px] leading-[18px] text-destructive">{c.error}</span>
                      ) : c.aviso_id ? (
                        <Link href={`/auto?id=${c.aviso_id}`} className="text-[13px] leading-[18px] text-primary">
                          Ver el auto
                        </Link>
                      ) : (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="truncate text-[13px] leading-[18px] text-muted-foreground">
                          {c.url}
                        </a>
                      )}
                    </span>
                    <span className={cn("shrink-0 text-[15px]", ESTADO[c.estado]?.clase)}>{ESTADO[c.estado]?.texto ?? c.estado}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </Pantalla>
    </>
  );
}
