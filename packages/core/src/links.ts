/**
 * Reconoce de qué portal es un link compartido o pegado y saca su id.
 * Acepta también texto con el link adentro (lo que manda "Compartir").
 */
export function identificarLink(entrada: string): { fuente: string; id: string; url: string } | null {
  const url = entrada.match(/https?:\/\/\S+/)?.[0] ?? entrada.trim();
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m|web)\./, "");
    if (host === "chileautos.cl") {
      const id = u.pathname.match(/([A-Z]{2}-AD-\d+)/)?.[1];
      return id ? { fuente: "chileautos", id, url: `https://www.chileautos.cl${u.pathname}` } : null;
    }
    if (host === "facebook.com" || host === "fb.com") {
      const id = u.pathname.match(/\/marketplace\/item\/(\d+)/)?.[1];
      return id ? { fuente: "facebook", id, url: `https://www.facebook.com/marketplace/item/${id}/` } : null;
    }
    if (host.endsWith("mercadolibre.cl")) {
      const id = u.pathname.match(/MLC-?(\d+)/)?.[1];
      return id ? { fuente: "mercadolibre", id: `MLC${id}`, url: `${u.origin}${u.pathname}` } : null;
    }
  } catch {
    /* no es una URL */
  }
  return null;
}
