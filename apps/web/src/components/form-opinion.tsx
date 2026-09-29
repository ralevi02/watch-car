"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { opinar } from "@/app/v/[token]/acciones";
import { cn } from "@/lib/utils";

const VOTOS = [
  { id: "me_gusta", etiqueta: "Me gusta" },
  { id: "dudas", etiqueta: "Tengo dudas" },
  { id: "no_me_convence", etiqueta: "No me convence" },
] as const;

/** Formulario para opinar sobre un auto compartido. El nombre queda guardado en este teléfono. */
export function FormOpinion({ token }: { token: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  useEffect(() => {
    try {
      setNombre((n) => n || (localStorage.getItem("radar:nombre") ?? ""));
    } catch {}
  }, []);
  const [voto, setVoto] = useState<(typeof VOTOS)[number]["id"] | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, iniciar] = useTransition();

  if (listo) return <p className="mt-4 rounded-xl bg-card px-4 py-3 text-[15px]">Listo, se guardó tu opinión.</p>;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voto) return setError("Elige una opción.");
    iniciar(async () => {
      const r = await opinar({ token, nombre, voto, texto });
      if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
      try {
        localStorage.setItem("radar:nombre", nombre.trim());
      } catch {}
      setListo(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
      <div role="radiogroup" aria-label="Tu opinión" className="grid grid-cols-3 gap-2">
        {VOTOS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={voto === v.id}
            onClick={() => setVoto(v.id)}
            className={cn("presionable h-11 rounded-xl text-[14px] font-medium", voto === v.id ? "bg-primary text-primary-foreground" : "bg-card")}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={40}
        placeholder="Tu nombre"
        aria-label="Tu nombre"
        className="h-12 rounded-xl bg-card px-4 text-[16px] outline-none placeholder:text-tenue"
      />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Algo que te llame la atención (opcional)"
        aria-label="Comentario"
        className="resize-none rounded-xl bg-card px-4 py-3 text-[16px] leading-[22px] outline-none placeholder:text-tenue"
      />
      {error && <p className="text-[14px] text-destructive">{error}</p>}
      <button type="submit" disabled={enviando || !nombre.trim()} className="presionable h-[50px] rounded-full bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-50">
        {enviando ? "Guardando…" : "Enviar opinión"}
      </button>
    </form>
  );
}
