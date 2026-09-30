/**
 * MercadoLibre exige una URL de notificaciones al registrar la app. La app no
 * vende ni publica, así que no usa ninguna: se responde 200 al tiro (ML pide
 * respuesta en menos de 500 ms) y se ignora el contenido.
 */
export function POST() {
  return new Response(null, { status: 200 });
}

export function GET() {
  return new Response("ok");
}
