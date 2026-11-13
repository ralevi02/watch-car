"use client";

import { useEffect, useState } from "react";
import { borrarSuscripcion, estadoPruebaAvisos, guardarSuscripcion, probarAvisos } from "@/app/(app)/acciones";
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
  const [prueba, setPrueba] = useState<string | null>(null);

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

  async function mandarPrueba() {
    setPrueba("Pidiendo al homelab…");
    const r = await probarAvisos();
    if (!r.ok) return setPrueba(r.error);
    for (let i = 0; i < 20; i++) {
      await new Promise((listo) => setTimeout(listo, 3000));
      const e = await estadoPruebaAvisos(r.id);
      if (e.estado === "ok") return setPrueba("Enviada. Si no aparece en unos segundos, revisa que el teléfono permita las notificaciones de Chrome.");
      if (e.estado === "error") return setPrueba(`No se pudo mandar: ${e.error ?? "error desconocido"}`);
    }
    setPrueba("El homelab no la tomó en un minuto: puede estar apagado o sin conexión.");
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
      {estado === "activo" && (
        <div className="lista-ios">
          <button type="button" className="fila-ios w-full text-left text-primary" onClick={mandarPrueba} disabled={prueba === "Pidiendo al homelab…"}>
            Mandar una prueba
          </button>
        </div>
      )}
      {prueba && <p className="pie-grupo">{prueba}</p>}
    </>
  );
}
