import { ImageResponse } from "next/og";

export type VarianteIcono = "oscuro" | "claro";

const COLORES: Record<VarianteIcono, { fondo: string; cuerpo: string; oscuro: string; luz: string }> = {
  // D1: auto claro sobre tinta, faros verdes. Es el ícono de la app.
  oscuro: { fondo: "#121314", cuerpo: "#f1f1f2", oscuro: "#121314", luz: "#6fd1a0" },
  // D2: auto tinta sobre blanco. Para la pestaña del navegador en modo claro.
  claro: { fondo: "#ffffff", cuerpo: "#121314", oscuro: "#ffffff", luz: "#17794a" },
};

/**
 * La cara del auto de frente (D1/D2), en un cuadro de 100. `redondo` agrega las
 * esquinas del ícono; `escala` achica el auto para la zona segura de los íconos
 * que el sistema recorta (Android "maskable" e iOS).
 */
export function svgIcono(variante: VarianteIcono, { redondo = true, escala = 1 } = {}): string {
  const c = COLORES[variante];
  const m = (100 - 100 * escala) / 2;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="${redondo ? 22.5 : 0}" fill="${c.fondo}"/>
  <g transform="translate(${m} ${m + 2 * escala}) scale(${escala})">
    <rect x="21" y="70" width="12" height="10" rx="3" fill="${c.cuerpo}"/><rect x="67" y="70" width="12" height="10" rx="3" fill="${c.cuerpo}"/>
    <path d="M30 42 L35 27 C36 24 39 22 42 22 L58 22 C61 22 64 24 65 27 L70 42 Z" fill="${c.cuerpo}"/>
    <path d="M36 40 L39.5 30 C40 28.5 41.5 27.5 43 27.5 L57 27.5 C58.5 27.5 60 28.5 60.5 30 L64 40 Z" fill="${c.oscuro}"/>
    <rect x="16" y="40" width="68" height="34" rx="11" fill="${c.cuerpo}"/>
    <circle cx="30" cy="55" r="7" fill="${c.oscuro}"/><circle cx="70" cy="55" r="7" fill="${c.oscuro}"/>
    <circle cx="30" cy="55" r="3.4" fill="${c.luz}"/><circle cx="70" cy="55" r="3.4" fill="${c.luz}"/>
    <rect x="41" y="57" width="18" height="6" rx="3" fill="${c.oscuro}"/>
  </g>
</svg>`;
}

/**
 * PNG del ícono. `conMargen`: sin esquinas, para los sistemas que las ponen
 * solos: "maskable" (Android recorta en círculo, el auto va en la zona segura)
 * o "ios" (iOS solo redondea, el auto puede ir más grande).
 */
export function icono(tam: number, conMargen: boolean | "ios" = false, variante: VarianteIcono = "oscuro") {
  const svg = svgIcono(variante, conMargen ? { redondo: false, escala: conMargen === "ios" ? 0.9 : 0.78 } : {});
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={tam} height={tam} alt="" />
    ),
    { width: tam, height: tam },
  );
}
