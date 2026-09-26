import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Paso 2: cambia el code por tokens y los guarda cifrados en Vault (solo el dueño puede). */
export async function GET(request: NextRequest) {
  const volver = (estado: string) => NextResponse.redirect(new URL(`/fuentes?ml=${estado}`, request.nextUrl.origin));
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || state !== request.cookies.get("ml_state")?.value) return volver("error");

  const r = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_CLIENT_ID ?? "",
      client_secret: process.env.ML_CLIENT_SECRET ?? "",
      code,
      redirect_uri: `${request.nextUrl.origin}/api/mercadolibre/callback`,
    }),
  });
  if (!r.ok) return volver("error");
  const j = (await r.json()) as { access_token: string; refresh_token: string; expires_in: number };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("guardar_secreto_app", {
    p_nombre: "mercadolibre",
    p_valor: JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + j.expires_in * 1000 }),
  });
  if (error) return volver("error");
  await supabase.from("fuentes").update({ activa: true }).eq("id", "mercadolibre");
  const res = volver("ok");
  res.cookies.delete({ name: "ml_state", path: "/api/mercadolibre" });
  return res;
}
