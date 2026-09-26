import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Radar seminuevos",
    short_name: "Radar",
    description: "Seguimiento de autos usados en Chile",
    lang: "es-CL",
    start_url: "/resultados",
    scope: "/",
    display: "standalone",
    background_color: "#F2F4F3",
    theme_color: "#2B5A87",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android: "Compartir" un aviso desde Facebook o Chileautos lo manda a la app.
    share_target: { action: "/compartir", method: "GET", params: { title: "title", text: "text", url: "url" } },
  };
}
