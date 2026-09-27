import { Chat } from "@/components/chat";
import { Encabezado } from "@/components/encabezado";
import { ListaSeguimientos } from "@/components/lista-seguimientos";
import { Pantalla } from "@/components/pantalla";
import { leerBusquedas } from "@/lib/datos";

export default async function Seguimientos() {
  const busquedas = await leerBusquedas();
  return (
    <>
      <Encabezado titulo="Seguimientos" />
      <Pantalla>
        <ListaSeguimientos busquedas={busquedas} />
        <Chat conSeguimientos={busquedas.length > 0} />
      </Pantalla>
    </>
  );
}
