"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ResultadoAuto } from "@/lib/datos";
import { millones, pesos } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const r50 = (x: number) => Math.round(x / 50_000) * 50_000;
const diasDesde = (s: string) => Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000));

/** Qué dice el precio: en el rango normal, bajo o sobre (con cuánto). */
export function lecturaPrecio(r: ResultadoAuto): { texto: string; tono: "calza" | "advertencia" | "neutro" } | null {
  if (!r.justo || r.precio === null) return null;
  const d = r.precio - r.justo.precio;
  if (r.precio <= r.justo.bajo) return { texto: `${millones(-d)} bajo lo normal`, tono: "calza" };
  if (r.precio >= r.justo.alto) return { texto: `${millones(d)} sobre lo normal`, tono: "advertencia" };
  return { texto: "Precio normal", tono: "neutro" };
}

/**
 * ¿Es buen precio? Precio justo según los avisos guardados, días publicado,
 * oferta de partida, lo que cuesta de verdad la compra y la cuota con crédito.
 */
export function PrecioJusto({ r }: { r: ResultadoAuto }) {
  const [abierto, setAbierto] = useState<"costo" | "cuota" | null>(null);
  const precio = r.precio;
  const j = r.justo;
  const primera = r.enlaces.reduce((m, e) => (e.primeraVez < m ? e.primeraVez : m), r.primeraVez);
  const dias = diasDesde(primera);
  const lectura = lecturaPrecio(r);

  // Posición del precio en la barra (del bajo al alto del rango, con margen a los lados).
  const pos = j && precio !== null ? Math.min(100, Math.max(0, ((precio - (j.bajo - (j.alto - j.bajo) / 2)) / ((j.alto - j.bajo) * 2)) * 100)) : null;

  // Oferta de partida: más agresiva si lleva más tiempo que lo normal publicado.
  const lleva = r.diasVenta ? dias / r.diasVenta : null;
  const base = precio !== null ? Math.min(precio, j?.precio ?? precio) : null;
  const oferta = base ? r50(base * (lleva && lleva > 1.3 ? 0.9 : 0.94)) : null;
  const tope = precio !== null ? Math.min(precio, j ? j.alto : precio) : null;

  return (
    <section className="mt-7">
      <h2 className="titulo-grupo !ml-0">¿Es buen precio?</h2>
      {j && precio !== null ? (
        <>
          <p className="text-[15px] leading-[22px]">
            <span className={cn("font-semibold", lectura?.tono === "calza" && "text-calza", lectura?.tono === "advertencia" && "text-advertencia")}>{lectura?.texto}.</span>{" "}
            <span className="text-suave">
              Uno así suele estar entre {millones(j.bajo)} y {millones(j.alto)}, según {j.n} avisos {j.base === "familia" ? "del mismo modelo, con y sin Cross Country" : `de ${r.modelo}`}.
            </span>
          </p>
          <div className="relative mt-4 h-2 rounded-full bg-secondary" aria-hidden>
            <div className="absolute inset-y-0 left-1/4 right-1/4 rounded-full bg-calza/35" />
            {pos !== null && <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-hoja bg-foreground shadow" style={{ left: `${pos}%` }} />}
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] tabular-nums text-tenue">
            <span>Barato</span>
            <span>
              {millones(j.bajo)} a {millones(j.alto)}
            </span>
            <span>Caro</span>
          </div>
        </>
      ) : (
        <p className="text-[15px] text-muted-foreground">Todavía no hay suficientes avisos parecidos para decir si es buen precio.</p>
      )}

      <dl className="mt-4 flex flex-col divide-y divide-separador border-y border-separador text-[15px]">
        <div className="flex justify-between gap-4 py-2.5">
          <dt className="text-muted-foreground">Publicado hace</dt>
          <dd className="font-medium tabular-nums">
            {dias === 0 ? "hoy" : `${dias} ${dias === 1 ? "día" : "días"}`}
            {r.diasVenta ? <span className="font-normal text-tenue">, suelen venderse en {r.diasVenta}</span> : null}
          </dd>
        </div>
        {oferta && tope && precio !== null && (
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">Para negociar</dt>
            <dd className="text-right font-medium tabular-nums">
              parte en {pesos(oferta)}
              {tope > oferta && <span className="block text-[13px] font-normal text-tenue">hasta {pesos(r50(tope))} tiene sentido</span>}
            </dd>
          </div>
        )}
      </dl>
      {lleva && lleva > 1.3 && <p className="pie-grupo !mx-0">Lleva más tiempo publicado que lo normal: hay espacio para ofrecer menos.</p>}
      {lectura?.tono === "calza" && <p className="pie-grupo !mx-0">Ya está bajo lo normal: no esperes mucho descuento, y pregunta por qué lo vende a ese precio.</p>}

      {precio !== null && (
        <div className="mt-3 flex flex-col gap-2">
          <Desplegable titulo="Lo que cuesta de verdad" abierto={abierto === "costo"} onClick={() => setAbierto(abierto === "costo" ? null : "costo")}>
            <CostoReal r={r} precio={precio} />
          </Desplegable>
          <Desplegable titulo="Si lo pagas con crédito" abierto={abierto === "cuota"} onClick={() => setAbierto(abierto === "cuota" ? null : "cuota")}>
            <Cuota precio={precio} />
          </Desplegable>
        </div>
      )}
    </section>
  );
}

function Desplegable({ titulo, abierto, onClick, children }: { titulo: string; abierto: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-card">
      <button type="button" onClick={onClick} aria-expanded={abierto} className="flex h-12 w-full items-center justify-between px-4 text-left text-[15px] font-medium">
        {titulo}
        <ChevronDown className={cn("size-[18px] text-tenue transition-transform duration-200", abierto && "rotate-180")} strokeWidth={2} />
      </button>
      {abierto && <div className="animate-in px-4 pb-4 fade-in duration-150">{children}</div>}
    </div>
  );
}

/** Precio + transferencia + papeles + la mantención grande que puede venir (correa). */
function CostoReal({ r, precio }: { r: ResultadoAuto; precio: number }) {
  const impuesto = Math.round(precio * 0.015);
  const tramite = 80_000;
  const edad = r.anio ? new Date().getFullYear() - r.anio : 0;
  // La correa de distribución vence por km o por años: si el auto anda cerca, conviene contarla.
  const correa = (r.km ?? 0) >= 110_000 || edad >= 8 ? 600_000 : 0;
  const total = precio + impuesto + tramite + correa;
  const filas: [string, number, string?][] = [
    ["Precio", precio],
    ["Impuesto de transferencia (1,5%)", impuesto, "Sobre el precio o la tasación fiscal, el que sea mayor"],
    ["Notaría e inscripción", tramite, "Aproximado"],
    ...(correa ? ([["Correa de distribución", correa, "Si no hay registro de que se cambió: vence por km (según el manual) o por años, cerca de los 10"]] as [string, number, string][]) : []),
  ];
  return (
    <div className="flex flex-col gap-2 text-[14px]">
      {filas.map(([k, v, nota]) => (
        <div key={k}>
          <div className="flex justify-between gap-3">
            <span className="text-suave">{k}</span>
            <span className="tabular-nums">{pesos(v)}</span>
          </div>
          {nota && <p className="text-[12.5px] leading-[17px] text-tenue">{nota}</p>}
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-3 border-t border-separador pt-2 text-[15px] font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{pesos(total)}</span>
      </div>
      <p className="text-[12.5px] leading-[17px] text-tenue">El permiso de circulación se paga en marzo; si el vendedor ya lo pagó, pídeselo.</p>
    </div>
  );
}

/** Cuota mensual con pie, plazo y tasa (referencial, editable). */
function Cuota({ precio }: { precio: number }) {
  const [pie, setPie] = useState(30);
  const [meses, setMeses] = useState(36);
  const [tasa, setTasa] = useState(1.6);
  const credito = precio * (1 - pie / 100);
  const i = tasa / 100;
  const cuota = i > 0 ? (credito * i) / (1 - (1 + i) ** -meses) : credito / meses;
  const total = cuota * meses + precio * (pie / 100);
  const campo = (etiqueta: string, valor: number, set: (n: number) => void, opciones: number[], sufijo: string) => (
    <label className="flex flex-col gap-1 text-[12.5px] text-tenue">
      {etiqueta}
      <select value={valor} onChange={(e) => set(Number(e.target.value))} className="h-10 rounded-lg bg-secondary px-2 text-[15px] text-foreground outline-none">
        {opciones.map((o) => (
          <option key={o} value={o}>
            {String(o).replace(".", ",")}
            {sufijo}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {campo("Pie", pie, setPie, [0, 10, 20, 30, 40, 50], "%")}
        {campo("Plazo", meses, setMeses, [12, 24, 36, 48, 60], " meses")}
        {campo("Tasa mensual", tasa, setTasa, [1.2, 1.4, 1.6, 1.8, 2, 2.2], "%")}
      </div>
      <p className="text-[15px]">
        Cuota de <span className="font-semibold tabular-nums">{pesos(Math.round(cuota / 1000) * 1000)}</span> al mes. En total pagarías{" "}
        <span className="tabular-nums">{pesos(Math.round(total / 10_000) * 10_000)}</span>, {millones(total - precio)} más que al contado.
      </p>
      <p className="text-[12.5px] leading-[17px] text-tenue">La tasa es referencial: pide la tuya (y el CAE) al banco o a la automotora. Pie de {pesos(Math.round((precio * pie) / 100))}.</p>
    </div>
  );
}
