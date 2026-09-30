import { request } from "node:http";

/**
 * Revisa que el proxy acepte la clave antes de abrir el navegador (un pedido
 * de pocos KB). Sin esto, un proxy sin saldo o vencido se ve como
 * "ERR_HTTP_RESPONSE_CODE_FAILURE" en cada página. Devuelve el problema o null.
 * Nunca incluye la URL ni la clave en el mensaje.
 */
export async function revisarProxy(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "PROXY_URL no es una URL válida.";
  }
  const auth = u.username ? `Basic ${Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString("base64")}` : undefined;
  return new Promise((listo) => {
    const req = request(
      { host: u.hostname, port: Number(u.port) || 80, method: "GET", path: "http://example.com/", headers: { Host: "example.com", ...(auth ? { "Proxy-Authorization": auth } : {}) }, timeout: 20_000 },
      (res) => {
        res.resume();
        const s = res.statusCode ?? 0;
        if (s === 407) listo("El proxy rechazó la clave: se acabó el saldo, venció el plan o cambió la clave. Hay que renovarlo o actualizar PROXY_URL.");
        else if (s === 402) listo("El proxy pide pago: se acabó el saldo.");
        else if (s >= 500) listo(`El proxy no responde bien (código ${s}).`);
        else listo(null);
      },
    );
    req.on("timeout", () => req.destroy(new Error("tiempo")));
    req.on("error", (e) => listo(`No se pudo conectar al proxy (${e.message === "tiempo" ? "no respondió" : ((e as NodeJS.ErrnoException).code ?? "error de red")}).`));
    req.end();
  });
}
