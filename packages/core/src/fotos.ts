/** Chileautos sirve la foto en el tamaño que se le pida: para el detalle, una más grande. */
export function fotoGrande(url: string | null, ancho = 1000) {
  if (!url) return null;
  if (url.includes("pxcrush.net")) return url.replace(/pxc_size=\d+,\d+/, `pxc_size=${ancho},${Math.round((ancho * 2) / 3)}`);
  return url;
}
