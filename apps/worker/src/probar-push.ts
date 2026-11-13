import { resolve } from "node:path";
import { clienteServicio } from "@radar/db";
import { enviarPush } from "./push.js";

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* en el homelab las variables vienen del contenedor */
}
const r = await enviarPush(clienteServicio(), [{ titulo: "Prueba de Radar", cuerpo: "Si ves esto, las notificaciones llegan al teléfono.", etiqueta: "prueba", tipo: "sistema" }]);
console.log(`Enviadas: ${r.enviadas}${r.error ? ` (${r.error})` : ""}`);
