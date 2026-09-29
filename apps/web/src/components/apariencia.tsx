"use client";

import { useEffect, useState } from "react";
import { Segmentado } from "@/components/ui/segmentado";

type Tema = "sistema" | "light" | "dark";
const CLAVE = "radar:tema";
const COLOR = { light: "#ffffff", dark: "#0f0f10" };

/** Aplica el tema: con "sistema" manda prefers-color-scheme. */
function aplicar(t: Tema) {
  const html = document.documentElement;
  if (t === "sistema") delete html.dataset.theme;
  else html.dataset.theme = t;
  // La barra del sistema sigue al tema elegido.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = t === "sistema" ? (m.media.includes("dark") ? COLOR.dark : COLOR.light) : COLOR[t];
  });
}

/** Claro, oscuro o lo que diga el teléfono. Se guarda en este teléfono. */
export function Apariencia() {
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    try {
      const t = localStorage.getItem(CLAVE);
      if (t === "light" || t === "dark") {
        setTema(t);
        aplicar(t);
      }
    } catch {}
  }, []);

  const elegir = (t: Tema) => {
    navigator.vibrate?.(5);
    setTema(t);
    try {
      if (t === "sistema") localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, t);
    } catch {}
    const html = document.documentElement;
    const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reducir) return aplicar(t);
    // El tema nuevo se abre en círculo desde el control.
    html.classList.add("cambio-tema");
    const vt = document.startViewTransition(() => aplicar(t));
    vt.finished.finally(() => html.classList.remove("cambio-tema"));
  };

  return (
    <section>
      <h2 className="titulo-grupo">Apariencia</h2>
      <Segmentado
        etiqueta="Apariencia"
        valor={tema}
        onCambio={elegir}
        opciones={[
          { id: "sistema", etiqueta: "Sistema" },
          { id: "light", etiqueta: "Claro" },
          { id: "dark", etiqueta: "Oscuro" },
        ]}
      />
    </section>
  );
}
