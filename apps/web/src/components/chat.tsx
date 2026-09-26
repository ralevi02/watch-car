"use client";

import { useChat } from "@ai-sdk/react";
import type { Seguimiento } from "@radar/core";
import { ArrowUp, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { guardarSeguimiento } from "@/app/(app)/acciones";
import { FichaCard } from "@/components/ficha-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MensajeChat } from "@/lib/chat";

const EJEMPLOS = [
  "Volvo V40 Cross Country, 2017 o más nuevo, bajo 120 mil km, hasta 14 millones. Acepto más km con advertencia.",
  "Volvo V60 Cross Country T5, hasta 16 millones, solo automático",
  "Mazda CX-5 2019 en adelante, hasta 15 millones, en la Región Metropolitana",
];

function BotonGuardar({ ficha }: { ficha: Seguimiento }) {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<"listo" | "guardado" | string>("listo");
  if (estado === "guardado")
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
        <Check className="size-4" /> Guardado: la próxima pasada ya lo busca
      </span>
    );
  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={() =>
          iniciar(async () => {
            const r = await guardarSeguimiento(ficha);
            setEstado(r.ok ? "guardado" : r.error);
          })
        }
        disabled={pendiente}
      >
        {pendiente && <LoaderCircle className="animate-spin" />} Guardar seguimiento
      </Button>
      {estado !== "listo" && <span className="text-xs text-destructive">{estado}</span>}
    </div>
  );
}

function Mensaje({ mensaje }: { mensaje: MensajeChat }) {
  if (mensaje.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
          {mensaje.parts.map((p) => (p.type === "text" ? p.text : null))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mensaje.parts.map((p, i) => {
        const key = `${mensaje.id}-${i}`;
        switch (p.type) {
          case "text":
            return p.text.trim() ? (
              <div key={key} className="max-w-[90%] whitespace-pre-wrap leading-relaxed">
                {p.text}
              </div>
            ) : null;
          case "tool-crear_seguimiento":
            switch (p.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" /> Armando la ficha…
                  </div>
                );
              case "output-available":
                return <FichaCard key={key} ficha={p.output.ficha} pie={<BotonGuardar ficha={p.output.ficha} />} />;
              case "output-error":
                return (
                  <div key={key} className="text-sm text-destructive">
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

export function Chat({ conSeguimientos }: { conSeguimientos: boolean }) {
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
    <>
      <div className="flex flex-1 flex-col gap-5 px-4 py-5">
        {messages.length === 0 && (
          <section className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              {conSeguimientos ? "¿Quieres seguir otro auto? " : ""}Cuéntame qué auto buscas, como se lo dirías a alguien. Armo la ficha y la guardas para que la app traiga los avisos que calcen.
            </p>
            <div className="flex flex-col gap-2">
              {EJEMPLOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => enviar(e)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {e}
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((m) => (
          <Mensaje key={m.id} mensaje={m} />
        ))}

        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Pensando…
          </div>
        )}

        {error && (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{error.message || "Algo falló al hablar con Gemini."}</span>
            <Button variant="outline" size="sm" onClick={() => regenerate()}>
              <RotateCcw /> Reintentar
            </Button>
          </div>
        )}
        <div ref={fin} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border bg-background/95 px-4 py-3 backdrop-blur"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            placeholder="Describe el auto que buscas"
            rows={1}
            className="max-h-40 min-h-11 resize-none bg-card"
          />
          <Button type="submit" size="icon-lg" className="size-11 rounded-full" disabled={ocupado || !texto.trim()} aria-label="Enviar">
            {ocupado ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </form>
    </>
  );
}
