import type { GoogleLanguageModelOptions } from "@ai-sdk/google";
import { modeloTranscripcion } from "@radar/ia";
import { generateText } from "ai";
import { esDueno } from "@/lib/datos";

export const maxDuration = 30;

const TIPOS = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg", "audio/aac"];
const MAX_BYTES = 4 * 1024 * 1024;

const INSTRUCCIONES =
  "Transcribe literalmente este audio en español de Chile. Es alguien contando qué auto usado quiere buscar. " +
  "Escribe marcas y modelos como se escriben (Volvo V40 Cross Country, XC60, Mazda CX-5, Toyota RAV4, D4, T5, AWD), " +
  "los años con cifras y los montos y kilómetros como los dice (ej. «14 millones», «120 mil km»). " +
  "Devuelve solo el texto, sin comillas ni comentarios. Si no se entiende nada, devuelve un texto vacío.";

/**
 * Corre la tarea y, si no contesta en `esperaMs`, lanza otra igual y gana la
 * primera que llegue. La capa gratis de Gemini a veces tarda 40 s en algo que
 * normalmente toma 1 o 2.
 */
function conRelevo<T>(tarea: (senal: AbortSignal) => Promise<T>, esperaMs: number, limiteMs: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const controles: AbortController[] = [];
    let pendientes = 0;
    let listo = false;
    const cerrar = () => {
      listo = true;
      clearTimeout(limite);
      clearTimeout(relevo);
      controles.forEach((c) => c.abort());
    };
    const lanzar = () => {
      const control = new AbortController();
      controles.push(control);
      pendientes++;
      tarea(control.signal).then(
        (valor) => {
          if (listo) return;
          cerrar();
          resolver(valor);
        },
        (error) => {
          pendientes--;
          if (listo) return;
          if (controles.length === 1) {
            // Falló rápido: se reintenta de inmediato en vez de esperar el relevo.
            clearTimeout(relevo);
            lanzar();
          } else if (pendientes === 0) {
            cerrar();
            rechazar(error);
          }
        },
      );
    };
    const limite = setTimeout(() => {
      if (listo) return;
      cerrar();
      rechazar(new Error("Gemini no respondió a tiempo."));
    }, limiteMs);
    const relevo = setTimeout(() => !listo && controles.length === 1 && lanzar(), esperaMs);
    lanzar();
  });
}

export async function POST(req: Request) {
  if (!(await esDueno())) return Response.json({ error: "Esta cuenta no tiene acceso a Radar." }, { status: 403 });
  const tipo = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!TIPOS.includes(tipo)) return Response.json({ error: `Formato de audio no soportado (${tipo || "sin tipo"}).` }, { status: 415 });
  const audio = new Uint8Array(await req.arrayBuffer());
  if (!audio.byteLength) return Response.json({ error: "Llegó un audio vacío." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES) return Response.json({ error: "El audio es muy largo." }, { status: 413 });

  try {
    const texto = await conRelevo(
      async (abortSignal) => {
        const { text } = await generateText({
          model: modeloTranscripcion(),
          maxRetries: 0,
          abortSignal,
          providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions },
          messages: [{ role: "user", content: [{ type: "text", text: INSTRUCCIONES }, { type: "file", data: audio, mediaType: tipo }] }],
        });
        return text.trim();
      },
      4000,
      25_000,
    );
    return Response.json({ texto });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
