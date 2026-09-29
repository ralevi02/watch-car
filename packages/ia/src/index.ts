import { google } from "@ai-sdk/google";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";

/**
 * La capa gratis de Gemini tiene cuota diaria por modelo (20 consultas en
 * gemini-3.8-flash) y a veces responde "alta demanda". Si el modelo principal
 * contesta 429 o 503, se pasa al de respaldo sin que se note.
 */
const esCuotaOSaturado = (e: unknown) => {
  const status = (e as { statusCode?: number })?.statusCode;
  return status === 429 || status === 503;
};

/** Se llama con el modelo que respondió de verdad (el principal o el de respaldo), para llevar la cuenta de la cuota. */
export type AlUsar = (modelo: string) => void;

export function geminiConRespaldo(principal: string, respaldo: string, alUsar?: AlUsar) {
  const modeloRespaldo = google(respaldo);
  const usar = (m: string) => {
    try {
      alUsar?.(m);
    } catch {
      /* la cuenta nunca rompe la consulta */
    }
  };
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        const r = await doGenerate();
        usar(principal);
        return r;
      } catch (e) {
        if (!esCuotaOSaturado(e)) throw e;
        const r = await modeloRespaldo.doGenerate(params);
        usar(respaldo);
        return r;
      }
    },
    wrapStream: async ({ doStream, params }) => {
      try {
        const r = await doStream();
        usar(principal);
        return r;
      } catch (e) {
        if (!esCuotaOSaturado(e)) throw e;
        const r = await modeloRespaldo.doStream(params);
        usar(respaldo);
        return r;
      }
    },
  };
  return wrapLanguageModel({ model: google(principal), middleware });
}

const MODELO = () => process.env.GEMINI_MODELO || "gemini-flash-latest";
const LIVIANO = () => process.env.GEMINI_MODELO_RESPALDO || "gemini-flash-lite-latest";

/** Chat que arma la ficha: poco volumen, mejor modelo. */
export const modeloChat = (alUsar?: AlUsar) => geminiConRespaldo(MODELO(), LIVIANO(), alUsar);

/** Normalización de avisos: más volumen, modelo liviano. */
export const modeloNormalizacion = (alUsar?: AlUsar) => geminiConRespaldo(process.env.GEMINI_MODELO_NORMALIZAR || LIVIANO(), MODELO(), alUsar);

/** Dictado por voz cuando el navegador no trae el suyo: audio corto, conviene el más rápido. */
export const modeloTranscripcion = (alUsar?: AlUsar) => geminiConRespaldo(process.env.GEMINI_MODELO_TRANSCRIBIR || LIVIANO(), MODELO(), alUsar);

/** Tareas cortas (preguntas sobre un auto, sacar datos de una llamada, diagnósticos): el modelo bueno y, si no hay cuota, el liviano. */
export const modeloTareas = (alUsar?: AlUsar) => geminiConRespaldo(MODELO(), LIVIANO(), alUsar);

/** Cuota diaria de la capa gratis por modelo (consultas). */
export const CUOTA_DIARIA = 20;
