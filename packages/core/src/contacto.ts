/** Cómo contactar al vendedor, sacado del portal o de la descripción. */
export interface Contacto {
  /** En formato internacional: +56912345678 o +56223456789. */
  telefono?: string;
  email?: string;
  /** Código que pide la automotora al llamar (Chileautos). */
  codigo?: string;
  /** El portal muestra solo parte del número (Chileautos a particulares, sin sesión). */
  parcial?: string;
  /** Año en que el vendedor se unió a Facebook. */
  cuentaDesde?: number;
}

/** "+56 9 1234 5678", "9 1234 5678", "(2) 2345 6789" → "+56912345678" / "+56223456789". */
export function normalizarTelefono(s: string): string | null {
  const d = s.replace(/\D/g, "").replace(/^0+/, "");
  const sin56 = d.startsWith("56") && d.length === 11 ? d.slice(2) : d;
  if (sin56.length !== 9) return null;
  // Celulares empiezan con 9; fijos con el código de área (2 Santiago, 32 Valparaíso, 41 Concepción...).
  if (!/^[2-9]/.test(sin56)) return null;
  return `+56${sin56}`;
}

const RE_TEL = /(?:\+?56[\s.-]?)?(?:\(?0?\d\)?[\s.-]?)?\d[\d\s.-]{7,11}\d/g;
const RE_MAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Teléfonos y correos escritos en un texto (sin años, precios ni km). */
export function contactosEnTexto(texto: string | null | undefined): { telefonos: string[]; emails: string[] } {
  const t = texto ?? "";
  const telefonos = new Set<string>();
  for (const m of t.matchAll(RE_TEL)) {
    const bruto = m[0];
    // Precios ("$12.500.000") y km ("120.000 km") no son teléfonos.
    const antes = t.slice(Math.max(0, (m.index ?? 0) - 2), m.index);
    const despues = t.slice((m.index ?? 0) + bruto.length, (m.index ?? 0) + bruto.length + 4);
    if (/\$\s*$/.test(antes) || /^\s*(km|kms|mil)/i.test(despues) || /^\d{1,3}(\.\d{3})+$/.test(bruto.trim())) continue;
    const n = normalizarTelefono(bruto);
    if (n) telefonos.add(n);
  }
  const emails = [...new Set([...t.matchAll(RE_MAIL)].map((m) => m[0].toLowerCase()))];
  return { telefonos: [...telefonos], emails };
}

/** Celular (sirve para WhatsApp). */
export const esCelular = (tel: string) => /^\+569\d{8}$/.test(tel);
