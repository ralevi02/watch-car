"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { borrarSuscripcion, guardarSuscripcion } from "@/app/(app)/acciones";
import { Button } from "@/components/ui/button";

const aBytes = (b64: string) => {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

type Estado = "cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo";

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

  async function activar() {
    setError(null);
    setEstado("cargando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      const r = await guardarSuscripcion(sub.toJSON());
      if (!r.ok) throw new Error(r.error);
      setEstado("activo");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEstado("inactivo");
    }
  }

  async function desactivar() {
    setEstado("cargando");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await borrarSuscripcion(sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("inactivo");
  }

  if (estado === "no-soportado")
    return <p className="text-sm text-muted-foreground">Este navegador no soporta notificaciones. En iPhone, primero agrega la app a la pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí.</p>;
  if (estado === "bloqueado") return <p className="text-sm text-muted-foreground">Las notificaciones están bloqueadas para esta app. Actívalas en los ajustes del navegador o del teléfono.</p>;
  return (
    <div className="flex flex-col gap-1">
      {estado === "activo" ? (
        <Button variant="outline" onClick={desactivar}>
          <BellOff /> Desactivar notificaciones en este dispositivo
        </Button>
      ) : (
        <Button onClick={activar} disabled={estado === "cargando"}>
          {estado === "cargando" ? <LoaderCircle className="animate-spin" /> : <Bell />} Activar notificaciones en este dispositivo
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
