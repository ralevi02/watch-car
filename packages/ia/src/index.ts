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

export function geminiConRespaldo(principal: string, respaldo: string) {
  const modeloRespaldo = google(respaldo);
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        return await doGenerate();
      } catch (e) {
        if (!esCuotaOSaturado(e)) throw e;
        return modeloRespaldo.doGenerate(params);
      }
    },
    wrapStream: async ({ doStream, params }) => {
      try {
        return await doStream();
      } catch (e) {
        if (!esCuotaOSaturado(e)) throw e;
        return modeloRespaldo.doStream(params);
      }
    },
  };
  return wrapLanguageModel({ model: google(principal), middleware });
}

/** Chat que arma la ficha: poco volumen, mejor modelo. */
export const modeloChat = () =>
  geminiConRespaldo(process.env.GEMINI_MODELO || "gemini-flash-latest", process.env.GEMINI_MODELO_RESPALDO || "gemini-flash-lite-latest");

/** Normalización de avisos: más volumen, modelo liviano. */
export const modeloNormalizacion = () =>
  geminiConRespaldo(process.env.GEMINI_MODELO_NORMALIZAR || "gemini-flash-lite-latest", process.env.GEMINI_MODELO || "gemini-flash-latest");

/** Dictado por voz cuando el navegador no trae el suyo: audio corto, conviene el más rápido. */
export const modeloTranscripcion = () =>
  geminiConRespaldo(process.env.GEMINI_MODELO_TRANSCRIBIR || "gemini-flash-lite-latest", process.env.GEMINI_MODELO || "gemini-flash-latest");
