import webpush from "web-push";
import type { ClienteDb } from "@radar/db";

export interface Notificacion {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva el toque en la notificación (la app o el aviso). */
  url?: string;
  /** Notificaciones con la misma etiqueta se reemplazan en vez de apilarse. */
  etiqueta?: string;
}

/**
 * Manda notificaciones push a todas las suscripciones guardadas (una por
 * dispositivo). Sin claves VAPID no hace nada. Las suscripciones vencidas se borran.
 */
export async function enviarPush(db: ClienteDb, notis: Notificacion[]): Promise<{ enviadas: number; error?: string }> {
  if (!notis.length) return { enviadas: 0 };
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return { enviadas: 0, error: "Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY: no se mandaron notificaciones" };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:radar-seminuevos@users.noreply.github.com", publica, privada);

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
