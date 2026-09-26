import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Destino del link mágico: acepta el formato con token_hash y el con code (PKCE). */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const destino = request.nextUrl.clone();
  destino.search = "";
  destino.pathname = "/resultados";

  const supabase = await crearClienteServidor();
  const { error } = tokenHash && tipo
    ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Link incompleto") };

  if (error) {
    destino.pathname = "/login";
    destino.searchParams.set("error", "El link venció o ya se usó. Pide uno nuevo.");
  }
  return NextResponse.redirect(destino);
}
