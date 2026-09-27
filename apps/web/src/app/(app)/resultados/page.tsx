import { VistaResultados } from "@/components/vista-resultados";
import { leerBusquedas, leerResultados, type Filtro } from "@/lib/datos";
import { FILTROS } from "@/lib/filtros";

export default async function Resultados({ searchParams }: PageProps<"/resultados">) {
  const sp = await searchParams;
  const filtro = (FILTROS.find((f) => f === sp.filtro) ?? "todos") as Filtro;
  const busqueda = typeof sp.busqueda === "string" ? sp.busqueda : undefined;
  const aviso = typeof sp.aviso === "string" ? sp.aviso : undefined;
  const [busquedas, resultados] = await Promise.all([leerBusquedas(), leerResultados()]);

  return (
    <VistaResultados
      resultados={resultados}
      busquedas={busquedas.map((b) => ({ id: b.id, nombre: b.nombre }))}
      filtroInicial={filtro}
      busquedaInicial={busquedas.some((b) => b.id === busqueda) ? busqueda : undefined}
      aviso={aviso}
    />
  );
}
