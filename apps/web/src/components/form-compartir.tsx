"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { compartirLink } from "@/app/(app)/acciones";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MENSAJE: Record<string, string> = {
  chileautos: "Listo: la próxima pasada de Chileautos lo lee y lo evalúa con tus fichas.",
  facebook: "Listo: la próxima pasada de Facebook lo lee con la cuenta secundaria.",
  mercadolibre: "Guardado. MercadoLibre todavía no se lee automáticamente.",
};

export function FormCompartir({ inicial }: { inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await compartirLink(texto);
          setResultado(r.ok ? { ok: true, texto: MENSAJE[r.fuente ?? ""] ?? "Guardado." } : { ok: false, texto: r.error });
          if (r.ok) setTexto("");
        });
      }}
    >
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pega aquí el link del aviso (Chileautos, Facebook Marketplace o MercadoLibre)" className="min-h-20 bg-card" />
      <Button type="submit" disabled={pendiente || !texto.trim()}>
        {pendiente && <LoaderCircle className="animate-spin" />} Agregar aviso
      </Button>
      {resultado && <p className={resultado.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{resultado.texto}</p>}
    </form>
  );
}
