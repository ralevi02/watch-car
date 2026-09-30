"use client";

import { useEffect, useState } from "react";
import { Hoja } from "@/components/ui/hoja";
import { cn } from "@/lib/utils";

const PASOS: { grupo: string; items: { id: string; texto: string; ayuda?: string; url?: string }[] }[] = [
  {
    grupo: "Antes de pagar",
    items: [
      { id: "padron", texto: "Pide el padrón y compara patente, número de motor y chasis con el auto", ayuda: "Tienen que coincidir con lo que ves en el auto" },
      { id: "anotaciones", texto: "Saca el certificado de anotaciones vigentes", ayuda: "Muestra el dueño actual, prendas y embargos. Registro Civil, $1.560", url: "https://www.chileatiende.gob.cl/fichas/3370-certificado-de-anotaciones-vigentes-de-vehiculos-motorizados" },
      { id: "robo", texto: "Revisa que no tenga encargo por robo", ayuda: "Auto Seguro, gratis", url: "https://www.autoseguro.gob.cl/" },
      { id: "multas", texto: "Revisa las multas impagas", ayuda: "Quedan asociadas a la patente: que el vendedor las pague antes", url: "https://www.chileatiende.gob.cl/fichas/3439-certificado-de-multas-de-transito-no-pagadas" },
      { id: "vigentes", texto: "Pide el permiso de circulación, el SOAP y la revisión técnica vigentes" },
      { id: "dueno", texto: "Confirma que quien vende es el dueño que sale en el certificado", ayuda: "Si no es, necesita un poder notarial" },
    ],
  },
  {
    grupo: "El día de la compra",
    items: [
      { id: "contrato", texto: "Firmen el contrato de compraventa en una notaría (o notaría en línea)", ayuda: "Firman el dueño y tú; la notaría manda la transferencia al Registro Civil" },
      { id: "impuesto", texto: "Paga el impuesto de transferencia", ayuda: "1,5% del precio o de la tasación fiscal, el que sea mayor" },
      { id: "pago", texto: "Paga al firmar, con vale vista o transferencia", ayuda: "Nunca abonos ni reservas antes de ver el auto y los papeles" },
      { id: "llaves", texto: "Recibe todas las llaves, el manual y los registros de mantención" },
    ],
  },
  {
    grupo: "Después",
    items: [
      { id: "seguro", texto: "Contrata un seguro a tu nombre", ayuda: "El SOAP sigue con el auto hasta que vence" },
      { id: "inscripcion", texto: "Revisa que el auto quede inscrito a tu nombre", ayuda: "Con el certificado de anotaciones, unas semanas después" },
      { id: "permiso", texto: "El permiso de circulación se renueva en marzo", ayuda: "En tu municipalidad, junto con el SOAP" },
    ],
  },
];

/** Paso a paso de la compra (Chile), con lo marcado guardado en el teléfono por auto. */
export function PapelesHoja({ abierta, onCerrar, autoId }: { abierta: boolean; onCerrar: () => void; autoId: string }) {
  const clave = `radar:papeles:${autoId}`;
  const [hechos, setHechos] = useState<string[]>([]);
  useEffect(() => {
    try {
      setHechos(JSON.parse(localStorage.getItem(clave) ?? "[]"));
    } catch {}
  }, [clave]);
  const alternar = (id: string) => {
    navigator.vibrate?.(5);
    setHechos((h) => {
      const n = h.includes(id) ? h.filter((x) => x !== id) : [...h, id];
      try {
        localStorage.setItem(clave, JSON.stringify(n));
      } catch {}
      return n;
    });
  };
  const total = PASOS.reduce((t, g) => t + g.items.length, 0);
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Papeles de la compra" derecha={<button type="button" onClick={onCerrar}>Listo</button>}>
      <div className="px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <p className="text-[14px] text-muted-foreground">
          {hechos.length} de {total} listos. Lo que marques queda guardado en este teléfono.
        </p>
        {PASOS.map((g) => (
          <section key={g.grupo} className="mt-6">
            <h3 className="titulo-grupo !ml-0">{g.grupo}</h3>
            <div className="flex flex-col divide-y divide-separador">
              {g.items.map((i) => {
                const hecho = hechos.includes(i.id);
                return (
                  <div key={i.id} className="flex gap-3 py-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={hecho}
                      aria-label={i.texto}
                      onClick={() => alternar(i.id)}
                      className={cn("presionable mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200", hecho ? "border-calza bg-calza text-white" : "border-border")}
                    >
                      {hecho && (
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12.5 10 17 19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={cn("text-[15px] leading-[21px] transition-colors", hecho && "text-tenue line-through")}>{i.texto}</p>
                      {i.ayuda && <p className="text-[13px] leading-[18px] text-tenue">{i.ayuda}</p>}
                      {i.url && (
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-foreground underline underline-offset-2">
                          Abrir el sitio
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Hoja>
  );
}
