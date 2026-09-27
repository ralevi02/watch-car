import { NavInferior } from "@/components/nav-inferior";
import { RegistroSW } from "@/components/registro-sw";
import { esDueno } from "@/lib/datos";
import { crearClienteServidor } from "@/lib/supabase/server";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const dueno = await esDueno();
  let usuario: { email?: string; id?: string } = {};
  if (!dueno) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase.auth.getClaims();
    usuario = { email: data?.claims.email as string | undefined, id: data?.claims.sub };
  }
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col pb-[calc(58px+env(safe-area-inset-bottom))]">
      {!dueno && (
        <div className="m-4 rounded-xl bg-advertencia-fondo px-4 py-3 text-[15px] leading-5 text-[#7A4800]">
          Entraste como {usuario.email ?? "usuario nuevo"}, pero todavía no estás habilitado para ver datos. Hay que agregar tu usuario a la tabla
          «duenos» en Supabase (id: <code className="break-all">{usuario.id}</code>).
        </div>
      )}
      {children}
      <NavInferior />
      <RegistroSW />
    </div>
  );
}
