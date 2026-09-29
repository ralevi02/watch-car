"use client";

import { useState } from "react";
import { guardarAjuste } from "@/app/(app)/acciones-auto";
import { Segmentado } from "@/components/ui/segmentado";
import { useAlmacen } from "@/lib/almacen";
import { buscarLugar } from "@/lib/comunas";

const HORAS = Array.from({ length: 16 }, (_, i) => i + 8);

/** Cómo llegan los avisos: uno por auto al tiro, o un resumen al día (y al tiro solo las bajas fuertes). */
export function AjustesAvisos() {
  const { datos, cambiar } = useAlmacen();
  const avisos = datos?.ajustes?.avisos ?? { modo: "inmediato" as const, hora: 20 };
  const guardar = (nuevo: typeof avisos) => {
    cambiar((d) => ({ ...d, ajustes: { ...d.ajustes, avisos: nuevo } }));
    void guardarAjuste({ clave: "avisos", valor: nuevo });
  };
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Segmentado
        etiqueta="Cuándo avisar"
        valor={avisos.modo}
        onCambio={(modo) => guardar({ ...avisos, modo })}
        opciones={[
          { id: "inmediato", etiqueta: "Al tiro" },
          { id: "resumen", etiqueta: "Un resumen al día" },
        ]}
      />
      {avisos.modo === "resumen" && (
        <label className="flex h-12 items-center justify-between rounded-[14px] bg-card px-4 text-[16px]">
          <span>Hora del resumen</span>
          <select value={avisos.hora} onChange={(e) => guardar({ ...avisos, hora: Number(e.target.value) })} className="bg-transparent text-right text-muted-foreground outline-none">
            {HORAS.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="pie-grupo">
        {avisos.modo === "resumen" ? "Lo nuevo llega junto a esa hora. Una baja de precio de 5% o más avisa al tiro." : "Cada auto nuevo que calza y cada baja de precio avisan apenas se encuentran."}
      </p>
    </div>
  );
}

/** La comuna desde donde se calculan distancias (mapa, autos lejos y el ahorro de ir a buscarlos). */
export function TuComuna() {
  const { datos, cambiar } = useAlmacen();
  const actual = datos?.ajustes?.casa?.comuna ?? "";
  const [texto, setTexto] = useState<string | null>(null);
  const valor = texto ?? actual;
  const valido = !valor.trim() || Boolean(buscarLugar(valor, null));
  const guardar = () => {
    if (!valido || valor.trim() === actual) return;
    const comuna = valor.trim();
    cambiar((d) => ({ ...d, ajustes: { ...d.ajustes, casa: comuna ? { comuna } : null } }));
    void guardarAjuste({ clave: "casa", valor: { comuna } });
  };
  return (
    <section>
      <h2 className="titulo-grupo">Tu comuna</h2>
      <input
        value={valor}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="Ej: Ñuñoa"
        aria-label="Tu comuna"
        className="h-12 w-full rounded-[14px] bg-card px-4 text-[16px] outline-none placeholder:text-tenue"
      />
      <p className="pie-grupo">{valido ? "Para ver a cuánto está cada auto y si conviene ir a buscar uno a regiones." : "No encuentro esa comuna."}</p>
    </section>
  );
}
