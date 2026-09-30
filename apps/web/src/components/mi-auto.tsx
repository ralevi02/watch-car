"use client";

import { Car, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { guardarAjuste } from "@/app/(app)/acciones-auto";
import { Hoja } from "@/components/ui/hoja";
import { useAlmacen } from "@/lib/almacen";
import { mantenciones, mesRevision, NOMBRE_MES, textoParaVender } from "@/lib/mi-auto";
import { miles, millones, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";

/**
 * Mi auto: aparece cuando marcas un auto como "Comprado". Qué mantención toca,
 * cuándo la revisión técnica y el permiso, cuánto vale hoy y el texto para venderlo.
 */
export function MiAuto() {
  const { datos, cambiar } = useAlmacen();
  const [abierta, setAbierta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const r = [...(datos?.resultados ?? []), ...(datos?.casi ?? [])].find((x) => x.marca?.contacto === "comprado");
  const guardado = datos?.ajustes?.miAuto ?? {};
  const [texto, setTexto] = useState<string | null>(null);
  if (!r) return null;

  const km = guardado.kmActual ?? r.km ?? 0;
  const patente = guardado.patente ?? r.patente ?? "";
  const mes = mesRevision(patente);
  const hoy = new Date();
  const valorHoy = r.justo?.precio ?? null;
  const lista = mantenciones(r, km);
  const vender = texto ?? textoParaVender(r, km, valorHoy);

  const guardar = (c: Partial<typeof guardado>) => {
    const nuevo = { ...guardado, ...c };
    cambiar((d) => ({ ...d, ajustes: { ...d.ajustes, miAuto: nuevo } }));
    void guardarAjuste({ clave: "mi_auto", valor: nuevo });
  };
  const proximaFecha = (m: number) => {
    const anio = hoy.getMonth() + 1 > m ? hoy.getFullYear() + 1 : hoy.getFullYear();
    return `${NOMBRE_MES[m]} ${anio}`;
  };

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className="presionable flex w-full items-center gap-3 rounded-[16px] bg-card p-3 text-left">
        <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-secondary">{r.foto ? <img src={r.foto} alt="" className="size-full object-cover" /> : <Car className="m-auto mt-4 size-6 text-tenue" />}</span>
        <span className="min-w-0 flex-grow">
          <span className="block text-[13px] text-tenue">Mi auto</span>
          <span className="block truncate text-[16px] font-semibold">{[r.marcaAuto, tituloAuto(r), r.anio].filter(Boolean).join(" ")}</span>
          <span className="block truncate text-[13px] text-suave">
            Próximo: {lista[0]?.nombre.toLowerCase()} a los {lista[0]?.proximoKm ? miles(lista[0].proximoKm) : "?"} km
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-tenue" strokeWidth={2} />
      </button>

      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Mi auto" derecha={<button type="button" onClick={() => setAbierta(false)}>Listo</button>}>
        <div className="px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <h2 className="text-[22px] font-bold leading-[27px]">{[r.marcaAuto, tituloAuto(r), r.anio].filter(Boolean).join(" ")}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[12.5px] text-tenue">
              Km de hoy
              <input
                inputMode="numeric"
                defaultValue={km ? miles(km) : ""}
                onBlur={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ""));
                  if (n && n !== guardado.kmActual) guardar({ kmActual: n });
                }}
                className="h-11 rounded-xl bg-card px-3 text-[16px] text-foreground outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-tenue">
              Patente
              <input
                defaultValue={patente}
                onBlur={(e) => {
                  const p = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  if (p !== (guardado.patente ?? "")) guardar({ patente: p });
                }}
                className="h-11 rounded-xl bg-card px-3 text-[16px] uppercase tracking-[1px] text-foreground outline-none"
              />
            </label>
          </div>

          <section className="mt-6">
            <h3 className="titulo-grupo !ml-0">Mantenciones</h3>
            <div className="flex flex-col divide-y divide-separador">
              {lista.map((m) => (
                <div key={m.nombre} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px]">{m.nombre}</span>
                    <span className={cn("shrink-0 text-[14px] tabular-nums", m.faltan !== null && m.faltan < 3000 ? "font-semibold text-advertencia" : "text-muted-foreground")}>
                      {m.faltan !== null && m.faltan <= 0 ? "Ya toca" : m.proximoKm ? `a los ${miles(m.proximoKm)} km` : ""}
                    </span>
                  </div>
                  <p className="text-[13px] leading-[18px] text-tenue">
                    {m.cada.charAt(0).toUpperCase() + m.cada.slice(1)}
                    {m.nota ? `. ${m.nota}` : ""}
                  </p>
                </div>
              ))}
            </div>
            <p className="pie-grupo !mx-0">Sin el historial del auto, se cuenta desde cero en cada intervalo: ajústalo con los registros de mantención.</p>
          </section>

          <section className="mt-6">
            <h3 className="titulo-grupo !ml-0">Fechas</h3>
            <dl className="flex flex-col divide-y divide-separador text-[15px]">
              <div className="flex justify-between gap-3 py-2.5">
                <dt>Revisión técnica</dt>
                <dd className="text-muted-foreground">{mes ? proximaFecha(mes) : "Pon la patente"}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt>Permiso de circulación y SOAP</dt>
                <dd className="text-muted-foreground">{proximaFecha(3)}</dd>
              </div>
            </dl>
            <p className="pie-grupo !mx-0">La revisión técnica va según el último dígito de la patente (calendario del MTT para autos particulares).</p>
          </section>

          <section className="mt-6">
            <h3 className="titulo-grupo !ml-0">Si lo vendes</h3>
            <p className="text-[15px]">
              {valorHoy ? (
                <>
                  Hoy vale unos <span className="font-semibold">{millones(valorHoy)}</span>, según {r.justo!.n} avisos parecidos.
                </>
              ) : (
                "Todavía no hay suficientes avisos parecidos para estimar cuánto vale."
              )}
            </p>
            <textarea value={vender} onChange={(e) => setTexto(e.target.value)} rows={6} aria-label="Texto para publicarlo" className="mt-3 w-full resize-none rounded-[14px] bg-card px-4 py-3 text-[15px] leading-[22px] outline-none" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(vender).catch(() => {});
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1500);
              }}
              className="presionable mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold text-primary-foreground"
            >
              <Copy className="size-[18px]" strokeWidth={2} /> {copiado ? "Copiado" : "Copiar el texto para publicarlo"}
            </button>
          </section>
        </div>
      </Hoja>
    </>
  );
}
