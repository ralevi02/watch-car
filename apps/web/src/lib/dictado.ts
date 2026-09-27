"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoDictado = "inactivo" | "escuchando" | "transcribiendo";
export type ModoDictado = "voz" | "grabacion";

const MAX_SEGUNDOS = 60;
const BARRAS = 28;
const PERMISO = "Activa el permiso del micrófono para Radar en el navegador.";

// Lo mínimo de la Web Speech API (TypeScript no la trae completa).
interface ResultadoVoz {
  readonly 0: { readonly transcript: string };
}
interface EventoVoz {
  readonly results: { readonly length: number; readonly [i: number]: ResultadoVoz };
}
interface ReconocedorVoz {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoVoz) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type ConstructorVoz = new () => ReconocedorVoz;

function constructorVoz(): ConstructorVoz | null {
  const w = window as unknown as { SpeechRecognition?: ConstructorVoz; webkitSpeechRecognition?: ConstructorVoz };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const unir = (...partes: string[]) => partes.map((p) => p.trim()).filter(Boolean).join(" ");

/** Junta los resultados de una sesión. Chrome en Android a veces repite lo anterior dentro del resultado siguiente. */
function textoDe(results: EventoVoz["results"]) {
  const partes: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const t = results[i]![0].transcript.trim();
    if (!t) continue;
    const previo = partes.at(-1);
    if (previo && t.toLowerCase().startsWith(previo.toLowerCase())) partes[partes.length - 1] = t;
    else partes.push(t);
  }
  return partes.join(" ");
}

/**
 * Dictado para el chat. Usa el reconocimiento de voz del navegador (en vivo,
 * gratis; Chrome en Android lo trae) y, si no hay o no funciona, graba el audio
 * y lo transcribe Gemini en /api/transcribir.
 *
 * `alCambiar` recibe el texto dictado hasta ahora (sin lo que ya había escrito);
 * `alTerminar`, el texto final.
 */
export function useDictado({ alCambiar, alTerminar }: { alCambiar: (texto: string) => void; alTerminar: (texto: string) => void }) {
  const [estado, setEstado] = useState<EstadoDictado>("inactivo");
  const [modo, setModo] = useState<ModoDictado | null>(null);
  const [niveles, setNiveles] = useState<number[]>(() => Array(BARRAS).fill(0));
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [disponible, setDisponible] = useState(false);

  const avisar = useRef({ alCambiar, alTerminar });
  avisar.current = { alCambiar, alTerminar };
  const soloGrabar = useRef(false);
  const detenerActual = useRef<(() => void) | null>(null);
  const cancelarActual = useRef<(() => void) | null>(null);

  useEffect(() => {
    setDisponible(Boolean(constructorVoz() || ("mediaDevices" in navigator && typeof MediaRecorder !== "undefined")));
  }, []);

  const terminar = useCallback((texto: string | null, mensaje?: string) => {
    detenerActual.current = null;
    cancelarActual.current = null;
    setEstado("inactivo");
    setModo(null);
    if (mensaje) setError(mensaje);
    if (texto !== null) avisar.current.alTerminar(texto);
  }, []);

  const grabar = useCallback(async () => {
    // Mientras el teléfono pregunta por el permiso ya se muestra la grabación, y se puede soltar.
    let cancelado = false;
    setModo("grabacion");
    setNiveles(Array(BARRAS).fill(0));
    setSegundos(0);
    detenerActual.current = cancelarActual.current = () => {
      cancelado = true;
      terminar(null);
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (e) {
      if (!cancelado) terminar(null, (e as DOMException)?.name === "NotAllowedError" ? PERMISO : "No encontré un micrófono.");
      return;
    }
    if (cancelado) return stream.getTracks().forEach((t) => t.stop());
    const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { ...(tipo ? { mimeType: tipo } : {}), audioBitsPerSecond: 32_000 });
    const partes: Blob[] = [];

    // Nivel del micrófono para dibujar la onda.
    const ctx = new AudioContext();
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analizador);
    const muestras = new Uint8Array(analizador.fftSize);
    const inicio = Date.now();
    const reloj = setInterval(() => {
      analizador.getByteTimeDomainData(muestras);
      let suma = 0;
      for (const m of muestras) suma += ((m - 128) / 128) ** 2;
      const nivel = Math.min(1, Math.sqrt(suma / muestras.length) * 4);
      setNiveles((n) => [...n.slice(1), nivel]);
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(s);
      if (s >= MAX_SEGUNDOS && rec.state === "recording") rec.stop();
    }, 90);

    rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    rec.onstop = async () => {
      clearInterval(reloj);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
      if (cancelado) return terminar(null);
      setEstado("transcribiendo");
      try {
        const audio = new Blob(partes, { type: rec.mimeType || "audio/webm" });
        const r = await fetch("/api/transcribir", { method: "POST", headers: { "Content-Type": audio.type }, body: audio });
        const datos = (await r.json().catch(() => ({}))) as { texto?: string; error?: string };
        if (!r.ok) return terminar(null, `No pude transcribir: ${datos.error ?? `error ${r.status}`}. Intenta de nuevo o escríbelo.`);
        if (!datos.texto) return terminar(null, "No se escuchó nada. Intenta de nuevo, más cerca del teléfono.");
        terminar(datos.texto);
      } catch {
        terminar(null, "No pude transcribir: sin conexión. Intenta de nuevo o escríbelo.");
      }
    };

    detenerActual.current = () => rec.state === "recording" && rec.stop();
    cancelarActual.current = () => {
      cancelado = true;
      if (rec.state === "recording") rec.stop();
    };
    rec.start(250);
  }, [terminar]);

  const escuchar = useCallback(
    (Voz: ConstructorVoz) => {
      let activo = true;
      let acumulado = "";
      let sesion = "";
      let actual: ReconocedorVoz | null = null;
      const inicio = Date.now();

      // Chrome corta la sesión tras una pausa: se abre otra mientras siga activo.
      const abrir = () => {
        const r = new Voz();
        actual = r;
        r.lang = "es-CL";
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (e) => {
          sesion = textoDe(e.results);
          avisar.current.alCambiar(unir(acumulado, sesion));
        };
        r.onerror = (e) => {
          if (e.error === "no-speech" || e.error === "aborted") return;
          activo = false;
          cerrado = true;
          r.onend = null;
          if (e.error === "not-allowed") return terminar(null, PERMISO);
          // El dictado del navegador no sirve aquí (ej. app instalada en iPhone): se graba y transcribe Gemini.
          if (!unir(acumulado, sesion) && typeof MediaRecorder !== "undefined") {
            soloGrabar.current = true;
            void grabar();
            return;
          }
          terminar(unir(acumulado, sesion));
        };
        r.onend = () => {
          acumulado = unir(acumulado, sesion);
          sesion = "";
          if (activo && Date.now() - inicio < MAX_SEGUNDOS * 1000) {
            try {
              return abrir();
            } catch {}
          }
          cerrar();
        };
        r.start();
      };

      let cerrado = false;
      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        const texto = unir(acumulado, sesion);
        if (texto) return terminar(texto);
        // Hay navegadores que dicen tener dictado pero no devuelven nada: la próxima vez se graba.
        soloGrabar.current = typeof MediaRecorder !== "undefined";
        terminar(null, soloGrabar.current ? "No escuché nada. Toca el micrófono otra vez y lo intento grabando el audio." : "No escuché nada. Intenta de nuevo.");
      };

      detenerActual.current = () => {
        activo = false;
        actual?.stop();
        // Si el navegador no avisa que terminó, se cierra igual con lo que alcanzó a entender.
        setTimeout(() => {
          if (cerrado) return;
          if (actual) actual.onend = null;
          actual?.abort();
          cerrar();
        }, 1500);
      };
      cancelarActual.current = () => {
        activo = false;
        cerrado = true;
        if (actual) actual.onend = null;
        actual?.abort();
        avisar.current.alCambiar("");
        terminar(null);
      };
      setModo("voz");
      abrir();
    },
    [grabar, terminar],
  );

  const iniciar = useCallback(() => {
    if (estado !== "inactivo") return;
    setError(null);
    setEstado("escuchando");
    navigator.vibrate?.(10);
    const Voz = soloGrabar.current ? null : constructorVoz();
    if (Voz) {
      try {
        return escuchar(Voz);
      } catch {
        soloGrabar.current = true;
      }
    }
    void grabar();
  }, [escuchar, estado, grabar]);

  const detener = useCallback(() => {
    navigator.vibrate?.(8);
    detenerActual.current?.();
  }, []);
  const cancelar = useCallback(() => cancelarActual.current?.(), []);

  // Si se cierra la hoja mientras escucha, soltar el micrófono.
  useEffect(() => () => cancelarActual.current?.(), []);

  return { estado, modo, niveles, segundos, error, disponible, iniciar, detener, cancelar, limpiarError: () => setError(null) };
}
