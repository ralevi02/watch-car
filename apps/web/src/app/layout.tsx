import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Radar seminuevos",
  description: "Seguimiento de autos usados en Chile",
  appleWebApp: { capable: true, title: "Radar", statusBarStyle: "default" },
  // Pestaña del navegador: D2 (auto oscuro sobre blanco) en modo claro y D1 en modo oscuro.
  icons: {
    icon: [
      { url: "/icons/64-claro", type: "image/png", sizes: "64x64", media: "(prefers-color-scheme: light)" },
      { url: "/icons/64", type: "image/png", sizes: "64x64", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** El tema elegido a mano (Fuentes > Apariencia) se aplica antes de pintar: sin parpadeo. */
const TEMA = `try{var t=localStorage.getItem("radar:tema");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${instrument.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
