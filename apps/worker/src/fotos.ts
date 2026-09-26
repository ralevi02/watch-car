import sharp from "sharp";
import type { ClienteDb } from "@radar/db";

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

/** Calcula el hash de la foto principal de los avisos que aún no lo tienen. */
export async function hashearFotos(db: ClienteDb, avisoIds: string[]): Promise<number> {
  if (!avisoIds.length) return 0;
  const { data } = await db.from("avisos").select("id, foto_url").in("id", avisoIds).is("foto_hash", null).not("foto_url", "is", null);
  let hechos = 0;
  for (const a of data ?? []) {
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
