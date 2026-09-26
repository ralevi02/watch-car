export interface LlamadaRed {
  url: string;
  status: number;
  contentType: string;
  kb: number;
}

export interface MuestraAviso {
  url: string;
  texto?: string;
}

export interface ResultadoPrueba {
  fuente: "chileautos" | "facebook" | "mercadolibre";
  nombre: string;
  url: string;
  urlFinal?: string;
  status?: number;
  titulo?: string;
  /** null = no se detectó bloqueo. */
  bloqueo: string | null;
  /** Solo Facebook: apareció el aviso de "inicia sesión". */
  muroLogin?: boolean;
  avisos: number;
  avisosTrasScroll?: number;
  kb: number;
  ms: number;
  /** Respuestas JSON (XHR/fetch): pistas de la API interna del portal. */
  json: LlamadaRed[];
  muestras: MuestraAviso[];
  notas: string[];
  captura?: string;
  error?: string;
}
