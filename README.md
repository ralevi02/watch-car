# Radar seminuevos

App personal para seguir autos usados en Chile: le dices en lenguaje natural qué auto quieres, arma una ficha y junta los avisos que calzan de Chileautos, Facebook Marketplace, Kavak, Yapo y MercadoLibre, con advertencias para los que se salen un poco de los filtros y avisos push cuando aparece algo nuevo o baja de precio.

Todo corre en la nube: la app en Vercel, la base en Supabase y los buscadores en GitHub Actions.

## Estructura

| Carpeta | Qué tiene |
| --- | --- |
| `apps/web` | App Next.js 16 (PWA): Seguimientos con chat, Resultados, Fuentes, reconexión de Facebook y agregar avisos por link |
| `apps/worker` | Buscadores (Patchright) y la pasada: guardar, normalizar con Gemini, deduplicar, evaluar y notificar |
| `packages/core` | Ficha (`Seguimiento`), `evaluar`, normalización, deduplicación, lectura de links |
| `packages/db` | Tipos de Supabase y cliente con clave secreta |
| `packages/ia` | Gemini con modelo de respaldo cuando se agota la cuota |
| `supabase/migrations` | Esquema, RLS, Vault y funciones |
| `.github/workflows` | Pasadas con cron, reconexión de Facebook y pruebas |

## Pasadas (GitHub Actions)

| Workflow | Cuándo | Qué necesita |
| --- | --- | --- |
| Chileautos · pasadas | Cada 3 h de 8:00 a 23:00 | `SUPABASE_SECRET_KEY` |
| Facebook · pasadas | 10:40, 15:40 y 20:40 | `SUPABASE_SECRET_KEY`, `PROXY_URL` y una cuenta secundaria conectada |
| Kavak, Yapo y MercadoLibre · pasadas | 12:10 y 19:10 | `SUPABASE_SECRET_KEY` (MercadoLibre además `ML_CLIENT_ID`, `ML_CLIENT_SECRET` y conectar la cuenta en la app) |
| Facebook · reconectar | Lo lanza la app | `SUPABASE_SECRET_KEY`, `PROXY_URL` |
| Prueba de un lector | A mano | Nada (no toca Supabase) |

Sin los secretos, los workflows solo avisan y no corren nada.

## Puesta en marcha

1. **Supabase** (proyecto `watch-car`):
   - Project Settings → API Keys → copiar la clave secreta a `SUPABASE_SECRET_KEY` en el `.env` y como GitHub Secret.
   - Authentication → URL Configuration: Site URL = URL de Vercel; Redirect URLs = `https://TU-APP.vercel.app/**` y `http://localhost:3000/**`.
   - Authentication → Email Templates → Magic Link: agregar `{{ .Token }}` al cuerpo, para poder entrar con el código desde la app instalada en iPhone.
2. **Vercel**: importar el repo con Root Directory `apps/web` y estas variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GITHUB_DISPATCH_TOKEN` (token fine-grained del repo con permiso Actions: read and write) y, si usas MercadoLibre, `ML_CLIENT_ID` y `ML_CLIENT_SECRET`. Después, en GitHub, la variable `APP_URL` con la URL de Vercel.
3. **Primer login**: entra a la app con tu correo y agrega tu usuario a la tabla `duenos` (la app te muestra el id).
4. **Notificaciones**: en Fuentes, «Activar notificaciones» (en iPhone, primero agrega la app a la pantalla de inicio).
5. **Facebook** (opcional): comprar un proxy residencial con IP fija y guardarlo como `PROXY_URL` (`http://usuario:clave@host:puerto`); crear la cuenta secundaria; en Fuentes, «Agregar» y «Iniciar sesión».
6. **MercadoLibre** (opcional): crear una app en developers.mercadolibre.cl con redirect `https://TU-APP.vercel.app/api/mercadolibre/callback`, guardar `ML_CLIENT_ID` y `ML_CLIENT_SECRET` en Vercel y GitHub, y en Fuentes tocar «Conectar».

## Desarrollo local

```bash
pnpm install
cp .env.example .env   # y completar
pnpm dev               # app en http://localhost:3000
pnpm test              # tests de core y worker
pnpm typecheck
```

`pnpm --filter @radar/worker normalizar:prueba ruta/a/resultado.json` normaliza con Gemini un resultado de la prueba de lector sin volver a entrar al portal.

## Buenas prácticas

- Ritmo humano: pausas al azar, scroll y pocas páginas por pasada.
- Facebook solo con cuenta secundaria y siempre con la misma IP fija; nunca se guarda la contraseña, solo la sesión cifrada en Vault.
- El repo es público: los logs de Actions no muestran links ni claves (se enmascaran) y la pasada de Facebook no sube capturas.
- Scrapear va contra los términos de uso de varios portales: esto es para uso personal y a baja frecuencia.
