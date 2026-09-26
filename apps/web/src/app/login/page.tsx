"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
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
    else router.replace("/resultados");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Radar seminuevos</p>
        <h1 className="font-heading text-3xl font-bold">Entrar</h1>
      </div>

      {!enviado ? (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="email">
            Te mando un link y un código a tu correo.
          </label>
          <Input id="email" type="email" required autoComplete="email" placeholder="tu@correo.cl" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-card" />
          <Button type="submit" size="lg" className="h-11" disabled={cargando}>
            {cargando && <LoaderCircle className="animate-spin" />} Enviar
          </Button>
        </form>
      ) : (
        <form onSubmit={verificar} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Revisa tu correo ({email}). Toca el link, o escribe aquí el código si estás en la app instalada.
          </p>
          <Input inputMode="numeric" autoComplete="one-time-code" placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="h-11 bg-card text-center text-lg tracking-widest" />
          <Button type="submit" size="lg" className="h-11" disabled={cargando || codigo.trim().length < 6}>
            {cargando && <LoaderCircle className="animate-spin" />} Entrar con el código
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEnviado(false)}>
            Usar otro correo
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
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
