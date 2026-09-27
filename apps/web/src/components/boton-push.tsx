"use client";

import { useEffect, useState } from "react";
import { borrarSuscripcion, guardarSuscripcion } from "@/app/(app)/acciones";
import { Interruptor } from "@/components/ui/interruptor";

const aBytes = (b64: string) => {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

type Estado = "cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo";

/** Fila "Avisos en este teléfono" con interruptor: suscribe o borra este dispositivo. */
export function BotonPush() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setEstado("no-soportado");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.ready;
      setEstado((await reg.pushManager.getSubscription()) ? "activo" : "inactivo");
    })().catch(() => setEstado("no-soportado"));
  }, []);

  async function cambiar(activar: boolean) {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (activar) {
        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") return setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
        const r = await guardarSuscripcion(sub.toJSON());
        if (!r.ok) throw new Error(r.error);
        setEstado("activo");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await borrarSuscripcion(sub.endpoint);
          await sub.unsubscribe();
        }
        setEstado("inactivo");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEstado("inactivo");
    }
  }

  return (
    <>
      <div className="lista-ios">
        <label className="fila-ios justify-between">
          <span>Avisos en este teléfono</span>
          {estado === "no-soportado" || estado === "bloqueado" ? (
            <span className="text-muted-foreground">{estado === "bloqueado" ? "Bloqueados" : "No disponible"}</span>
          ) : (
            <Interruptor activo={estado === "activo"} deshabilitado={estado === "cargando"} etiqueta="Avisos en este teléfono" onCambio={cambiar} />
          )}
        </label>
      </div>
      <p className="pie-grupo">
        {estado === "bloqueado"
          ? "Las notificaciones están bloqueadas para esta app: actívalas en los ajustes del teléfono."
          : estado === "no-soportado"
            ? "Este navegador no las soporta. En iPhone, agrega la app a la pantalla de inicio y ábrela desde ahí."
            : "Autos nuevos que calzan, bajas de precio y cuando un portal bloquea la búsqueda."}
        {error && <span className="block text-destructive">{error}</span>}
      </p>
    </>
  );
}
