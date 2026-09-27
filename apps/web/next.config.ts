import type { NextConfig } from "next";
import { resolve } from "node:path";

// Un solo .env en la raíz del monorepo para la app y el worker.
// En Vercel no existe: ahí se usan las variables de entorno del proyecto.
try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* sin .env local */
}

const nextConfig: NextConfig = {
  transpilePackages: ["@radar/core", "@radar/ia", "@radar/db"],
  devIndicators: { position: "top-right" },
  experimental: {
    // Las pestañas precargadas y las páginas ya visitadas se reusan un rato:
    // cambiar de pestaña no espera al servidor. Las acciones (favorito,
    // guardar) igual refrescan lo que cambió.
    staleTimes: { dynamic: 60, static: 300 },
  },
};

export default nextConfig;
