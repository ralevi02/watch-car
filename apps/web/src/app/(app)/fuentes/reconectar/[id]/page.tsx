"use client";

import { Check, ExternalLink, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { cancelarReconexion, confirmarReconexion, leerReconexion } from "@/app/(app)/acciones";
import { Encabezado } from "@/components/encabezado";
import { Button } from "@/components/ui/button";

type Reconexion = Awaited<ReturnType<typeof leerReconexion>>;

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
      <Encabezado titulo="Reconectar Facebook" />
      <main className="flex flex-col gap-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Cuenta: <strong className="text-foreground">{rec?.cuentas_facebook?.nombre ?? "…"}</strong>. Se abre un navegador seguro en la nube con la misma IP del buscador. Inicia sesión
          ahí (usuario, clave y la verificación si la pide) y después toca «Ya inicié sesión».
        </p>

        {(estado === "pedida" || estado === "abriendo") && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-sm">
            <LoaderCircle className="size-4 animate-spin" /> Abriendo el navegador seguro… (tarda cerca de un minuto)
          </div>
        )}

        {estado === "lista" && link && (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <iframe src={link} title="Navegador seguro" className="aspect-[9/16] w-full" sandbox="allow-same-origin allow-scripts allow-forms" allow="clipboard-read; clipboard-write" />
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
                <ExternalLink className="size-4" /> Abrir en pantalla completa
              </a>
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(rec?.clave ?? "");
                  setCopiado(true);
                }}
              >
                {copiado ? "Clave copiada" : "Copiar clave de la vista"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">En el celular, usa el botón de teclado de la vista para escribir. El link deja de funcionar al terminar.</p>
            <div className="flex gap-2">
              <Button size="lg" onClick={() => confirmarReconexion(id)}>
                <Check /> Ya inicié sesión
              </Button>
              <Button size="lg" variant="ghost" onClick={() => cancelarReconexion(id)}>
                <X /> Cancelar
              </Button>
            </div>
          </>
        )}

        {estado === "guardando" && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-sm">
            <LoaderCircle className="size-4 animate-spin" /> Revisando que la sesión sirva para Marketplace y guardándola cifrada…
          </div>
        )}

        {estado === "ok" && <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">Listo: la sesión quedó guardada y la cuenta activa.</div>}
        {(estado === "error" || estado === "vencida") && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">{rec?.error ?? "No se pudo reconectar."}</div>
        )}
        {rec?.run_url && (
          <a href={rec.run_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">
            Ver la corrida en GitHub
          </a>
        )}
        {terminado && (
          <Link href="/fuentes" className="text-sm font-medium text-primary">
            Volver a Fuentes
          </Link>
        )}
      </main>
    </>
  );
}
