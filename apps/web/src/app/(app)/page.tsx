import { Chat } from "@/components/chat";
import { Encabezado } from "@/components/encabezado";
import { ListaSeguimientos } from "@/components/lista-seguimientos";
import { leerBusquedas } from "@/lib/datos";

export default async function Seguimientos() {
  const busquedas = await leerBusquedas();
  return (
    <>
      <Encabezado titulo="Seguimientos" />
      <ListaSeguimientos busquedas={busquedas} />
      <Chat conSeguimientos={busquedas.length > 0} />
    </>
  );
}
