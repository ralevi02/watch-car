import type { GoogleLanguageModelOptions } from "@ai-sdk/google";
import { modeloChat } from "@radar/ia";
import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from "ai";
import { herramientas, INSTRUCCIONES, type MensajeChat } from "@/lib/chat";
import { esDueno } from "@/lib/datos";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response("Falta GOOGLE_GENERATIVE_AI_API_KEY en el .env de la raíz del repo (y reiniciar el servidor).", { status: 500 });
  }

  // Cualquiera puede crear una cuenta con su correo: solo el dueño gasta la cuota de Gemini.
  if (!(await esDueno())) return new Response("Esta cuenta no tiene acceso a Radar.", { status: 403 });

  const { messages }: { messages: MensajeChat[] } = await req.json();

  const result = streamText({
    model: modeloChat(),
    instructions: INSTRUCCIONES,
    messages: await convertToModelMessages(messages),
    tools: herramientas,
    stopWhen: isStepCount(3),
    // Armar una ficha no necesita razonar mucho; así responde bastante más rápido.
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions,
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools: herramientas,
      // App personal: mejor ver el error real de Gemini (clave inválida, cuota, etc.).
      onError: (e) => (e instanceof Error ? e.message : String(e)),
    }),
  });
}
