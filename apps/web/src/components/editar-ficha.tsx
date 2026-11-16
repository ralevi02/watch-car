"use client";

import { Fuente, NOMBRES_REGIONES, preferenciasDe, Seguimiento } from "@radar/core";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { actualizarFicha } from "@/app/(app)/acciones-auto";
import { Segmentado } from "@/components/ui/segmentado";
import { useAlmacen } from "@/lib/almacen";
import { NOMBRE_FUENTE } from "@/lib/presentar";
import { cn } from "@/lib/utils";

const lista = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const numero = (s: string, factor = 1) => {
  const limpio = s.replace(/\s/g, "");
  const n = Number(limpio.includes(",") ? limpio.replace(/\./g, "").replace(",", ".") : limpio);
  return limpio && Number.isFinite(n) ? Math.round(n * factor) : undefined;
};
const texto = (n: number | undefined, factor = 1) => (n === undefined ? "" : String(n / factor).replace(".", ","));

function Campo({ etiqueta, valor, onCambio, ayuda, numerico }: { etiqueta: string; valor: string; onCambio: (v: string) => void; ayuda?: string; numerico?: boolean }) {
  return (
    <label className="fila-ios justify-between gap-4">
      <span className="shrink-0">{etiqueta}</span>
      <input
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={ayuda}
        inputMode={numerico ? "decimal" : undefined}
        className="min-w-0 flex-1 bg-transparent text-right text-[16px] text-muted-foreground outline-none placeholder:text-tenue"
      />
    </label>
  );
}

function Chips<T extends string>({ opciones, elegidas, onCambio, nombre }: { opciones: readonly T[]; elegidas: T[]; onCambio: (v: T[]) => void; nombre: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activa = elegidas.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={activa}
            onClick={() => {
              navigator.vibrate?.(5);
              onCambio(activa ? elegidas.filter((x) => x !== o) : [...elegidas, o]);
            }}
            className={cn("presionable h-9 rounded-full px-3.5 text-[14px] font-medium transition-colors duration-200", activa ? "bg-primary text-primary-foreground" : "bg-card text-suave")}
          >
            {nombre(o)}
          </button>
        );
      })}
    </div>
  );
}

const Grupo = ({ titulo, pie, children }: { titulo: string; pie?: string; children: React.ReactNode }) => (
  <section>
    <h3 className="titulo-grupo">{titulo}</h3>
    {children}
    {pie && <p className="pie-grupo">{pie}</p>}
  </section>
);

/** Editar a mano una ficha ya hecha. Al guardar se vuelve a comparar con todo lo guardado. */
export function EditarFicha({ id, ficha, onListo }: { id: string; ficha: Seguimiento; onListo: () => void }) {
  const { cambiar, refrescar } = useAlmacen();
  const [f, setF] = useState(() => ({
    nombre: ficha.nombre,
    marca: ficha.marca,
    modelo: ficha.modelo,
    modeloPortal: ficha.modeloPortal ?? "",
    alias: ficha.alias.join(", "),
    anioMin: texto(ficha.anio.min),
    anioMax: texto(ficha.anio.max),
    precioMin: texto(ficha.precio.min, 1_000_000),
    precioMax: texto(ficha.precio.max, 1_000_000),
    precioAviso: texto(ficha.precio.maxConAdvertencia, 1_000_000),
    kmMax: texto(ficha.km.max, 1000),
    kmAviso: texto(ficha.km.maxConAdvertencia, 1000),
    caja: ficha.caja,
    traccion: ficha.traccion,
    excluidos: ficha.motoresExcluidos.join(", "),
    incluidos: ficha.motoresIncluidos.join(", "),
    regiones: ficha.regiones,
    fuentes: ficha.fuentes,
    preferencias: (ficha.preferencias ?? []).join(", "),
    notas: ficha.notas ?? "",
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poner = (c: Partial<typeof f>) => setF((x) => ({ ...x, ...c }));
  const deNotas = preferenciasDe({ notas: f.notas });

  async function guardar() {
    setError(null);
    const nueva = Seguimiento.safeParse({
      ...ficha,
      nombre: f.nombre.trim(),
      marca: f.marca.trim(),
      modelo: f.modelo.trim(),
      modeloPortal: f.modeloPortal.trim() || undefined,
      alias: lista(f.alias),
      anio: { min: numero(f.anioMin), max: numero(f.anioMax) },
      precio: { min: numero(f.precioMin, 1_000_000), max: numero(f.precioMax, 1_000_000), maxConAdvertencia: numero(f.precioAviso, 1_000_000) },
      km: { max: numero(f.kmMax, 1000), maxConAdvertencia: numero(f.kmAviso, 1000) },
      caja: f.caja,
      traccion: f.traccion,
      motoresExcluidos: lista(f.excluidos),
      motoresIncluidos: lista(f.incluidos),
      regiones: f.regiones,
      fuentes: f.fuentes,
      preferencias: lista(f.preferencias),
      notas: f.notas.trim() || undefined,
    });
    if (!nueva.success) {
      const problema = nueva.error.issues[0];
      return setError(
        problema?.message.includes("min no puede")
          ? `Revisa ${{ anio: "el año", precio: "el precio", km: "los km" }[String(problema.path[0])] ?? "los rangos"}: el mínimo queda sobre el máximo.`
          : problema?.message.includes("maxConAdvertencia")
            ? "El tope «con aviso» tiene que ser igual o mayor que el tope."
            : "Falta la marca, el modelo o el nombre.",
      );
    }
    setGuardando(true);
    const r = await actualizarFicha(id, nueva.data);
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    cambiar((d) => ({ ...d, busquedas: d.busquedas.map((b) => (b.id === id ? { ...b, nombre: nueva.data.nombre, ficha: nueva.data } : b)) }));
    void refrescar();
    onListo();
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Grupo titulo="Auto">
        <div className="lista-ios">
          <Campo etiqueta="Nombre" valor={f.nombre} onCambio={(v) => poner({ nombre: v })} />
          <Campo etiqueta="Marca" valor={f.marca} onCambio={(v) => poner({ marca: v })} />
          <Campo etiqueta="Modelo" valor={f.modelo} onCambio={(v) => poner({ modelo: v })} />
          <Campo etiqueta="En los portales" valor={f.modeloPortal} onCambio={(v) => poner({ modeloPortal: v })} ayuda="Igual al modelo" />
          <Campo etiqueta="También como" valor={f.alias} onCambio={(v) => poner({ alias: v })} ayuda="V40 CC, V40 Cross" />
        </div>
      </Grupo>

      <Grupo titulo="Año">
        <div className="lista-ios">
          <Campo etiqueta="Desde" valor={f.anioMin} onCambio={(v) => poner({ anioMin: v })} numerico ayuda="Cualquiera" />
          <Campo etiqueta="Hasta" valor={f.anioMax} onCambio={(v) => poner({ anioMax: v })} numerico ayuda="Cualquiera" />
        </div>
      </Grupo>

      <Grupo titulo="Precio, en millones" pie="Lo que pasa el tope y queda bajo «con aviso» aparece para revisar.">
        <div className="lista-ios">
          <Campo etiqueta="Desde" valor={f.precioMin} onCambio={(v) => poner({ precioMin: v })} numerico ayuda="Sin mínimo" />
          <Campo etiqueta="Tope" valor={f.precioMax} onCambio={(v) => poner({ precioMax: v })} numerico ayuda="Sin tope" />
          <Campo etiqueta="Con aviso hasta" valor={f.precioAviso} onCambio={(v) => poner({ precioAviso: v })} numerico ayuda="Igual al tope" />
        </div>
      </Grupo>

      <Grupo titulo="Kilometraje, en miles">
        <div className="lista-ios">
          <Campo etiqueta="Tope" valor={f.kmMax} onCambio={(v) => poner({ kmMax: v })} numerico ayuda="Sin tope" />
          <Campo etiqueta="Con aviso hasta" valor={f.kmAviso} onCambio={(v) => poner({ kmAviso: v })} numerico ayuda="Igual al tope" />
        </div>
      </Grupo>

      <Grupo titulo="Caja y tracción">
        <div className="flex flex-col gap-2">
          <Segmentado etiqueta="Caja" valor={f.caja} onCambio={(v) => poner({ caja: v })} opciones={[{ id: "cualquiera", etiqueta: "Cualquiera" }, { id: "automatica", etiqueta: "Automática" }, { id: "manual", etiqueta: "Manual" }]} />
          <Segmentado etiqueta="Tracción" valor={f.traccion} onCambio={(v) => poner({ traccion: v })} opciones={[{ id: "cualquiera", etiqueta: "Cualquiera" }, { id: "AWD", etiqueta: "AWD" }, { id: "FWD", etiqueta: "FWD" }]} />
        </div>
      </Grupo>

      <Grupo titulo="Motor">
        <div className="lista-ios">
          <Campo etiqueta="Sin" valor={f.excluidos} onCambio={(v) => poner({ excluidos: v })} ayuda="D2" />
          <Campo etiqueta="Solo" valor={f.incluidos} onCambio={(v) => poner({ incluidos: v })} ayuda="Cualquiera" />
        </div>
      </Grupo>

      <Grupo titulo="Zona" pie={f.regiones.length ? "Lo de otras regiones aparece igual, con aviso." : "Sin ninguna elegida, busca en todo Chile."}>
        <Chips opciones={NOMBRES_REGIONES} elegidas={f.regiones} onCambio={(v) => poner({ regiones: v })} nombre={(r) => r} />
      </Grupo>

      <Grupo titulo="Portales">
        <Chips opciones={Fuente.options} elegidas={f.fuentes} onCambio={(v) => poner({ fuentes: v })} nombre={(x) => NOMBRE_FUENTE[x] ?? x} />
      </Grupo>

      <Grupo titulo="Lo que prefieres" pie="Versiones o detalles que suben en Resultados, sin dejar fuera a nadie. Separa con comas.">
        <div className="lista-ios">
          <Campo etiqueta="Prefiero" valor={f.preferencias} onCambio={(v) => poner({ preferencias: v })} ayuda={deNotas.length ? deNotas.join(", ") : "Inscription, 2.0i"} />
        </div>
      </Grupo>

      <Grupo titulo="Notas">
        <div className="lista-ios">
          <textarea value={f.notas} onChange={(e) => poner({ notas: e.target.value })} rows={3} className="w-full resize-none bg-transparent px-4 py-3 text-[16px] outline-none" />
        </div>
      </Grupo>

      {error && <p className="px-1 text-[14px] text-destructive">{error}</p>}
      <button type="button" onClick={guardar} disabled={guardando} className="presionable flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-60">
        {guardando && <LoaderCircle className="size-4 animate-spin" />} Guardar cambios
      </button>
    </div>
  );
}
