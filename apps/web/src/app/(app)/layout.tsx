import { AvisoNoDueno } from "@/components/aviso-no-dueno";
import { NavInferior } from "@/components/nav-inferior";
import { RegistroSW } from "@/components/registro-sw";
import { ProveedorAlmacen } from "@/lib/almacen";

/**
 * Sin lecturas aquí: el layout y las pestañas son estáticos (se sirven al tiro
 * desde la CDN) y los datos llegan desde el almacén del teléfono.
 */
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <ProveedorAlmacen>
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col pb-[calc(64px+env(safe-area-inset-bottom))]">
        <AvisoNoDueno />
        {children}
        <NavInferior />
        <RegistroSW />
      </div>
    </ProveedorAlmacen>
  );
}
