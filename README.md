# Radar seminuevos

App personal para seguir autos usados en Chile: le dices en lenguaje natural qué auto quieres, y junta los avisos de Chileautos, Facebook Marketplace, MercadoLibre y otros, con advertencias para los que se salen un poco de tus filtros.

## Estructura

| Carpeta | Qué tiene |
| --- | --- |
| `apps/worker` | Recolectores (Playwright/Patchright). Hoy: las pruebas de la fase 0 |
| `apps/web` | La app en Next.js (fase 1) |
| `packages/core` | La ficha del seguimiento (esquema zod) y la regla que decide si un aviso calza, entra con advertencia o queda fuera |
| `.github/workflows` | Las corridas en GitHub Actions |

Stack: TypeScript, pnpm, Next.js en Vercel, Supabase, Gemini, GitHub Actions, proxy residencial y Browserbase para reconectar Facebook.

## Fase 0: pruebas previas

Responde, antes de construir nada:

1. ¿Chileautos responde desde GitHub Actions, con o sin proxy?
2. ¿Cuántos avisos muestra Facebook Marketplace sin iniciar sesión, y se ve el km del detalle?
3. ¿La API de búsqueda de MercadoLibre sigue abierta?

### Cómo correrla

1. Crea un repositorio **privado** en GitHub y sube esta carpeta:
   ```bash
   git init && git add . && git commit -m "Fase 0: pruebas previas"
   git branch -M main
   git remote add origin git@github.com:TU_USUARIO/radar-seminuevos.git
   git push -u origin main
   ```
2. En GitHub: pestaña **Actions** → **Fase 0 · pruebas previas** → **Run workflow**. La primera vez, deja «usar proxy» sin marcar.
3. Cuando termine (unos 3–5 minutos), abre la corrida:
   - El **resumen** con el veredicto aparece en la misma página.
   - En **Artifacts** está `fase0-resultados`, con `report.json`, `resumen.md` y las capturas de pantalla.

### Si Chileautos sale bloqueado

1. Compra un proxy residencial de pago por GB (con IP fija si es posible).
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**, nombre `PROXY_URL`, valor `http://usuario:clave@host:puerto`.
3. Corre el workflow de nuevo marcando «usar proxy».

### Opcional: MercadoLibre con token

Crea una app en el portal de desarrolladores de MercadoLibre, genera un token y guárdalo como secreto `ML_ACCESS_TOKEN`.

### Correrla en tu computador

```bash
pnpm install
cp .env.example .env   # opcional: completa lo que quieras probar
pnpm fase0
```

Necesita Google Chrome instalado (o `BROWSER_EXECUTABLE` apuntando a un Chromium). Con `SOLO=facebook pnpm fase0` pruebas una sola fuente.

## Buenas prácticas de estas pruebas

- Ritmo humano: pausas al azar y pocas páginas por corrida.
- Sin imágenes, videos ni fuentes, para gastar poco proxy.
- Facebook se prueba **sin iniciar sesión**. Ninguna cuenta se usa en esta fase.
- Scrapear va contra los términos de uso de varios portales: esto es para uso personal y a baja frecuencia.
