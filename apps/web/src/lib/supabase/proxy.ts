import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /v/<token>: la página de un auto compartido para opinar (sin cuenta).
const PUBLICAS = ["/login", "/auth", "/v/", "/manifest.webmanifest", "/sw.js", "/icons", "/icon", "/apple-icon"];

/** Refresca la sesión en cada pedido y manda al login si no hay usuario. */
export async function actualizarSesion(request: NextRequest) {
  // Si Supabase manda el link a la raíz (Site URL) en vez de /auth/confirm, no perder el código.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => respuesta.headers.set(k, v));
      },
    },
  });

  // Nada entre createServerClient y getClaims (recomendación de Supabase).
  const { data } = await supabase.auth.getClaims();
  const publica = PUBLICAS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!data?.claims && !publica) {
    if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Para volver a donde iba (ej. un link compartido) después de entrar.
    if (request.nextUrl.pathname !== "/") url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return respuesta;
}
