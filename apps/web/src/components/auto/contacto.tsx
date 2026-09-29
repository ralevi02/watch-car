"use client";

import { CalendarPlus, ClipboardCheck, Copy, LoaderCircle, MessageCircle, Mic, Square } from "lucide-react";
import { useState } from "react";
import { agendarVisita, type Contacto } from "@/app/(app)/acciones-auto";
import { VisitaHoja } from "@/components/auto/visita";
import { Hoja } from "@/components/ui/hoja";
import { useAlmacen } from "@/lib/almacen";
import type { DetalleAuto, Llamada, ResultadoAuto } from "@/lib/datos";
import { useDictado } from "@/lib/dictado";
import { useMarcar } from "@/lib/marcar";
import { mensajeVendedor, telefonoDe } from "@/lib/mensaje";
import { NOMBRE_FUENTE, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";
import { checklist } from "@/lib/visita";

export const PASOS: { id: Contacto; etiqueta: string }[] = [
  { id: "por_contactar", etiqueta: "Por contactar" },
  { id: "escribi", etiqueta: "Escribí" },
  { id: "respondio", etiqueta: "Respondió" },
  { id: "visita", etiqueta: "Visita" },
  { id: "comprado", etiqueta: "Comprado" },
];

const CAMPO_LLAMADA: Record<string, string> = {
  duenos: "Dueños",
  mantenciones: "Mantenciones",
  correa: "Correa",
  km: "Km",
  precio: "Precio",
  choques: "Choques",
  papeles: "Papeles",
  disponible: "Disponible",
  otros: "Otros",
};

const fechaHora = (s: string) =>
  new Date(s).toLocaleString("es-CL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });

/** De "ver el aviso" a "comprado": en qué va, qué escribirle, qué dijo y cuándo se va a ver. */
export function ContactoAuto({ r, detalle }: { r: ResultadoAuto; detalle?: DetalleAuto }) {
  const { contacto } = useMarcar();
  const actual = r.marca?.contacto ?? null;
  const [hoja, setHoja] = useState<"mensaje" | "agenda" | "visita" | null>(null);
  const visita = detalle?.visita ?? {};
  const revisados = Object.values(visita.items ?? {}).filter((x) => x.estado);
  const total = checklist(r).reduce((t, g) => t + g.items.length, 0);

  return (
    <section className="mt-7">
      <h2 className="titulo-grupo !ml-0">Compra</h2>
      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="En qué va">
        {PASOS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={actual === p.id}
            onClick={() => contacto(r.autoId, actual === p.id ? null : p.id)}
            className={cn(
              "presionable h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors duration-200",
              actual === p.id ? "bg-primary text-primary-foreground" : "bg-card text-suave",
            )}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Boton icono={MessageCircle} onClick={() => setHoja("mensaje")}>
          Escribirle
        </Boton>
        <NotaDeVoz r={r} />
        <Boton icono={CalendarPlus} onClick={() => setHoja("agenda")}>
          {r.marca?.visitaEn ? fechaHora(r.marca.visitaEn) : "Agendar visita"}
        </Boton>
        <Boton icono={ClipboardCheck} onClick={() => setHoja("visita")}>
          {revisados.length ? `Visita ${revisados.length}/${total}` : "Revisar en la visita"}
        </Boton>
      </div>

      {(detalle?.llamadas.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {detalle!.llamadas
            .slice()
            .reverse()
            .map((l) => (
              <LlamadaGuardada key={l.fecha} l={l} />
            ))}
        </div>
      )}

      <MensajeHoja abierta={hoja === "mensaje"} onCerrar={() => setHoja(null)} r={r} detalle={detalle} />
      <AgendaHoja abierta={hoja === "agenda"} onCerrar={() => setHoja(null)} r={r} />
      <VisitaHoja abierta={hoja === "visita"} onCerrar={() => setHoja(null)} r={r} visita={visita} />
    </section>
  );
}

function Boton({ icono: Icono, children, onClick, activo }: { icono: typeof Mic; children: React.ReactNode; onClick: () => void; activo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("presionable flex h-12 items-center gap-2 rounded-xl px-3.5 text-left text-[14px] font-medium", activo ? "bg-primary text-primary-foreground" : "bg-card")}
    >
      <Icono className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span className="truncate">{children}</span>
    </button>
  );
}

function LlamadaGuardada({ l }: { l: Llamada }) {
  const filas = Object.entries(l.datos);
  return (
    <div className="rounded-[14px] bg-card px-4 py-3">
      <p className="text-[12px] text-tenue">Lo que dijo el vendedor, {fechaHora(l.fecha)}</p>
      <p className="mt-1 text-[15px] leading-[21px]">{l.texto}</p>
      {filas.length > 0 && (
        <dl className="mt-2 flex flex-col gap-1 text-[14px]">
          {filas.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-[92px] shrink-0 text-muted-foreground">{CAMPO_LLAMADA[k] ?? k}</dt>
              <dd className="min-w-0">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Después de hablar con el vendedor: le cuentas a la app y la IA ordena lo que dijo. */
function NotaDeVoz({ r }: { r: ResultadoAuto }) {
  const { cambiarDetalle } = useAlmacen();
  const { tocar } = useMarcar();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (texto: string) => {
    if (!texto.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/llamada", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoId: r.autoId, texto }) });
      const j = (await res.json()) as { llamada?: Llamada; contacto?: Contacto; error?: string };
      if (!res.ok || !j.llamada) throw new Error(j.error ?? "No se pudo guardar");
      cambiarDetalle(r.autoId, (d) => ({ ...d, llamadas: [...d.llamadas, j.llamada!] }));
      if (j.contacto) tocar(r.autoId, (m) => ({ ...m, contacto: j.contacto }));
      navigator.vibrate?.(8);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };
  const dictado = useDictado({ alCambiar: () => {}, alTerminar: (t) => void guardar(t) });
  const escuchando = dictado.estado === "escuchando";
  const ocupado = guardando || dictado.estado === "transcribiendo";

  return (
    <>
      <Boton icono={ocupado ? LoaderCircle : escuchando ? Square : Mic} activo={escuchando} onClick={() => (escuchando ? dictado.detener() : !ocupado && dictado.iniciar())}>
        {ocupado ? "Ordenando…" : escuchando ? `Terminar${dictado.segundos ? ` (${dictado.segundos} s)` : ""}` : "Contar la llamada"}
      </Boton>
      {(error || dictado.error) && <p className="col-span-2 text-[13px] text-destructive">{error ?? dictado.error}</p>}
    </>
  );
}

function MensajeHoja({ abierta, onCerrar, r, detalle }: { abierta: boolean; onCerrar: () => void; r: ResultadoAuto; detalle?: DetalleAuto }) {
  const { contacto } = useMarcar();
  const [texto, setTexto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const propuesto = mensajeVendedor(r, detalle?.descripcion ?? null, detalle?.llamadas);
  const mensaje = texto ?? propuesto;
  const principal = r.enlaces.find((e) => e.id === r.avisoPrincipal) ?? r.enlaces[0];
  const telefono = telefonoDe(detalle?.descripcion ?? null);

  const marcarEscribi = () => {
    if (!r.marca?.contacto || r.marca.contacto === "por_contactar") contacto(r.autoId, "escribi");
  };
  const copiar = async () => {
    await navigator.clipboard?.writeText(mensaje).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
    marcarEscribi();
  };

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Mensaje al vendedor" derecha={<button type="button" onClick={onCerrar}>Listo</button>}>
      <div className="flex flex-col gap-3 px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <p className="text-[14px] text-muted-foreground">Pregunta solo lo que el aviso no dice. Puedes cambiarlo antes de mandarlo.</p>
        <textarea
          value={mensaje}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          aria-label="Mensaje"
          className="resize-none rounded-[14px] bg-card px-4 py-3 text-[16px] leading-[23px] outline-none"
        />
        <button type="button" onClick={copiar} className="presionable flex h-[50px] items-center justify-center gap-2 rounded-full bg-card text-[15px] font-semibold">
          <Copy className="size-[18px]" strokeWidth={2} /> {copiado ? "Copiado" : "Copiar"}
        </button>
        <a
          href={`https://wa.me/${telefono ?? ""}?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={marcarEscribi}
          className="presionable flex h-[50px] items-center justify-center rounded-full bg-card text-[15px] font-semibold"
        >
          {telefono ? "Mandar por WhatsApp" : "Mandar por WhatsApp (elegir contacto)"}
        </a>
        {principal && (
          <a
            href={principal.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void copiar()}
            className="presionable flex h-[50px] items-center justify-center rounded-full bg-primary text-[15px] font-bold text-primary-foreground"
          >
            Copiar y abrir {NOMBRE_FUENTE[principal.fuente] ?? principal.fuente}
          </a>
        )}
      </div>
    </Hoja>
  );
}

/** Fecha y hora de la visita: se guarda y se abre Google Calendar con el evento listo. */
function AgendaHoja({ abierta, onCerrar, r }: { abierta: boolean; onCerrar: () => void; r: ResultadoAuto }) {
  const { tocar } = useMarcar();
  const inicial = r.marca?.visitaEn ? aLocal(new Date(r.marca.visitaEn)) : aLocal(manana());
  const [cuando, setCuando] = useState(inicial);
  const principal = r.enlaces.find((e) => e.id === r.avisoPrincipal) ?? r.enlaces[0];

  const guardar = () => {
    const fecha = new Date(cuando);
    if (Number.isNaN(fecha.getTime())) return;
    tocar(r.autoId, (m) => ({ ...m, visitaEn: fecha.toISOString(), contacto: "visita" }));
    void agendarVisita(r.autoId, fecha.toISOString());
    const fin = new Date(fecha.getTime() + 60 * 60_000);
    const g = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `Ver ${[r.marcaAuto, tituloAuto(r), r.anio].filter(Boolean).join(" ")}`);
    url.searchParams.set("dates", `${g(fecha)}/${g(fin)}`);
    url.searchParams.set("details", [principal?.url, "Llevar: la lista de la visita en Radar (motor en frío, papeles, prueba de manejo)."].filter(Boolean).join("\n"));
    if (r.comuna) url.searchParams.set("location", `${r.comuna}, Chile`);
    window.open(url.toString(), "_blank", "noopener");
    onCerrar();
  };
  const quitar = () => {
    tocar(r.autoId, (m) => ({ ...m, visitaEn: null }));
    void agendarVisita(r.autoId, null);
    onCerrar();
  };

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Agendar visita" izquierda={<button type="button" onClick={onCerrar}>Cancelar</button>}>
      <div className="flex flex-col gap-3 px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <input
          type="datetime-local"
          value={cuando}
          onChange={(e) => setCuando(e.target.value)}
          aria-label="Fecha y hora"
          className="h-12 rounded-xl bg-card px-4 text-[16px] outline-none"
        />
        <p className="text-[14px] text-muted-foreground">Pídele al vendedor que no lo encienda antes de que llegues: así ves cómo parte en frío.</p>
        <button type="button" onClick={guardar} className="presionable h-[50px] rounded-full bg-primary text-[15px] font-bold text-primary-foreground">
          Guardar y abrir el calendario
        </button>
        {r.marca?.visitaEn && (
          <button type="button" onClick={quitar} className="presionable h-11 text-[15px] font-medium text-destructive">
            Quitar la visita
          </button>
        )}
      </div>
    </Hoja>
  );
}

const manana = () => {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(11, 0, 0, 0);
  return d;
};
/** Date → "2026-09-30T11:00" en hora local, para el input datetime-local. */
const aLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
