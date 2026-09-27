"use client";

import { useChat } from "@ai-sdk/react";
import type { Seguimiento } from "@radar/core";
import { ArrowUp, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { guardarSeguimiento } from "@/app/(app)/acciones";
import { FichaCard } from "@/components/ficha-card";
import type { MensajeChat } from "@/lib/chat";
import { cn } from "@/lib/utils";

const EJEMPLOS = [
  "Volvo V40 Cross Country, 2017 o más nuevo, bajo 120 mil km, hasta 14 millones. Acepto más km con advertencia.",
  "Mazda CX-5 2019 en adelante, hasta 15 millones, en la Región Metropolitana",
  "Toyota RAV4 híbrida, hasta 20 millones, solo automática",
];

function BotonGuardar({ ficha, onGuardado }: { ficha: Seguimiento; onGuardado?: () => void }) {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<"listo" | "guardado" | string>("listo");
  if (estado === "guardado")
    return (
      <span className="flex animate-in items-center justify-center gap-1.5 py-1.5 text-[17px] font-medium text-calza fade-in duration-300">
        <Check className="size-5 animate-[pop_320ms_ease-out]" strokeWidth={2.6} /> Guardado
      </span>
    );
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await guardarSeguimiento(ficha);
            if (r.ok) {
              navigator.vibrate?.(10);
              setEstado("guardado");
              setTimeout(() => onGuardado?.(), 700);
            } else setEstado(r.error);
          })
        }
        className="presionable flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pendiente && <LoaderCircle className="size-5 animate-spin" />} Guardar seguimiento
      </button>
      {estado !== "listo" && <span className="text-center text-[13px] text-destructive">{estado}</span>}
    </div>
  );
}

function Mensaje({ mensaje, onGuardado }: { mensaje: MensajeChat; onGuardado?: () => void }) {
  if (mensaje.role === "user") {
    return (
      <div className="flex animate-in justify-end fade-in slide-in-from-bottom-2 duration-200">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-[18px] rounded-br-[4px] bg-primary px-3.5 py-2 text-[17px] leading-[22px] text-primary-foreground">
          {mensaje.parts.map((p) => (p.type === "text" ? p.text : null))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {mensaje.parts.map((p, i) => {
        const key = `${mensaje.id}-${i}`;
        switch (p.type) {
          case "text":
            return p.text.trim() ? (
              <div key={key} className="max-w-[80%] animate-in self-start whitespace-pre-wrap rounded-[18px] rounded-bl-[4px] bg-[#E5E5EA] px-3.5 py-2 text-[17px] leading-[22px] fade-in duration-300">
                {p.text}
              </div>
            ) : null;
          case "tool-crear_seguimiento":
            switch (p.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <div key={key} className="flex animate-in items-center gap-2 self-start px-1 text-[15px] text-muted-foreground fade-in duration-200">
                    <LoaderCircle className="size-4 animate-spin" /> Armando la ficha…
                  </div>
                );
              case "output-available":
                return (
                  <div key={key} className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
                    <FichaCard ficha={p.output.ficha} pie={<BotonGuardar ficha={p.output.ficha} onGuardado={onGuardado} />} />
                  </div>
                );
              case "output-error":
                return (
                  <div key={key} className="self-start px-1 text-[15px] text-destructive">
                    No se pudo armar la ficha: {p.errorText}
                  </div>
                );
              default:
                return null;
            }
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Chat que arma la ficha. Vive dentro de la hoja "Nuevo seguimiento". */
export function Chat({ onGuardado }: { onGuardado?: () => void }) {
  const [texto, setTexto] = useState("");
  const { messages, sendMessage, status, error, regenerate } = useChat<MensajeChat>();
  const fin = useRef<HTMLDivElement>(null);
  const ocupado = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (messages.length) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || ocupado) return;
    sendMessage({ text: limpio });
    setTexto("");
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-grow flex-col gap-2.5 px-4 pb-4">
        {messages.length === 0 ? (
          <>
            <p className="mb-1 text-center text-[13px] text-muted-foreground">Cuéntame qué auto buscas, como se lo dirías a alguien.</p>
            <div className="lista-ios">
              {EJEMPLOS.map((e) => (
                <button key={e} type="button" onClick={() => enviar(e)} className="fila-ios w-full text-left text-[15px] leading-5 active:bg-black/5">
                  {e}
                </button>
              ))}
            </div>
            <p className="pie-grupo">O escribe el tuyo abajo.</p>
          </>
        ) : (
          messages.map((m) => <Mensaje key={m.id} mensaje={m} onGuardado={onGuardado} />)
        )}

        {status === "submitted" && (
          <div className="flex w-fit animate-in items-center gap-1.5 rounded-[18px] rounded-bl-[4px] bg-[#E5E5EA] px-4 py-3 fade-in duration-200" aria-label="Escribiendo">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 rounded-full bg-[#8E8E93]" style={{ animation: `punto 1s ${i * 150}ms infinite ease-in-out` }} />
            ))}
          </div>
        )}

        {error && (
          <div className="flex animate-in flex-col items-start gap-2 rounded-xl bg-[#FFE5E7] px-4 py-3 text-[15px] text-destructive fade-in duration-200">
            <span>{error.message || "Algo falló al hablar con Gemini."}</span>
            <button type="button" onClick={() => regenerate()} className="flex items-center gap-1.5 font-medium text-primary">
              <RotateCcw className="size-4" /> Reintentar
            </button>
          </div>
        )}
        <div ref={fin} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-0 flex items-end gap-2 bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-0.5px_0_var(--separador)]"
      >
        <label className="flex min-h-9 flex-grow items-center rounded-[18px] border-[0.5px] border-[#C6C6C8] bg-card px-3 py-1.5">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            rows={1}
            aria-label="Mensaje"
            placeholder={messages.length ? "Responde o pide cambios" : "Describe el auto que buscas"}
            className="max-h-32 w-full resize-none bg-transparent text-[17px] leading-[22px] outline-none [field-sizing:content] placeholder:text-[#C4C4C6]"
          />
        </label>
        <button
          type="submit"
          aria-label="Enviar"
          disabled={ocupado || !texto.trim()}
          className={cn("presionable flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity", (ocupado || !texto.trim()) && "opacity-40")}
        >
          {ocupado ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" strokeWidth={2.8} />}
        </button>
      </form>
    </div>
  );
}
