"use client";

import { useChat } from "@ai-sdk/react";
import type { Seguimiento } from "@radar/core";
import { ArrowUp, Check, LoaderCircle, Mic, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { guardarSeguimiento } from "@/app/(app)/acciones";
import { FichaCard } from "@/components/ficha-card";
import type { MensajeChat } from "@/lib/chat";
import { useDictado } from "@/lib/dictado";
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
              <div key={key} className="max-w-[80%] animate-in self-start whitespace-pre-wrap rounded-[18px] rounded-bl-[4px] bg-secondary px-3.5 py-2 text-[17px] leading-[22px] fade-in duration-300">
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

function Onda({ niveles }: { niveles: number[] }) {
  return (
    <span className="flex h-6 min-w-0 flex-grow items-center justify-end gap-[3px] overflow-hidden" aria-hidden>
      {niveles.map((n, i) => (
        <span key={i} className="w-[3px] shrink-0 rounded-full bg-primary transition-[height] duration-75" style={{ height: `${Math.max(3, Math.round(n * 24))}px` }} />
      ))}
    </span>
  );
}

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Chat que arma la ficha. Vive dentro de la hoja "Nuevo seguimiento". */
export function Chat({ onGuardado }: { onGuardado?: () => void }) {
  const [texto, setTexto] = useState("");
  const { messages, sendMessage, status, error, regenerate } = useChat<MensajeChat>();
  const fin = useRef<HTMLDivElement>(null);
  const ocupado = status === "submitted" || status === "streaming";
  // Lo que ya estaba escrito cuando se empezó a dictar; lo dictado se agrega después.
  const base = useRef("");
  const unirBase = (t: string) => [base.current.trim(), t.trim()].filter(Boolean).join(" ");
  const dictado = useDictado({ alCambiar: (t) => setTexto(unirBase(t)), alTerminar: (t) => setTexto(unirBase(t)) });
  const escuchando = dictado.estado === "escuchando";
  const grabando = escuchando && dictado.modo === "grabacion";
  const transcribiendo = dictado.estado === "transcribiendo";
  const dictando = escuchando || transcribiendo;

  useEffect(() => {
    if (messages.length) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || ocupado || dictando) return;
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
                <button key={e} type="button" onClick={() => enviar(e)} className="fila-ios w-full text-left text-[15px] leading-5 active:bg-presion">
                  {e}
                </button>
              ))}
            </div>
            <p className="pie-grupo">{dictado.disponible ? "O escríbelo abajo, o toca el micrófono y cuéntalo." : "O escribe el tuyo abajo."}</p>
          </>
        ) : (
          messages.map((m) => <Mensaje key={m.id} mensaje={m} onGuardado={onGuardado} />)
        )}

        {status === "submitted" && (
          <div className="flex w-fit animate-in items-center gap-1.5 rounded-[18px] rounded-bl-[4px] bg-secondary px-4 py-3 fade-in duration-200" aria-label="Escribiendo">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 rounded-full bg-tenue" style={{ animation: `punto 1s ${i * 150}ms infinite ease-in-out` }} />
            ))}
          </div>
        )}

        {error && (
          <div className="flex animate-in flex-col items-start gap-2 rounded-xl bg-card px-4 py-3 text-[15px] text-destructive fade-in duration-200">
            <span>{error.message || "Algo falló al hablar con Gemini."}</span>
            <button type="button" onClick={() => regenerate()} className="flex items-center gap-1.5 font-medium text-primary">
              <RotateCcw className="size-4" /> Reintentar
            </button>
          </div>
        )}
        <div ref={fin} />
      </div>

      <div className="sticky bottom-0 bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-0.5px_0_var(--separador)]">
        {dictado.error && (
          <button type="button" onClick={dictado.limpiarError} className="mb-2 w-full animate-in rounded-xl bg-card px-3.5 py-2.5 text-left text-[15px] leading-5 text-destructive fade-in duration-200">
            {dictado.error}
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="flex items-end gap-2"
        >
          {grabando ? (
            <div className="flex h-9 min-w-0 flex-grow items-center gap-2.5 rounded-[18px] border-[0.5px] border-separador bg-card pl-1.5 pr-3">
              <button type="button" aria-label="Descartar grabación" onClick={dictado.cancelar} className="presionable flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                <X className="size-[18px]" strokeWidth={2.4} />
              </button>
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-destructive" />
              <span className="shrink-0 text-[15px] tabular-nums text-muted-foreground">{reloj(dictado.segundos)}</span>
              <Onda niveles={dictado.niveles} />
            </div>
          ) : transcribiendo ? (
            <div className="flex h-9 flex-grow items-center gap-2 rounded-[18px] border-[0.5px] border-separador bg-card px-3 text-[17px] text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Transcribiendo…
            </div>
          ) : (
            <label className="flex min-h-9 flex-grow items-center rounded-[18px] border-[0.5px] border-separador bg-card px-3 py-1.5">
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
                readOnly={escuchando}
                placeholder={escuchando ? "Te escucho…" : messages.length ? "Responde o pide cambios" : "Describe el auto que buscas"}
                className="max-h-32 w-full resize-none bg-transparent text-[17px] leading-[22px] outline-none [field-sizing:content] placeholder:text-tenue"
              />
            </label>
          )}

          {escuchando ? (
            <button type="button" aria-label="Terminar de dictar" onClick={dictado.detener} className="presionable relative flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
              <Square className="relative size-3.5 fill-current" strokeWidth={0} />
            </button>
          ) : !texto.trim() && dictado.disponible && !transcribiendo ? (
            <button
              type="button"
              aria-label="Dictar con el micrófono"
              disabled={ocupado}
              onClick={() => {
                base.current = texto;
                dictado.iniciar();
              }}
              className="presionable flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Mic className="size-5" strokeWidth={2.4} />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Enviar"
              disabled={ocupado || dictando || !texto.trim()}
              className={cn("presionable flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity", (ocupado || dictando || !texto.trim()) && "opacity-40")}
            >
              {ocupado || transcribiendo ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" strokeWidth={2.8} />}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
