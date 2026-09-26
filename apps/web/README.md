# apps/web

La app en Next.js: chat para crear seguimientos (hoy), y después resultados y fuentes. Instalable como PWA y publicada en Vercel.

## Correrla

1. Pega tu API key de Gemini en `GOOGLE_GENERATIVE_AI_API_KEY`, en el `.env` de la **raíz** del repo (se crea copiando `.env.example`).
2. Desde la raíz: `pnpm dev` y abre http://localhost:3000.

Si cambias el `.env`, reinicia el servidor. `GEMINI_MODELO` es opcional (por defecto `gemini-flash-latest`).

## Qué hay

| Archivo | Qué hace |
| --- | --- |
| `src/app/page.tsx` | Pantalla Seguimientos: chat que arma la ficha |
| `src/app/api/chat/route.ts` | Llama a Gemini con la herramienta `crear_seguimiento` |
| `src/lib/chat.ts` | La herramienta (valida con el esquema `Seguimiento` de `@radar/core`) y las instrucciones del asistente |
| `src/components/ficha-card.tsx` | Tarjeta que muestra la ficha |

Todavía no guarda nada: falta conectar Supabase.
