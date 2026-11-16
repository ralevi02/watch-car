"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAlmacen } from "@/lib/almacen";

const cuando = (iso: string) => {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias < 1) return `las ${d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
  return `el ${d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric" })}`;
};

/** Lo que tiene a una fuente sin buscar, arriba de Resultados, hasta que se arregle. */
export function AvisoFuentes() {
  const { datos } = useAlmacen();
  if (!datos) return null;
  // Contra la hora en que se leyeron los datos: así no cambia entre el servidor y el teléfono.
  const ahora = datos.leidoEn;

  const latido = datos.ajustes?.latidoCasa;
  const casaCaida = latido && ahora - new Date(latido).getTime() > 30 * 60_000;
  const fb = datos.facebook;
  const fbDesconectado = fb?.activa && fb.cuentas.length > 0 && !fb.cuentas.some((c) => c.estado === "activa");
  const ultimaFb = fb?.cuentas.map((c) => c.ultima_ok).filter((x): x is string => Boolean(x)).sort().at(-1);

  const avisos = [
    casaCaida && { texto: `El homelab no responde desde ${cuando(latido)}: Facebook, Kavak, Yapo y MercadoLibre no buscan hasta que vuelva.`, href: "/fuentes" },
    !casaCaida && fbDesconectado && { texto: `Facebook está desconectado${ultimaFb ? ` desde ${cuando(ultimaFb)}` : ""}. Reconéctalo para que vuelva a buscar.`, href: "/fuentes" },
  ].filter((x): x is { texto: string; href: string } => Boolean(x));
  if (!avisos.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {avisos.map((a) => (
        <Link key={a.texto} href={a.href} className="presionable flex items-center gap-2 rounded-xl border border-advertencia-borde bg-advertencia-fondo px-3.5 py-2.5 text-[14px] leading-[19px] text-advertencia">
          <span className="min-w-0 flex-1">{a.texto}</span>
          <ChevronRight className="size-4 shrink-0" strokeWidth={2} />
        </Link>
      ))}
    </div>
  );
}
