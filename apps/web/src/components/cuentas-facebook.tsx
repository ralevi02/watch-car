"use client";

import { LoaderCircle, Pause, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarCuentaFacebook, cambiarCuentaFacebook, configurarFacebook, crearCuentaFacebook, pedirReconexion } from "@/app/(app)/acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Cuenta {
  id: string;
  nombre: string;
  estado: string;
  sesion_guardada_en: string | null;
  ultima_ok: string | null;
  ultimo_error: string | null;
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  activa: { texto: "Activa", clase: "bg-emerald-600 text-white" },
  sin_sesion: { texto: "Sin sesión", clase: "bg-muted text-muted-foreground" },
  necesita_reconexion: { texto: "Reconectar", clase: "bg-advertencia-fondo text-advertencia" },
  bloqueada: { texto: "Bloqueada", clase: "bg-destructive text-white" },
  pausada: { texto: "En pausa", clase: "bg-muted text-muted-foreground" },
};

const fecha = (s: string) => new Date(s).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function CuentasFacebook({ activa, rotacion, pasadasPorDia, cuentas }: { activa: boolean; rotacion: boolean; pasadasPorDia: number; cuentas: Cuenta[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reconectar = (id: string) =>
    iniciar(async () => {
      setError(null);
      const r = await pedirReconexion(id);
      if (r.ok && r.id) router.push(`/fuentes/reconectar/${r.id}`);
      else if (!r.ok) setError(r.error);
    });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cuentas de Facebook</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activa} disabled={pendiente} onChange={(e) => iniciar(() => configurarFacebook({ activa: e.target.checked }))} className="size-4 accent-primary" />
          Buscar en Facebook
        </label>
      </div>
      <p className="text-sm text-muted-foreground">
        Usa cuentas secundarias, nunca la personal. La app guarda solo la sesión cifrada, no la contraseña. Para iniciar sesión se abre el mismo navegador del
        buscador, con la misma IP fija.
      </p>

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {cuentas.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Todavía no hay cuentas.</li>}
        {cuentas.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.nombre}</span>
              <Badge className={ESTADO[c.estado]?.clase}>{ESTADO[c.estado]?.texto ?? c.estado}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {c.ultima_ok ? `Última pasada bien: ${fecha(c.ultima_ok)}` : c.sesion_guardada_en ? `Sesión guardada: ${fecha(c.sesion_guardada_en)}` : "Falta iniciar sesión"}
            </p>
            {c.ultimo_error && <p className="text-sm text-destructive">{c.ultimo_error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={c.estado === "activa" ? "outline" : "default"} disabled={pendiente} onClick={() => reconectar(c.id)}>
                <RefreshCw /> {c.estado === "sin_sesion" ? "Iniciar sesión" : "Reconectar"}
              </Button>
              {(c.estado === "activa" || c.estado === "pausada") && (
                <Button size="sm" variant="outline" disabled={pendiente} onClick={() => iniciar(() => cambiarCuentaFacebook(c.id, c.estado === "activa" ? "pausada" : "activa"))}>
                  {c.estado === "activa" ? <Pause /> : <Play />} {c.estado === "activa" ? "Pausar" : "Activar"}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pendiente}
                onClick={() => {
                  if (confirm(`¿Borrar «${c.nombre}» y su sesión guardada?`)) iniciar(() => borrarCuentaFacebook(c.id));
                }}
              >
                <Trash2 /> Borrar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await crearCuentaFacebook(nombre || `Cuenta ${cuentas.length + 1}`);
            if (!r.ok) setError(r.error);
            else setNombre("");
          });
        }}
      >
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={`Cuenta ${cuentas.length + 1}`} className="bg-card" />
        <Button type="submit" variant="outline" disabled={pendiente}>
          {pendiente ? <LoaderCircle className="animate-spin" /> : <Plus />} Agregar
        </Button>
      </form>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <label className="flex items-center justify-between gap-3">
          <span>Rotación automática entre cuentas</span>
          <input type="checkbox" checked={rotacion} disabled={pendiente} onChange={(e) => iniciar(() => configurarFacebook({ rotacion: e.target.checked }))} className="size-4 accent-primary" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>Pasadas por día por cuenta</span>
          <select
            value={pasadasPorDia}
            disabled={pendiente}
            onChange={(e) => iniciar(() => configurarFacebook({ pasadas_por_dia: Number(e.target.value) }))}
            className="rounded-md border border-border bg-background px-2 py-1"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">Horario: 10:40, 15:40 y 20:40. Si Facebook pide verificación, te llega un aviso y la cuenta queda para reconectar.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
