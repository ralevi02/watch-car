"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarCuentaFacebook, cambiarCuentaFacebook, configurarFacebook, crearCuentaFacebook, pedirReconexion } from "@/app/(app)/acciones";
import { Hoja } from "@/components/ui/hoja";
import { Interruptor } from "@/components/ui/interruptor";
import { cn } from "@/lib/utils";

interface Cuenta {
  id: string;
  nombre: string;
  estado: string;
  sesion_guardada_en: string | null;
  ultima_ok: string | null;
  ultimo_error: string | null;
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  activa: { texto: "Conectada", clase: "text-calza" },
  sin_sesion: { texto: "Falta iniciar sesión", clase: "text-muted-foreground" },
  necesita_reconexion: { texto: "Hay que reconectar", clase: "text-advertencia" },
  bloqueada: { texto: "Bloqueada por Facebook", clase: "text-destructive" },
  pausada: { texto: "En pausa", clase: "text-muted-foreground" },
};

const fecha = (s: string) => new Date(s).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function CuentasFacebook({ activa, rotacion, pasadasPorDia, cuentas }: { activa: boolean; rotacion: boolean; pasadasPorDia: number; cuentas: Cuenta[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actual = cuentas.find((c) => c.id === abierta);

  const reconectar = (id: string) =>
    iniciar(async () => {
      setError(null);
      const r = await pedirReconexion(id);
      if (r.ok && r.id) router.push(`/fuentes/reconectar/${r.id}`);
      else if (!r.ok) setError(r.error);
    });

  return (
    <section>
      <h2 className="titulo-grupo">Facebook Marketplace</h2>
      <div className="lista-ios">
        <label className="fila-ios justify-between">
          <span>Buscar en Facebook</span>
          <Interruptor activo={activa} etiqueta="Buscar en Facebook" onCambio={(v) => configurarFacebook({ activa: v })} />
        </label>
        {cuentas.map((c) => (
          <button key={c.id} type="button" onClick={() => setAbierta(c.id)} className="fila-ios w-full justify-between text-left active:bg-black/5">
            <span className="flex min-w-0 flex-col">
              <span>{c.nombre}</span>
              <span className={cn("text-[13px] leading-[18px]", ESTADO[c.estado]?.clase)}>
                {ESTADO[c.estado]?.texto ?? c.estado}
                {c.ultima_ok ? ` · última pasada ${fecha(c.ultima_ok)}` : ""}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-[#C4C4C6]" strokeWidth={2.4} />
          </button>
        ))}
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await crearCuentaFacebook(`Cuenta ${cuentas.length + 1}`);
              if (r.ok && r.id) setAbierta(r.id);
              else if (!r.ok) setError(r.error);
            })
          }
          className="fila-ios w-full text-primary active:bg-black/5"
        >
          <Plus className="size-5" strokeWidth={2.4} /> Agregar cuenta secundaria
        </button>
        <label className="fila-ios justify-between">
          <span>Rotar entre cuentas</span>
          <Interruptor activo={rotacion} etiqueta="Rotar entre cuentas" onCambio={(v) => configurarFacebook({ rotacion: v })} />
        </label>
        <label className="fila-ios justify-between">
          <span>Pasadas por día y cuenta</span>
          <select
            value={pasadasPorDia}
            onChange={(e) => iniciar(() => configurarFacebook({ pasadas_por_dia: Number(e.target.value) }))}
            className="bg-transparent text-right text-muted-foreground outline-none"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="pie-grupo">Solo cuentas secundarias, nunca la personal. Se guarda la sesión cifrada, nunca la contraseña. Corre a las 10:40, 15:40 y 20:40.</p>
      {error && <p className="pie-grupo text-destructive">{error}</p>}

      <Hoja abierta={Boolean(actual)} onCerrar={() => setAbierta(null)} titulo={actual?.nombre ?? ""} derecha={<button type="button" onClick={() => setAbierta(null)}>Listo</button>}>
        {actual && (
          <div className="flex flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="lista-ios">
              <div className="fila-ios justify-between"><span>Estado</span><span className={ESTADO[actual.estado]?.clase}>{ESTADO[actual.estado]?.texto ?? actual.estado}</span></div>
              {actual.sesion_guardada_en && <div className="fila-ios justify-between"><span>Sesión guardada</span><span className="text-muted-foreground">{fecha(actual.sesion_guardada_en)}</span></div>}
              {actual.ultimo_error && <div className="fila-ios text-[15px] text-destructive">{actual.ultimo_error}</div>}
            </div>
            <div className="lista-ios">
              <button type="button" disabled={pendiente} onClick={() => reconectar(actual.id)} className="fila-ios w-full text-primary active:bg-black/5">
                {actual.estado === "sin_sesion" ? "Iniciar sesión" : "Reconectar"}
              </button>
              {(actual.estado === "activa" || actual.estado === "pausada") && (
                <button type="button" disabled={pendiente} onClick={() => iniciar(() => cambiarCuentaFacebook(actual.id, actual.estado === "activa" ? "pausada" : "activa"))} className="fila-ios w-full text-primary active:bg-black/5">
                  {actual.estado === "activa" ? "Pausar cuenta" : "Activar cuenta"}
                </button>
              )}
            </div>
            <div className="lista-ios">
              <button
                type="button"
                disabled={pendiente}
                onClick={() => {
                  if (confirm(`¿Borrar «${actual.nombre}» y su sesión guardada?`)) iniciar(async () => { await borrarCuentaFacebook(actual.id); setAbierta(null); });
                }}
                className="fila-ios w-full justify-center text-destructive active:bg-black/5"
              >
                Borrar cuenta
              </button>
            </div>
            <p className="pie-grupo -mt-4">Al iniciar sesión se abre un navegador seguro en la nube, con la misma IP del buscador.</p>
          </div>
        )}
      </Hoja>
    </section>
  );
}
