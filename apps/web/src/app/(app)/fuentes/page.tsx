import { ExternalLink, LogOut } from "lucide-react";
import { salir } from "@/app/(app)/acciones";
import { BotonPush } from "@/components/boton-push";
import { CuentasFacebook } from "@/components/cuentas-facebook";
import { Encabezado } from "@/components/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leerFacebook, leerFuentesYPasadas, NOMBRE_FUENTE } from "@/lib/datos";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  ok: { texto: "OK", clase: "bg-emerald-600 text-white" },
  corriendo: { texto: "Corriendo", clase: "bg-secondary text-secondary-foreground" },
  bloqueo: { texto: "Bloqueo", clase: "bg-destructive text-white" },
  error: { texto: "Error", clase: "bg-destructive text-white" },
};

const fecha = (s: string) =>
  new Date(s).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Fuentes() {
  const [{ fuentes, pasadas }, facebook] = await Promise.all([leerFuentesYPasadas(), leerFacebook()]);
  const ultima = (id: string) => pasadas.find((p) => p.fuente_id === id);

  return (
    <>
      <Encabezado titulo="Fuentes" />
      <main className="flex flex-col gap-6 px-4 py-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Portales</h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {fuentes.map((f) => {
              const u = ultima(f.id);
              return (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium">{f.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.activa ? (u ? `Última pasada: ${fecha(u.inicio)}` : "Sin pasadas todavía") : f.id === "facebook" ? "Desactivado" : "Próximamente"}
                    </p>
                  </div>
                  {f.activa ? <Badge className={ESTADO[u?.estado ?? "ok"]?.clase}>{u ? ESTADO[u.estado]?.texto : "Activa"}</Badge> : <Badge variant="outline">Pronto</Badge>}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Chileautos se revisa cada 3 horas entre 8:00 y 23:00; Facebook, 3 veces al día.</p>
        </section>

        <CuentasFacebook {...facebook} />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Notificaciones</h2>
          <p className="text-sm text-muted-foreground">Avisos nuevos que calzan, bajas de precio y bloqueos de un portal.</p>
          <BotonPush />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Registro de pasadas</h2>
          {pasadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no corre ninguna pasada.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
              {pasadas.map((p) => {
                const d = (p.detalle ?? {}) as { run?: string; errores?: string[]; bloqueo?: string };
                return (
                  <li key={p.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {NOMBRE_FUENTE[p.fuente_id] ?? p.fuente_id} · {p.busquedas?.nombre ?? "sin búsqueda"}
                      </span>
                      <Badge className={ESTADO[p.estado]?.clase}>{ESTADO[p.estado]?.texto ?? p.estado}</Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {fecha(p.inicio)} · {p.avisos_vistos ?? 0} vistos · {p.avisos_nuevos ?? 0} nuevos · {p.tipo}
                    </span>
                    {(d.bloqueo || d.errores?.length) && <span className="text-destructive">{[d.bloqueo, ...(d.errores ?? [])].filter(Boolean).join(" · ")}</span>}
                    {d.run && (
                      <a href={d.run} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary">
                        <ExternalLink className="size-3.5" /> Ver corrida en GitHub
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form action={salir}>
          <Button variant="ghost" type="submit">
            <LogOut /> Salir
          </Button>
        </form>
      </main>
    </>
  );
}
