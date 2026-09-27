"use client";

import { ExternalLink, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { conectarGithub, desconectarGithub } from "@/app/(app)/acciones";

// GitHub completa nombre, descripción, vencimiento y el permiso de Actions con estos parámetros.
const CREAR_TOKEN =
  "https://github.com/settings/personal-access-tokens/new?name=Radar%20seminuevos&description=Correr%20las%20pasadas%20desde%20la%20app&target_name=ralevi02&expires_in=366&actions=write";

/** Token de GitHub para lanzar las pasadas y la reconexión de Facebook desde el teléfono. */
export function ConectarGithub({ conectado }: { conectado: boolean }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <section id="github">
      <h2 className="titulo-grupo">Correr desde la app</h2>
      <div className="lista-ios">
        {conectado ? (
          <div className="fila-ios justify-between">
            <span className="flex flex-col">
              <span>GitHub</span>
              <span className="text-[13px] leading-[18px] text-calza">Conectado</span>
            </span>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => confirm("¿Quitar el token de GitHub? Los botones para correr dejan de funcionar hasta que pegues otro.") && iniciar(() => desconectarGithub())}
              className="presionable text-[17px] text-destructive"
            >
              Quitar
            </button>
          </div>
        ) : (
          <>
            <a href={CREAR_TOKEN} target="_blank" rel="noopener noreferrer" className="fila-ios justify-between text-primary active:bg-black/5">
              Crear token en GitHub <ExternalLink className="size-4 text-[#C4C4C6]" strokeWidth={2.4} />
            </a>
            <form
              className="flex items-center gap-3 py-1.5 pl-4 pr-2"
              onSubmit={(e) => {
                e.preventDefault();
                iniciar(async () => {
                  setError(null);
                  const r = await conectarGithub(token);
                  if (r.ok) setToken("");
                  else setError(r.error);
                });
              }}
            >
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega el token (github_pat_…)"
                aria-label="Token de GitHub"
                className="h-9 min-w-0 flex-grow bg-transparent text-[17px] outline-none placeholder:text-[#C4C4C6]"
              />
              <button type="submit" disabled={pendiente || !token.trim()} className="presionable flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-40">
                {pendiente && <LoaderCircle className="size-4 animate-spin" />} Guardar
              </button>
            </form>
          </>
        )}
      </div>
      {error ? (
        <p className="pie-grupo text-destructive">{error}</p>
      ) : (
        <p className="pie-grupo">
          {conectado
            ? "Con esto funcionan los botones ▶ y «Iniciar sesión» de Facebook. El token queda cifrado y solo sirve para las Actions de este repositorio."
            : "En GitHub elige «Only select repositories» → watch-car, deja Actions en «Read and write» y copia el token. Queda cifrado y solo sirve para correr las pasadas."}
        </p>
      )}
    </section>
  );
}
