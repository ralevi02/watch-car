"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { crearEnlace } from "@/app/(app)/acciones-auto";
import { useAlmacen } from "@/lib/almacen";
import type { DetalleAuto, ResultadoAuto } from "@/lib/datos";
import { tituloAuto } from "@/lib/presentar";

const VOTO: Record<string, string> = { me_gusta: "Le gusta", no_me_convence: "No le convence", dudas: "Tiene dudas" };

/** Compartir el auto con alguien (pareja, mecánico) para que opine sin cuenta, y ver lo que dijeron. */
export function Opiniones({ r, detalle }: { r: ResultadoAuto; detalle?: DetalleAuto }) {
  const { cambiarDetalle } = useAlmacen();
  const [estado, setEstado] = useState<string | null>(null);

  const compartir = async () => {
    setEstado("Creando el link…");
    const res = await crearEnlace(r.autoId);
    if (!res.ok || !res.token) return setEstado(res.ok ? "No se pudo crear el link" : res.error);
    cambiarDetalle(r.autoId, (d) => ({ ...d, enlace: res.token! }));
    const url = `${location.origin}/v/${res.token}`;
    setEstado(null);
    if (navigator.share) await navigator.share({ title: tituloAuto(r), text: "¿Qué te parece este auto?", url }).catch(() => {});
    else {
      await navigator.clipboard?.writeText(url).catch(() => {});
      setEstado("Link copiado.");
    }
  };

  const opiniones = detalle?.opiniones ?? [];
  return (
    <section className="mt-7">
      <h2 className="titulo-grupo !ml-0">Opiniones</h2>
      {opiniones.length > 0 && (
        <div className="mb-3 flex flex-col divide-y divide-separador">
          {opiniones.map((o) => (
            <div key={o.creada_en} className="py-2.5">
              <p className="text-[15px]">
                <span className="font-semibold">{o.nombre}</span> <span className="text-muted-foreground">{VOTO[o.voto] ?? o.voto}</span>
              </p>
              {o.texto && <p className="mt-0.5 whitespace-pre-line text-[15px] text-suave">{o.texto}</p>}
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => void compartir()} className="presionable flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-card text-[15px] font-semibold">
        <Users className="size-[18px]" strokeWidth={1.8} /> {detalle?.enlace ? "Compartir de nuevo para que opinen" : "Compartir para que opinen"}
      </button>
      <p className="mt-1.5 text-[13px] text-tenue">{estado ?? "Quien reciba el link ve el auto y puede opinar sin cuenta. No ve tus notas."}</p>
    </section>
  );
}
