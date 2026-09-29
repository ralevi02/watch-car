"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Hoja } from "@/components/ui/hoja";
import type { ResultadoAuto } from "@/lib/datos";
import { cn } from "@/lib/utils";

const SUGERENCIAS = ["¿Es buen precio?", "¿Qué le reviso a este auto?", "¿Qué le pregunto al vendedor?", "¿Cuánto le ofrezco?"];

/** Preguntarle a la IA sobre este auto: ve el aviso, lo que ya sabes y los precios de autos parecidos. */
export function Preguntar({ r }: { r: ResultadoAuto }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className="presionable mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-card text-[15px] font-semibold">
        <Sparkles className="size-[18px]" strokeWidth={1.8} /> Preguntar sobre este auto
      </button>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Preguntar" derecha={<button type="button" onClick={() => setAbierta(false)}>Listo</button>}>
        <Conversacion r={r} />
      </Hoja>
    </>
  );
}

function Conversacion({ r }: { r: ResultadoAuto }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/preguntar", body: { autoId: r.autoId } }), [r.autoId]);
  const { messages, sendMessage, status, error } = useChat({ transport, id: `preguntar-${r.autoId}` });
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const ocupado = status === "submitted" || status === "streaming";

  const enviar = (t: string) => {
    const limpio = t.trim();
    if (!limpio || ocupado) return;
    setTexto("");
    void sendMessage({ text: limpio }).then(() => fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  };

  return (
    <div className="flex min-h-full flex-col px-5 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <div className="flex flex-grow flex-col gap-3">
        {!messages.length && (
          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" onClick={() => enviar(s)} className="presionable h-10 rounded-full bg-card px-4 text-[14px] font-medium">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[88%] whitespace-pre-line rounded-[18px] px-4 py-2.5 text-[15px] leading-[22px]",
              m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-card",
            )}
          >
            {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
          </div>
        ))}
        {status === "submitted" && <div className="self-start rounded-[18px] bg-card px-4 py-2.5 text-[15px] text-muted-foreground">Pensando…</div>}
        {error && <p className="text-[13px] text-destructive">{error.message}</p>}
        <div ref={fin} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-0 mt-4 flex items-center gap-2 bg-hoja pt-2"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pregunta lo que quieras"
          aria-label="Pregunta"
          className="h-11 min-w-0 flex-grow rounded-full bg-card px-4 text-[16px] outline-none placeholder:text-tenue"
        />
        <button type="submit" aria-label="Enviar" disabled={!texto.trim() || ocupado} className="presionable flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
          <ArrowUp className="size-5" strokeWidth={2.2} />
        </button>
      </form>
    </div>
  );
}
