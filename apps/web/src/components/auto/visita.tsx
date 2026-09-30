"use client";

import { Camera, LoaderCircle, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { guardarVisita } from "@/app/(app)/acciones-auto";
import { Hoja } from "@/components/ui/hoja";
import { useAlmacen } from "@/lib/almacen";
import type { EstadoItem, ResultadoAuto, Visita } from "@/lib/datos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { checklist, type ItemVisita } from "@/lib/visita";

const ESTADOS: { id: EstadoItem; etiqueta: string; clase: string }[] = [
  { id: "bien", etiqueta: "Bien", clase: "bg-calza text-white" },
  { id: "ojo", etiqueta: "Ojo", clase: "bg-advertencia text-white" },
  { id: "mal", etiqueta: "Mal", clase: "bg-destructive text-white" },
];

/** Achica la foto antes de subirla: el teléfono saca fotos de varios MB. */
async function achicar(archivo: File, lado = 1600): Promise<Blob> {
  const img = await createImageBitmap(archivo);
  const f = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * f);
  c.height = Math.round(img.height * f);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo leer la foto"))), "image/jpeg", 0.82));
}

/**
 * Lo que hay que revisar al ir a ver el auto, según el modelo. Cada punto se
 * marca Bien, Ojo o Mal, con nota y fotos (privadas, en Supabase). Se guarda solo.
 */
export function VisitaHoja({ abierta, onCerrar, r, visita }: { abierta: boolean; onCerrar: () => void; r: ResultadoAuto; visita: Visita }) {
  const { cambiarDetalle } = useAlmacen();
  const [items, setItems] = useState(visita.items ?? {});
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grupos = checklist(r);
  const todos = grupos.flatMap((g) => g.items);
  const marcados = todos.filter((i) => items[i.id]?.estado);
  const conProblema = todos.filter((i) => items[i.id]?.estado === "mal" || items[i.id]?.estado === "ojo");

  useEffect(() => setItems(visita.items ?? {}), [visita.items]);

  const cambiar = (id: string, f: (x: NonNullable<Visita["items"]>[string]) => NonNullable<Visita["items"]>[string]) => {
    setItems((prev) => {
      const nuevo = { ...prev, [id]: f(prev[id] ?? {}) };
      cambiarDetalle(r.autoId, (d) => ({ ...d, visita: { items: nuevo } }));
      // Se guarda un rato después del último cambio, para no mandar cada tecla.
      if (pendiente.current) clearTimeout(pendiente.current);
      pendiente.current = setTimeout(() => void guardarVisita(r.autoId, { items: nuevo }), 700);
      return nuevo;
    });
  };

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Visita" derecha={<button type="button" onClick={onCerrar}>Listo</button>}>
      <div className="px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <p className="text-[14px] text-muted-foreground">
          {marcados.length ? `${marcados.length} de ${todos.length} revisados` : "Marca cada punto mientras ves el auto. Se guarda solo."}
          {conProblema.length > 0 && `, ${conProblema.length} para conversar con el vendedor`}
        </p>
        {conProblema.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-[5px]">
            {conProblema.map((i) => (
              <span key={i.id} className={cn("etiqueta", items[i.id]?.estado === "mal" && "!border-destructive/40 !text-destructive")}>
                {i.texto}
              </span>
            ))}
          </div>
        )}
        {grupos.map((g) => (
          <section key={g.titulo} className="mt-6">
            <h3 className="titulo-grupo !ml-0">{g.titulo}</h3>
            <div className="flex flex-col divide-y divide-separador">
              {g.items.map((i) => (
                <Punto key={i.id} autoId={r.autoId} item={i} valor={items[i.id] ?? {}} onCambio={(f) => cambiar(i.id, f)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Hoja>
  );
}

function Punto({
  autoId,
  item,
  valor,
  onCambio,
}: {
  autoId: string;
  item: ItemVisita;
  valor: NonNullable<Visita["items"]>[string];
  onCambio: (f: (x: NonNullable<Visita["items"]>[string]) => NonNullable<Visita["items"]>[string]) => void;
}) {
  const [nota, setNota] = useState(Boolean(valor.nota));
  const [subiendo, setSubiendo] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const entrada = useRef<HTMLInputElement>(null);
  // Grabar el sonido del motor al partir en frío (hasta 30 segundos).
  const [grabando, setGrabando] = useState(false);
  const grabador = useRef<MediaRecorder | null>(null);
  const grabar = async () => {
    if (grabando) return grabador.current?.stop();
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const g = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
      const partes: Blob[] = [];
      g.ondataavailable = (e) => e.data.size && partes.push(e.data);
      g.onstop = async () => {
        flujo.getTracks().forEach((t) => t.stop());
        setGrabando(false);
        const blob = new Blob(partes, { type: g.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const ruta = `${autoId}/${item.id}-audio-${Date.now()}.${ext}`;
        setSubiendo(true);
        const { error } = await crearClienteNavegador().storage.from("visitas").upload(ruta, blob, { contentType: blob.type });
        setSubiendo(false);
        if (!error) onCambio((x) => ({ ...x, audios: [...(x.audios ?? []), ruta] }));
      };
      grabador.current = g;
      g.start();
      setGrabando(true);
      navigator.vibrate?.(10);
      setTimeout(() => g.state === "recording" && g.stop(), 30_000);
    } catch {
      setGrabando(false);
    }
  };

  // Las fotos son privadas: se muestran con un link firmado de una hora.
  useEffect(() => {
    const faltan = [...(valor.fotos ?? []), ...(valor.audios ?? [])].filter((f) => !urls[f]);
    if (!faltan.length) return;
    const supabase = crearClienteNavegador();
    void supabase.storage
      .from("visitas")
      .createSignedUrls(faltan, 3600)
      .then(({ data }) => {
        const nuevas = (data ?? []).flatMap((x) => (x.path && x.signedUrl ? [[x.path, x.signedUrl] as const] : []));
        if (nuevas.length) setUrls((u) => ({ ...u, ...Object.fromEntries(nuevas) }));
      });
  }, [valor.fotos, valor.audios, urls]);

  const subir = async (archivo: File) => {
    setSubiendo(true);
    try {
      const blob = await achicar(archivo);
      const ruta = `${autoId}/${item.id}-${Date.now()}.jpg`;
      const { error } = await crearClienteNavegador().storage.from("visitas").upload(ruta, blob, { contentType: "image/jpeg" });
      if (!error) onCambio((x) => ({ ...x, fotos: [...(x.fotos ?? []), ruta] }));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="py-3">
      <p className="text-[15px] leading-[21px]">{item.texto}</p>
      {item.ayuda && <p className="text-[13px] leading-[18px] text-tenue">{item.ayuda}</p>}
      <div className="mt-2 flex items-center gap-1.5">
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={valor.estado === e.id}
            onClick={() => {
              navigator.vibrate?.(5);
              onCambio((x) => ({ ...x, estado: x.estado === e.id ? undefined : e.id }));
            }}
            className={cn("presionable h-9 min-w-[64px] rounded-full px-3 text-[14px] font-semibold transition-colors duration-200", valor.estado === e.id ? e.clase : "bg-card text-suave")}
          >
            {e.etiqueta}
          </button>
        ))}
        <button type="button" onClick={() => setNota((n) => !n)} className="presionable ml-auto h-9 rounded-full px-3 text-[14px] font-medium text-suave">
          Nota
        </button>
        {item.id === "partida" && (
          <button
            type="button"
            aria-label={grabando ? "Terminar de grabar" : "Grabar el motor"}
            onClick={() => void grabar()}
            className={cn("presionable flex size-9 items-center justify-center rounded-full", grabando ? "bg-destructive text-white" : "text-suave")}
          >
            {grabando ? <Square className="size-4" strokeWidth={2.2} /> : <Mic className="size-[18px]" strokeWidth={1.8} />}
          </button>
        )}
        <button type="button" aria-label="Agregar foto" onClick={() => entrada.current?.click()} className="presionable flex size-9 items-center justify-center rounded-full text-suave">
          {subiendo ? <LoaderCircle className="size-[18px] animate-spin" /> : <Camera className="size-[18px]" strokeWidth={1.8} />}
        </button>
        <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && void subir(e.target.files[0])} />
      </div>
      {nota && (
        <textarea
          value={valor.nota ?? ""}
          onChange={(e) => onCambio((x) => ({ ...x, nota: e.target.value }))}
          rows={2}
          placeholder="Qué viste"
          className="mt-2 block w-full resize-none rounded-xl bg-card px-3.5 py-2.5 text-[15px] outline-none placeholder:text-tenue"
        />
      )}
      {item.id === "partida" && grabando && <p className="mt-1.5 text-[13px] text-destructive">Grabando el motor… toca el cuadrado para terminar (máximo 30 segundos).</p>}
      {(valor.audios?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {valor.audios!.map((a) => (urls[a] ? <audio key={a} src={urls[a]} controls preload="none" className="h-9 w-full" /> : null))}
        </div>
      )}
      {(valor.fotos?.length ?? 0) > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {valor.fotos!.map((f) => (
            <a key={f} href={urls[f]} target="_blank" rel="noopener noreferrer" className="size-16 shrink-0 overflow-hidden rounded-lg bg-card">
              {urls[f] && <img src={urls[f]} alt="" className="size-full object-cover" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
