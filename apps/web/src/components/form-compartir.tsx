"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { compartirLink } from "@/app/(app)/acciones";

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
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await compartirLink(texto);
          if (r.ok) navigator.vibrate?.(10);
          setResultado(r.ok ? { ok: true, texto: MENSAJE[r.fuente ?? ""] ?? "Guardado." } : { ok: false, texto: r.error });
          if (r.ok) setTexto("");
        });
      }}
    >
      <div className="lista-ios">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pega el link del aviso"
          rows={3}
          aria-label="Link del aviso"
          className="block w-full resize-none bg-transparent px-4 py-3 text-[17px] leading-[22px] outline-none placeholder:text-[#C4C4C6]"
        />
      </div>
      <button type="submit" disabled={pendiente || !texto.trim()} className="presionable flex h-[50px] items-center justify-center gap-2 rounded-[12px] bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-40">
        {pendiente && <LoaderCircle className="size-5 animate-spin" />} Agregar aviso
      </button>
      {resultado && <p className={resultado.ok ? "pie-grupo text-calza" : "pie-grupo text-destructive"}>{resultado.texto}</p>}
    </form>
  );
}
