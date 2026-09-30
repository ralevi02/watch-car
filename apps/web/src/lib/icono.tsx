import { ImageResponse } from "next/og";

export type VarianteIcono = "oscuro" | "claro";

const COLORES: Record<VarianteIcono, { fondo: string; caja: string; verde: string; signo: string; lineas: string; apagado: number }> = {
  // El ícono de la app: semáforo gris sobre tinta, luz verde con el signo peso.
  oscuro: { fondo: "#121314", caja: "#2c2e32", verde: "#6fd1a0", signo: "#121314", lineas: "#6fd1a0", apagado: 0.22 },
  // Versión clara, con grises más suaves: para la pestaña del navegador en modo claro.
  claro: { fondo: "#f1f1f2", caja: "#5b5e64", verde: "#6fd1a0", signo: "#121314", lineas: "#17794a", apagado: 0.3 },
};

/**
 * Semáforo inclinado, con líneas de velocidad: la roja y la ámbar apagadas y la
 * verde con el signo peso. En un cuadro de 100. `redondo` agrega las esquinas del
 * ícono; `escala` achica el dibujo para la zona segura de los íconos que el
 * sistema recorta (Android "maskable" e iOS). El $ va como trazo (sin fuentes).
 */
export function svgIcono(variante: VarianteIcono, { redondo = true, escala = 1 } = {}): string {
  const c = COLORES[variante];
  const m = (100 - 100 * escala) / 2;
  const linea = (x1: number, y: number, op: number) => `<line x1="${x1}" y1="${y}" x2="27" y2="${y}" stroke="${c.lineas}" stroke-opacity="${op}" stroke-width="3.5" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="${redondo ? 22.5 : 0}" fill="${c.fondo}"/>
  <g transform="translate(${m} ${m}) scale(${escala})">
    ${linea(14, 62, 0.35)}${linea(9, 71, 0.75)}${linea(17, 80, 0.35)}
    <g transform="translate(50 50) skewX(-12) translate(-50 -50)">
      <rect x="36" y="12" width="30" height="76" rx="15" fill="${c.caja}"/>
      <circle cx="51" cy="29" r="8.5" fill="#e5484d" fill-opacity="${c.apagado}"/>
      <circle cx="51" cy="50" r="8.5" fill="#eab35c" fill-opacity="${c.apagado}"/>
      <circle cx="51" cy="71" r="9.5" fill="${c.verde}"/>
      <g transform="translate(51 71)" fill="none" stroke="${c.signo}" stroke-width="2.3" stroke-linecap="round">
        <path d="M3.9 -3.4 C3.3 -4.9 1.9 -5.5 0 -5.5 C-2.3 -5.5 -3.9 -4.4 -3.9 -2.7 C-3.9 -0.8 -2.1 -0.2 0 0.2 C2.3 0.6 4.1 1.3 4.1 3.1 C4.1 4.8 2.4 5.7 0 5.7 C-1.9 5.7 -3.5 5.1 -4.2 3.5"/>
        <path d="M0 -7.4 L0 7.6"/>
      </g>
    </g>
  </g>
</svg>`;
}

/**
 * PNG del ícono. `conMargen`: sin esquinas, para los sistemas que las ponen
 * solos: "maskable" (Android recorta en círculo, el dibujo va en la zona segura)
 * o "ios" (iOS solo redondea, el dibujo puede ir más grande).
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
