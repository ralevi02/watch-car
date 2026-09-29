import "server-only";
import type { AlUsar } from "@radar/ia";
import { after } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Anota cada consulta a Gemini (qué modelo respondió), para el panel de gastos. */
export function contarUso(uso: string): AlUsar {
  return (modelo) => {
    after(async () => {
      const supabase = await crearClienteServidor();
      await supabase.from("uso_ia").insert({ modelo, uso });
    });
  };
}
