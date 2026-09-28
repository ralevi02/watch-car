"use client";

import { Check, ChevronLeft, ExternalLink, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { cancelarReconexion, confirmarReconexion, leerReconexion } from "@/app/(app)/acciones";
import { Encabezado } from "@/components/encabezado";

type Reconexion = Awaited<ReturnType<typeof leerReconexion>>;

function Aviso({ children, clase }: { children: React.ReactNode; clase?: string }) {
  return <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-[15px] leading-5 ${clase ?? "bg-card"}`}>{children}</div>;
}

export default function Reconectar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rec, setRec] = useState<Reconexion>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      const r = await leerReconexion(id);
      if (vivo) setRec(r);
    };
    leer();
    const t = setInterval(leer, 3000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [id]);

  const estado = rec?.estado ?? "pedida";
  const link = rec?.url && rec.clave ? `${rec.url}&password=${encodeURIComponent(rec.clave)}` : null;
  const terminado = ["ok", "error", "vencida"].includes(estado);

  return (
    <>
      <Encabezado
        titulo="Reconectar Facebook"
        izquierda={
          <Link href="/fuentes" transitionTypes={["nav-atras"]} className="presionable -ml-2 flex items-center text-[17px] text-primary">
            <ChevronLeft className="size-7" strokeWidth={2.2} /> Fuentes
          </Link>
        }
      />
      <main className="flex flex-col gap-5 px-4 pb-10 pt-2">
        <div>
          <div className="lista-ios">
            <div className="fila-ios justify-between">
              <span>Cuenta</span>
              <span className="text-muted-foreground">{rec?.cuentas_facebook?.nombre ?? "…"}</span>
            </div>
          </div>
          <p className="pie-grupo">
            Se abre un navegador seguro en la nube con la misma IP del buscador. Inicia sesión ahí (usuario, clave y la verificación si la pide) y después toca «Ya inicié
            sesión».
          </p>
        </div>

        {(estado === "pedida" || estado === "abriendo") && (
          <Aviso>
            <LoaderCircle className="size-5 shrink-0 animate-spin text-muted-foreground" /> Abriendo el navegador seguro. Tarda uno o dos minutos.
          </Aviso>
        )}

        {estado === "lista" && link && (
          <>
            <div className="overflow-hidden rounded-[12px] bg-black">
              <iframe src={link} title="Navegador seguro" className="aspect-[9/16] w-full" sandbox="allow-same-origin allow-scripts allow-forms" allow="clipboard-read; clipboard-write" />
            </div>
            <div>
              <div className="lista-ios">
                <a href={link} target="_blank" rel="noopener noreferrer" className="fila-ios justify-between text-primary active:bg-white/5">
                  Abrir en pantalla completa <ExternalLink className="size-4 text-tenue" strokeWidth={2.4} />
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(rec?.clave ?? "");
                    setCopiado(true);
                  }}
                  className="fila-ios w-full justify-between text-left text-primary active:bg-white/5"
                >
                  {copiado ? "Clave copiada" : "Copiar clave de la vista"}
                  {copiado && <Check className="size-5 text-calza" strokeWidth={2.6} />}
                </button>
              </div>
              <p className="pie-grupo">En el celular, usa el botón de teclado de la vista para escribir. El link deja de funcionar al terminar.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => confirmarReconexion(id)} className="presionable flex h-[50px] items-center justify-center gap-2 rounded-[12px] bg-primary text-[17px] font-semibold text-primary-foreground">
                Ya inicié sesión
              </button>
              <button type="button" onClick={() => cancelarReconexion(id)} className="presionable h-11 text-[17px] text-destructive">
                Cancelar
              </button>
            </div>
          </>
        )}

        {estado === "guardando" && (
          <Aviso>
            <LoaderCircle className="size-5 shrink-0 animate-spin text-muted-foreground" /> Revisando que la sesión sirva para Marketplace y guardándola cifrada.
          </Aviso>
        )}

        {estado === "ok" && (
          <Aviso clase="bg-calza-fondo text-calza">
            <Check className="size-5 shrink-0" strokeWidth={2.6} /> Listo: la sesión quedó guardada y la cuenta activa.
          </Aviso>
        )}
        {(estado === "error" || estado === "vencida") && <Aviso clase="bg-card text-destructive">{rec?.error ?? "No se pudo reconectar."}</Aviso>}

        {(rec?.run_url || terminado) && (
          <div className="lista-ios">
            {rec?.run_url && (
              <a href={rec.run_url} target="_blank" rel="noopener noreferrer" className="fila-ios justify-between text-primary active:bg-white/5">
                Ver la corrida en GitHub <ExternalLink className="size-4 text-tenue" strokeWidth={2.4} />
              </a>
            )}
            {terminado && (
              <Link href="/fuentes" transitionTypes={["nav-atras"]} className="fila-ios text-primary active:bg-white/5">
                Volver a Fuentes
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
