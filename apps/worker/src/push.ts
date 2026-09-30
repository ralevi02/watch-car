import webpush from "web-push";
import type { ClienteDb } from "@radar/db";

export interface Notificacion {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva el toque en la notificación (la app o el aviso). */
  url?: string;
  /** Notificaciones con la misma etiqueta se reemplazan en vez de apilarse. */
  etiqueta?: string;
  /** Qué avisa: con avisos en modo "resumen", los nuevos y las bajas chicas esperan al resumen del día. */
  tipo?: "nuevo" | "baja" | "sistema";
  /** Algo que no puede esperar al resumen (una baja fuerte de precio). */
  urgente?: boolean;
}

/** Modo de avisos que eligió el dueño en la app. */
export async function leerModoAvisos(db: ClienteDb): Promise<{ modo: "inmediato" | "resumen"; hora: number }> {
  const { data } = await db.from("ajustes").select("valor").eq("clave", "avisos").maybeSingle();
  const v = (data?.valor ?? {}) as { modo?: string; hora?: number };
  return { modo: v.modo === "resumen" ? "resumen" : "inmediato", hora: typeof v.hora === "number" ? v.hora : 20 };
}

/**
 * Manda notificaciones push a todas las suscripciones guardadas (una por
 * dispositivo). Sin claves VAPID no hace nada. Las suscripciones vencidas se borran.
 */
export async function enviarPush(db: ClienteDb, notis: Notificacion[]): Promise<{ enviadas: number; error?: string }> {
  if (!notis.length) return { enviadas: 0 };
  // PUSH_SECO=1: para probar sin mandar nada al teléfono.
  if (process.env.PUSH_SECO === "1") {
    for (const n of notis) console.log(`[push en seco] ${n.titulo}: ${n.cuerpo}`);
    return { enviadas: 0 };
  }
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return { enviadas: 0, error: "Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY: no se mandaron notificaciones" };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:radar-seminuevos@users.noreply.github.com", publica, privada);

  // Sin que viaje lo interno (tipo, urgente) al teléfono.
  notis = notis.map(({ tipo: _t, urgente: _u, ...n }) => n);
  const { data: subs, error } = await db.from("push_suscripciones").select("id, endpoint, p256dh, auth");
  if (error) return { enviadas: 0, error: `Supabase (suscripciones): ${error.message}` };

  let enviadas = 0;
  for (const s of subs) {
    for (const n of notis) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(n), {
          TTL: 6 * 60 * 60,
        });
        enviadas++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_suscripciones").delete().eq("id", s.id);
          break;
        }
      }
    }
  }
  return { enviadas };
}
