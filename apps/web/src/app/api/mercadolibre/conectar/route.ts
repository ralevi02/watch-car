import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Paso 1 del OAuth de MercadoLibre: manda al login de MercadoLibre con un state anti-CSRF. */
export async function GET(request: NextRequest) {
  const id = process.env.ML_CLIENT_ID;
  if (!id) return NextResponse.redirect(new URL("/fuentes?ml=falta-config", request.nextUrl.origin));
  const state = randomUUID();
  const url = new URL("https://auth.mercadolibre.cl/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", `${request.nextUrl.origin}/api/mercadolibre/callback`);
  url.searchParams.set("state", state);
  const r = NextResponse.redirect(url);
  r.cookies.set("ml_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/mercadolibre" });
  return r;
}
