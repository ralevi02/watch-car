import { ListaSeguimientos } from "@/components/lista-seguimientos";
import { contarPorBusqueda, leerBusquedas } from "@/lib/datos";

export default async function Seguimientos() {
  const [busquedas, cuentas] = await Promise.all([leerBusquedas(), contarPorBusqueda()]);
  return <ListaSeguimientos busquedas={busquedas.map((b) => ({ ...b, avisos: cuentas[b.id] ?? 0 }))} />;
}
