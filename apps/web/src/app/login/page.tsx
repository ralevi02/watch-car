"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const supabase = crearClienteNavegador();
  // Solo rutas internas, para no redirigir a otro sitio.
  const siguiente = params.get("next")?.startsWith("/") && !params.get("next")?.startsWith("//") ? params.get("next")! : "/resultados";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(siguiente)}` },
    });
    setCargando(false);
    if (error) setError(error.message);
    else setEnviado(true);
  }

  // En iPhone el link del mail abre Safari y no la app instalada: por eso también se acepta el código.
  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: "email" });
    setCargando(false);
    if (error) setError("El código no es válido o venció.");
    else router.replace(siguiente);
  }

  const campo = "block h-11 w-full bg-transparent px-4 text-[17px] outline-none placeholder:text-[#C4C4C6]";
  const boton = "presionable flex h-[50px] items-center justify-center gap-2 rounded-[12px] bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-40";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-[60px] items-center justify-center rounded-[14px] bg-primary text-white">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M5.5 10.5l1.6-4.2A2 2 0 019 5h6a2 2 0 011.9 1.3l1.6 4.2A2 2 0 0120 12.4V17a1 1 0 01-1 1h-1.2a1 1 0 01-1-1v-1H7.2v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-4.6a2 2 0 011.5-1.9zM7.6 10h8.8l-1.2-3.2a.8.8 0 00-.7-.5H9.5a.8.8 0 00-.7.5z" />
          </svg>
        </span>
        <h1 className="text-[28px] font-bold leading-[34px]">Radar seminuevos</h1>
      </div>

      {!enviado ? (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <div>
            <div className="lista-ios">
              <input id="email" type="email" required autoComplete="email" aria-label="Correo" placeholder="tu@correo.cl" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
            </div>
            <p className="pie-grupo">Te mando un link y un código a tu correo.</p>
          </div>
          <button type="submit" className={boton} disabled={cargando}>
            {cargando && <LoaderCircle className="size-5 animate-spin" />} Enviar
          </button>
        </form>
      ) : (
        <form onSubmit={verificar} className="flex flex-col gap-3">
          <div>
            <div className="lista-ios">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Código"
                placeholder="Código"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`${campo} text-center tracking-[0.3em]`}
              />
            </div>
            <p className="pie-grupo">Revisa tu correo ({email}). Toca el link, o escribe aquí el código si estás en la app instalada.</p>
          </div>
          <button type="submit" className={boton} disabled={cargando || codigo.trim().length < 6}>
            {cargando && <LoaderCircle className="size-5 animate-spin" />} Entrar con el código
          </button>
          <button type="button" onClick={() => setEnviado(false)} className="presionable h-11 text-[17px] text-primary">
            Usar otro correo
          </button>
        </form>
      )}

      {error && <p className="-mt-4 text-center text-[15px] text-destructive">{error}</p>}
    </div>
  );
}

export default function Login() {
  return (
    <Suspense>
      <Formulario />
    </Suspense>
  );
}
