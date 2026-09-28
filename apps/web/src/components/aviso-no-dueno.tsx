"use client";

import { useAlmacen } from "@/lib/almacen";

export function AvisoNoDueno() {
  const { datos } = useAlmacen();
  if (!datos || datos.dueno) return null;
  return (
    <div className="m-4 rounded-xl bg-advertencia-fondo px-4 py-3 text-[15px] leading-5 text-advertencia">
      Entraste como {datos.usuario?.email ?? "usuario nuevo"}, pero todavía no estás habilitado para ver datos. Hay que agregar tu usuario a la tabla «duenos» en Supabase (id:{" "}
      <code className="break-all">{datos.usuario?.id}</code>).
    </div>
  );
}
