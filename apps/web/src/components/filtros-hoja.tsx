"use client";

import { X } from "lucide-react";
import { Hoja } from "@/components/ui/hoja";
import { Interruptor } from "@/components/ui/interruptor";
import { type Afinar, cuantosFiltros, type Orden, ORDENES } from "@/lib/filtros";
import { miles, millones, NOMBRE_FUENTE } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const PRECIOS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 25, 30].map((m) => m * 1_000_000);
const ANIOS = Array.from({ length: 14 }, (_, i) => 2026 - i);
const KMS = [40, 60, 80, 100, 120, 140, 160, 200].map((k) => k * 1000);
const DISTANCIAS = [10, 25, 50, 100, 200, 500];

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={() => {
        navigator.vibrate?.(5);
        onClick();
      }}
      className={cn("presionable h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors duration-200", activo ? "bg-primary text-primary-foreground" : "bg-card text-suave")}
    >
      {children}
    </button>
  );
}

function Selector<T extends number>({ etiqueta, valor, opciones, texto, onCambio }: { etiqueta: string; valor?: T; opciones: T[]; texto: (v: T) => string; onCambio: (v?: T) => void }) {
  return (
    <label className="flex h-12 items-center justify-between rounded-[14px] bg-card px-4 text-[16px]">
      <span>{etiqueta}</span>
      <select value={valor ?? ""} onChange={(e) => onCambio(e.target.value ? (Number(e.target.value) as T) : undefined)} className="bg-transparent text-right text-muted-foreground outline-none">
        <option value="">Cualquiera</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {texto(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

const Grupo = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h3 className="titulo-grupo !ml-0">{titulo}</h3>
    {children}
  </section>
);

/** Ordenar y filtrar Resultados. Se aplica al tiro y queda guardado en el teléfono. */
export function FiltrosHoja({
  abierta,
  onCerrar,
  orden,
  onOrden,
  filtros,
  onFiltros,
  fuentes,
  hayCasa,
  cuantos,
}: {
  abierta: boolean;
  onCerrar: () => void;
  orden: Orden;
  onOrden: (o: Orden) => void;
  filtros: Afinar;
  onFiltros: (f: Afinar) => void;
  fuentes: string[];
  hayCasa: boolean;
  /** Cuántos autos quedan con estos filtros. */
  cuantos: number;
}) {
  const poner = (c: Partial<Afinar>) => onFiltros({ ...filtros, ...c });
  const alternar = <K extends keyof Afinar>(k: K, v: Afinar[K]) => poner({ [k]: filtros[k] === v ? undefined : v } as Partial<Afinar>);
  const n = cuantosFiltros(filtros);
  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Filtros y orden"
      izquierda={
        n > 0 || orden !== "recomendado" ? (
          <button
            type="button"
            onClick={() => {
              onFiltros({});
              onOrden("recomendado");
            }}
          >
            Limpiar
          </button>
        ) : undefined
      }
      derecha={<button type="button" onClick={onCerrar}>Listo</button>}
      pie={
        <div className="border-t border-separador bg-hoja px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={onCerrar} className="presionable h-[50px] w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground">
            Ver {cuantos} {cuantos === 1 ? "auto" : "autos"}
          </button>
        </div>
      }
    >
      <div className="px-5 pb-6">
        <Grupo titulo="Ordenar por">
          <div className="flex flex-wrap gap-2">
            {ORDENES.filter((o) => o.id !== "cerca" || hayCasa).map((o) => (
              <Chip key={o.id} activo={orden === o.id} onClick={() => onOrden(o.id)}>
                {o.etiqueta}
              </Chip>
            ))}
          </div>
          {!hayCasa && <p className="pie-grupo !mx-0">Para ordenar por cercanía, pon tu comuna en Fuentes, Ajustes.</p>}
        </Grupo>

        <Grupo titulo="Precio">
          <div className="grid grid-cols-2 gap-2">
            <Selector etiqueta="Desde" valor={filtros.precioMin} opciones={PRECIOS} texto={millones} onCambio={(v) => poner({ precioMin: v })} />
            <Selector etiqueta="Hasta" valor={filtros.precioMax} opciones={PRECIOS} texto={millones} onCambio={(v) => poner({ precioMax: v })} />
          </div>
        </Grupo>

        <Grupo titulo="Año y km">
          <div className="flex flex-col gap-2">
            <Selector etiqueta="Año desde" valor={filtros.anioMin} opciones={ANIOS} texto={String} onCambio={(v) => poner({ anioMin: v })} />
            <Selector etiqueta="Km hasta" valor={filtros.kmMax} opciones={KMS} texto={(k) => `${miles(k)} km`} onCambio={(v) => poner({ kmMax: v })} />
          </div>
        </Grupo>

        <Grupo titulo="Caja y tracción">
          <div className="flex flex-wrap gap-2">
            <Chip activo={filtros.caja === "automatica"} onClick={() => alternar("caja", "automatica")}>
              Automática
            </Chip>
            <Chip activo={filtros.caja === "manual"} onClick={() => alternar("caja", "manual")}>
              Manual
            </Chip>
            <Chip activo={filtros.traccion === "AWD"} onClick={() => alternar("traccion", "AWD")}>
              AWD
            </Chip>
          </div>
        </Grupo>

        <Grupo titulo="Vende">
          <div className="flex flex-wrap gap-2">
            <Chip activo={filtros.vendedor === "particular"} onClick={() => alternar("vendedor", "particular")}>
              Particular
            </Chip>
            <Chip activo={filtros.vendedor === "automotora"} onClick={() => alternar("vendedor", "automotora")}>
              Automotora
            </Chip>
          </div>
        </Grupo>

        {fuentes.length > 1 && (
          <Grupo titulo="Portales">
            <div className="flex flex-wrap gap-2">
              {fuentes.map((f) => {
                const activo = filtros.fuentes?.includes(f) ?? false;
                return (
                  <Chip key={f} activo={activo} onClick={() => poner({ fuentes: activo ? filtros.fuentes!.filter((x) => x !== f) : [...(filtros.fuentes ?? []), f] })}>
                    {NOMBRE_FUENTE[f] ?? f}
                  </Chip>
                );
              })}
            </div>
          </Grupo>
        )}

        {hayCasa && (
          <Grupo titulo="Distancia desde tu casa">
            <Selector etiqueta="Hasta" valor={filtros.distanciaMax} opciones={DISTANCIAS} texto={(d) => `${d} km`} onCambio={(v) => poner({ distanciaMax: v })} />
          </Grupo>
        )}

        <Grupo titulo="Otros">
          <div className="lista-ios">
            <div className="fila-ios justify-between">
              <span>Solo con foto</span>
              <Interruptor activo={Boolean(filtros.conFoto)} etiqueta="Solo con foto" onCambio={(v) => poner({ conFoto: v || undefined })} />
            </div>
            <div className="fila-ios justify-between">
              <span>Sin alertas ni remates</span>
              <Interruptor activo={Boolean(filtros.sinAlertas)} etiqueta="Sin alertas ni remates" onCambio={(v) => poner({ sinAlertas: v || undefined })} />
            </div>
          </div>
        </Grupo>
      </div>
    </Hoja>
  );
}

/** Los filtros puestos, como etiquetas que se quitan con un toque. */
export function FiltrosActivos({ filtros, orden, onFiltros, onOrden }: { filtros: Afinar; orden: Orden; onFiltros: (f: Afinar) => void; onOrden: (o: Orden) => void }) {
  const quitar = (c: Partial<Afinar>) => onFiltros({ ...filtros, ...c });
  const chips: { id: string; texto: string; quitar: () => void }[] = [
    ...(orden !== "recomendado" ? [{ id: "orden", texto: ORDENES.find((o) => o.id === orden)?.etiqueta ?? "", quitar: () => onOrden("recomendado") }] : []),
    ...(filtros.precioMin ? [{ id: "pmin", texto: `Desde ${millones(filtros.precioMin)}`, quitar: () => quitar({ precioMin: undefined }) }] : []),
    ...(filtros.precioMax ? [{ id: "pmax", texto: `Hasta ${millones(filtros.precioMax)}`, quitar: () => quitar({ precioMax: undefined }) }] : []),
    ...(filtros.anioMin ? [{ id: "anio", texto: `${filtros.anioMin} o más nuevo`, quitar: () => quitar({ anioMin: undefined }) }] : []),
    ...(filtros.kmMax ? [{ id: "km", texto: `Hasta ${miles(filtros.kmMax)} km`, quitar: () => quitar({ kmMax: undefined }) }] : []),
    ...(filtros.caja ? [{ id: "caja", texto: filtros.caja === "automatica" ? "Automática" : "Manual", quitar: () => quitar({ caja: undefined }) }] : []),
    ...(filtros.traccion ? [{ id: "awd", texto: "AWD", quitar: () => quitar({ traccion: undefined }) }] : []),
    ...(filtros.vendedor ? [{ id: "vende", texto: filtros.vendedor === "particular" ? "Particular" : "Automotora", quitar: () => quitar({ vendedor: undefined }) }] : []),
    ...(filtros.fuentes?.length ? [{ id: "fuentes", texto: filtros.fuentes.map((f) => NOMBRE_FUENTE[f] ?? f).join(", "), quitar: () => quitar({ fuentes: undefined }) }] : []),
    ...(filtros.distanciaMax ? [{ id: "dist", texto: `A menos de ${filtros.distanciaMax} km`, quitar: () => quitar({ distanciaMax: undefined }) }] : []),
    ...(filtros.conFoto ? [{ id: "foto", texto: "Con foto", quitar: () => quitar({ conFoto: undefined }) }] : []),
    ...(filtros.sinAlertas ? [{ id: "alertas", texto: "Sin alertas", quitar: () => quitar({ sinAlertas: undefined }) }] : []),
  ];
  if (!chips.length) return null;
  return (
    <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
      {chips.map((c) => (
        <button key={c.id} type="button" onClick={c.quitar} className="presionable flex h-8 shrink-0 animate-in items-center gap-1 rounded-full bg-card pl-3 pr-2 text-[13px] font-medium fade-in duration-150">
          {c.texto}
          <X className="size-3.5 text-tenue" strokeWidth={2.2} aria-label="Quitar" />
        </button>
      ))}
    </div>
  );
}
