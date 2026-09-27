import { ResultadoCard } from "@/components/resultado-card";
import type { Filtro, ResultadoAuto } from "@/lib/datos";

/**
 * Lista de resultados. Cada vez que aparece una lista nueva (al abrir o al
 * cambiar de filtro), las tarjetas entran escalonadas: responde al gesto y
 * muestra qué cambió.
 */
export function ListaResultados({ clave, resultados, aviso, filtro, vacio }: { clave: string; resultados: ResultadoAuto[]; aviso?: string; filtro: Filtro; vacio: string }) {
  return (
    <main key={clave} className="flex flex-col gap-3 px-4 py-4">
      {resultados.length === 0 ? (
        <p className="entrada-escalonada py-10 text-center text-muted-foreground">{vacio}</p>
      ) : (
        resultados.map((r, i) => (
          <div key={r.autoId} className="entrada-escalonada" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
            <ResultadoCard r={r} destacado={r.enlaces.some((e) => e.id === aviso)} ocultarAlDescartar={filtro !== "descartados"} />
          </div>
        ))
      )}
    </main>
  );
}
