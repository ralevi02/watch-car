import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { Pantalla } from "@/components/pantalla";
import { VistaResultados } from "@/components/vista-resultados";
import { leerBusquedas, leerResultados, type Filtro } from "@/lib/datos";
import { FILTROS } from "@/lib/filtros";

export default async function Resultados({ searchParams }: PageProps<"/resultados">) {
  const sp = await searchParams;
  const filtro = (FILTROS.find((f) => f.id === sp.filtro)?.id ?? "todos") as Filtro;
  const busqueda = typeof sp.busqueda === "string" ? sp.busqueda : undefined;
  const aviso = typeof sp.aviso === "string" ? sp.aviso : undefined;
  const [busquedas, resultados] = await Promise.all([leerBusquedas(), leerResultados()]);

  return (
    <>
      <Encabezado titulo="Resultados">
        <Link href="/compartir" className="presionable rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium">
          + Pegar link
        </Link>
      </Encabezado>
      <Pantalla>
        <VistaResultados
          resultados={resultados}
          busquedas={busquedas.map((b) => ({ id: b.id, nombre: b.nombre }))}
          filtroInicial={filtro}
          busquedaInicial={busquedas.some((b) => b.id === busqueda) ? busqueda : undefined}
          aviso={aviso}
        />
      </Pantalla>
    </>
  );
}
