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
    background_color: "#0f0f10",
    theme_color: "#0f0f10",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Al mantener presionado el ícono de la app.
    shortcuts: [
      { name: "Nuevos", short_name: "Nuevos", url: "/resultados?filtro=nuevos", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Guardados", short_name: "Guardados", url: "/resultados?filtro=favoritos", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "En contacto", short_name: "Contacto", url: "/resultados?filtro=contacto", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Agregar aviso", short_name: "Agregar", url: "/compartir", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
    // Android: "Compartir" un aviso desde Facebook o Chileautos lo manda a la app.
    share_target: { action: "/compartir", method: "GET", params: { title: "title", text: "text", url: "url" } },
  };
}
