import { ImageResponse } from "next/og";

/** Ícono de la app: radar blanco sobre azul petróleo. */
export function icono(tam: number, conMargen = false) {
  const lado = conMargen ? tam * 0.62 : tam * 0.78;
  const anillo = (f: number, grosor: number) => ({
    position: "absolute" as const,
    width: lado * f,
    height: lado * f,
    borderRadius: "50%",
    border: `${Math.max(2, tam * grosor)}px solid rgba(255,255,255,${f === 1 ? 0.95 : 0.7})`,
  });
  // Satori no respeta transformOrigin: la barrida se rota sobre su centro, ubicado a mano.
  const largo = lado * 0.46;
  const grosor = Math.max(2, tam * 0.04);
  const angulo = (40 * Math.PI) / 180;
  const cx = lado / 2 + (largo / 2) * Math.cos(angulo);
  const cy = lado / 2 - (largo / 2) * Math.sin(angulo);
  return new ImageResponse(
    (
      <div style={{ width: tam, height: tam, background: "#2B5A87", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: conMargen ? 0 : tam * 0.22 }}>
        <div style={{ position: "relative", width: lado, height: lado, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={anillo(1, 0.045)} />
          <div style={anillo(0.62, 0.04)} />
          <div style={{ position: "absolute", width: largo, height: grosor, background: "white", left: cx - largo / 2, top: cy - grosor / 2, transform: "rotate(-40deg)", borderRadius: 4 }} />
          <div style={{ position: "absolute", width: lado * 0.16, height: lado * 0.16, borderRadius: "50%", background: "white" }} />
          <div style={{ position: "absolute", width: lado * 0.1, height: lado * 0.1, borderRadius: "50%", background: "#F2B544", left: lado * 0.25, top: lado * 0.26 }} />
        </div>
      </div>
    ),
    { width: tam, height: tam },
  );
}
