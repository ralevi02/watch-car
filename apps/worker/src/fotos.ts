import { createHash } from "node:crypto";
import sharp from "sharp";
import type { ClienteDb } from "@radar/db";

const BUCKET = "fotos";
const CADUCA = /fbcdn\.net/;

export const esCopiaPropia = (url: string | null | undefined) => Boolean(url?.includes(`/storage/v1/object/public/${BUCKET}/`));

/**
 * dHash de 64 bits: la foto se achica a 9×8 en grises y cada bit dice si un
 * pixel es más claro que el de su derecha. Fotos iguales (aunque cambie el
 * tamaño, la compresión o una marca de agua chica) dan hashes casi iguales.
 */
export async function dHash(imagen: Buffer): Promise<string> {
  const px = await sharp(imagen).flatten({ background: "#ffffff" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x]! > px[y * 9 + x + 1]! ? "1" : "0";
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

async function enTrozos<T>(ids: string[], consulta: (trozo: string[]) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const filas: T[] = [];
  for (let i = 0; i < ids.length; i += 200) filas.push(...((await consulta(ids.slice(i, i + 200))).data ?? []));
  return filas;
}

/** Calcula el hash de la foto principal de los avisos que aún no lo tienen. */
export async function hashearFotos(db: ClienteDb, avisoIds: string[]): Promise<number> {
  if (!avisoIds.length) return 0;
  const data = await enTrozos(avisoIds, (trozo) => db.from("avisos").select("id, foto_url").in("id", trozo).is("foto_hash", null).not("foto_url", "is", null));
  let hechos = 0;
  for (const a of data) {
    try {
      const r = await fetch(a.foto_url!, { headers: { Accept: "image/jpeg,image/webp,image/*" }, signal: AbortSignal.timeout(15_000) });
      if (!r.ok) continue;
      const hash = await dHash(Buffer.from(await r.arrayBuffer()));
      await db.from("avisos").update({ foto_hash: hash }).eq("id", a.id);
      hechos++;
    } catch {
      /* foto caída o formato raro: se deduplica solo por reglas */
    }
  }
  return hechos;
}

async function bajar(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { headers: { Accept: "image/jpeg,image/webp,image/*" }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * Los links de las fotos de Facebook vencen a las pocas semanas: se guarda una
 * copia en el bucket público "fotos" (webp de 960 px) y el aviso apunta a ella.
 */
export async function copiarFotos(db: ClienteDb, fuente: string, externos: string[]): Promise<number> {
  if (!externos.length) return 0;
  const data = await enTrozos(externos, (trozo) => db.from("avisos").select("id, foto_url, fotos, foto_hash").eq("fuente_id", fuente).in("id_externo", trozo));
  let copiadas = 0;
  for (const a of data) {
    const originales = [...new Set([a.foto_url, ...(a.fotos ?? [])].filter((u): u is string => Boolean(u && CADUCA.test(u))))].slice(0, 10);
    if (!originales.length) continue;
    const nuevas = new Map<string, string>();
    let hash = a.foto_hash;
    for (const url of originales) {
      const imagen = await bajar(url);
      if (!imagen) continue;
      try {
        const webp = await sharp(imagen).rotate().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
        const ruta = `${a.id}/${createHash("sha1").update(url.split("?")[0]!).digest("hex").slice(0, 16)}.webp`;
        const { error } = await db.storage.from(BUCKET).upload(ruta, webp, { contentType: "image/webp", upsert: true });
        if (error) continue;
        nuevas.set(url, db.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl);
        if (url === a.foto_url && !hash) hash = await dHash(imagen);
        copiadas++;
      } catch {
        /* formato raro: queda el link original */
      }
    }
    if (!nuevas.size) continue;
    await db
      .from("avisos")
      .update({
        foto_url: (a.foto_url && nuevas.get(a.foto_url)) ?? a.foto_url,
        ...(a.fotos?.length ? { fotos: a.fotos.map((u) => nuevas.get(u) ?? u) } : {}),
        ...(hash ? { foto_hash: hash } : {}),
      })
      .eq("id", a.id);
  }
  return copiadas;
}
