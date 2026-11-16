"use client";

import { useEffect, useRef, useState } from "react";
import type { SemanaMercado } from "@/lib/mercado-ficha";

type Mercado = { semanas: SemanaMercado[]; diasVenta: number | null; vendidosTotal: number };

const ANCHO = 320;
const ALTO = 128;
const MARGEN = { izq: 4, der: 40, arriba: 10, abajo: 22 };

const millones = (n: number) => `${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M`;
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");

/** Precio típico de lo que calza con la ficha, semana a semana, y cuánto tardan en venderse. */
export function MercadoFicha({ busquedaId }: { busquedaId: string }) {
  const [m, setM] = useState<Mercado | null>(null);
  const [error, setError] = useState(false);
  const [elegida, setElegida] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(`/api/mercado?busqueda=${busquedaId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setM)
      .catch(() => setError(true));
  }, [busquedaId]);

  if (error) return null;
  if (!m) return <div className="lista-ios h-[214px] animate-pulse" aria-busy="true" aria-label="Cargando el mercado" />;

  const puntos = m.semanas.map((s, i) => ({ ...s, i })).filter((s) => s.mediana !== null) as (SemanaMercado & { i: number; mediana: number })[];
  if (puntos.length < 2)
    return (
      <div className="lista-ios">
        <p className="px-4 py-3 text-[15px] text-muted-foreground">Todavía hay pocas semanas de datos para ver cómo se mueve el precio.</p>
      </div>
    );

  const valores = puntos.map((p) => p.mediana);
  const paso = 500_000;
  const min = Math.floor(Math.min(...valores) / paso) * paso;
  const max = Math.max(Math.ceil(Math.max(...valores) / paso) * paso, min + paso);
  const x = (i: number) => MARGEN.izq + (i / Math.max(1, m.semanas.length - 1)) * (ANCHO - MARGEN.izq - MARGEN.der);
  const y = (v: number) => MARGEN.arriba + (1 - (v - min) / (max - min)) * (ALTO - MARGEN.arriba - MARGEN.abajo);
  const linea = puntos.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.mediana).toFixed(1)}`).join(" ");
  const marcas = [min, (min + max) / 2, max];

  const ultima = puntos.at(-1)!;
  const haceUnMes = puntos.find((p) => p.i >= ultima.i - 4) ?? puntos[0]!;
  const cambio = haceUnMes !== ultima ? (ultima.mediana - haceUnMes.mediana) / haceUnMes.mediana : 0;
  const vista = elegida !== null ? (puntos.find((p) => p.i === elegida) ?? ultima) : ultima;

  const elegir = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const xs = ((e.clientX - r.left) / r.width) * ANCHO;
    const cerca = puntos.reduce((a, b) => (Math.abs(x(b.i) - xs) < Math.abs(x(a.i) - xs) ? b : a));
    if (cerca.i !== elegida) navigator.vibrate?.(3);
    setElegida(cerca.i);
  };

  return (
    <>
    <div className="lista-ios">
      <div className="flex flex-col gap-0.5 px-4 pb-1 pt-3">
        <span className="text-[13px] text-muted-foreground">{elegida !== null ? `Semana del ${fecha(vista.desde)}` : "Precio típico hoy"}</span>
        <span className="text-[22px] font-semibold tabular-nums leading-7">{millones(vista.mediana)}</span>
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {elegida !== null
            ? `${vista.aLaVenta} a la venta${vista.vendidos ? `, ${vista.vendidos} ${vista.vendidos === 1 ? "dejó" : "dejaron"} de aparecer` : ""}`
            : Math.abs(cambio) < 0.01
              ? "Estable en el último mes"
              : `${cambio < 0 ? "Bajó" : "Subió"} ${Math.round(Math.abs(cambio) * 100)}% en el último mes`}
        </span>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="block w-full touch-none select-none"
        role="img"
        aria-label={`Precio típico semana a semana: de ${millones(puntos[0]!.mediana)} a ${millones(ultima.mediana)}`}
        onPointerDown={elegir}
        onPointerMove={(e) => (e.pointerType !== "mouse" || e.buttons || elegida !== null) && elegir(e)}
        onPointerLeave={() => setElegida(null)}
        onPointerUp={(e) => e.pointerType !== "mouse" && setTimeout(() => setElegida(null), 1800)}
      >
        {marcas.map((v) => (
          <g key={v}>
            <line x1={MARGEN.izq} x2={ANCHO - MARGEN.der} y1={y(v)} y2={y(v)} className="stroke-separador" strokeWidth={1} />
            <text x={ANCHO - MARGEN.der + 6} y={y(v) + 4} className="fill-tenue text-[11px] tabular-nums">
              {millones(v)}
            </text>
          </g>
        ))}
        <path d={linea} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {elegida !== null && (
          <>
            <line x1={x(vista.i)} x2={x(vista.i)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="stroke-tenue" strokeWidth={1} />
            <circle cx={x(vista.i)} cy={y(vista.mediana)} r={4.5} className="fill-foreground stroke-card" strokeWidth={2} />
          </>
        )}
        <text x={x(puntos[0]!.i)} y={ALTO - 6} className="fill-tenue text-[11px]">
          {fecha(puntos[0]!.desde)}
        </text>
        <text x={x(ultima.i)} y={ALTO - 6} textAnchor="end" className="fill-tenue text-[11px]">
          {fecha(ultima.desde)}
        </text>
      </svg>
      <div className="fila-ios justify-between text-[15px]">
        <span>Se venden en</span>
        <span className="text-muted-foreground">{m.diasVenta ? `unos ${m.diasVenta} ${m.diasVenta === 1 ? "día" : "días"}` : "sin datos aún"}</span>
      </div>
    </div>
      <table className="sr-only">
        <caption>Precio típico por semana</caption>
        <thead>
          <tr>
            <th>Semana</th>
            <th>Precio típico</th>
            <th>A la venta</th>
            <th>Dejaron de aparecer</th>
          </tr>
        </thead>
        <tbody>
          {puntos.map((p) => (
            <tr key={p.desde}>
              <td>{fecha(p.desde)}</td>
              <td>{millones(p.mediana)}</td>
              <td>{p.aLaVenta}</td>
              <td>{p.vendidos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
