import type { ResultadoAuto } from "@/lib/datos";

export interface ItemVisita {
  id: string;
  texto: string;
  ayuda?: string;
}
export interface GrupoVisita {
  titulo: string;
  items: ItemVisita[];
}

/**
 * Qué revisar al ir a ver el auto, según el modelo (del análisis de Volvo:
 * correa por años, Geartronic y Haldex en los AWD, EGR/DPF en los D4, bujes).
 */
export function checklist(r: Pick<ResultadoAuto, "traccion" | "motor" | "caja" | "modelo">): GrupoVisita[] {
  const awd = r.traccion === "AWD" || /cross country/i.test(r.modelo ?? "");
  const diesel = /^D\d/i.test(r.motor ?? "");
  return [
    {
      titulo: "Papeles",
      items: [
        { id: "padron", texto: "Padrón y permiso de circulación al día" },
        { id: "revision", texto: "Revisión técnica vigente" },
        { id: "anotaciones", texto: "Sin multas ni prenda", ayuda: "Certificado de anotaciones vigentes del Registro Civil" },
        { id: "registros", texto: "Mantenciones con registro", ayuda: "Libro, facturas o historial del concesionario" },
      ],
    },
    {
      titulo: "Por fuera",
      items: [
        { id: "pintura", texto: "Pintura pareja entre paneles", ayuda: "Mirar con luz de lado: un tono distinto es señal de choque" },
        { id: "separaciones", texto: "Separaciones de puertas y capó parejas" },
        { id: "neumaticos", texto: "Neumáticos con desgaste parejo" },
        { id: "vidrios", texto: "Vidrios con la misma marca y año" },
        { id: "bajos", texto: "Bajos sin óxido ni golpes" },
      ],
    },
    {
      titulo: "Motor en frío",
      items: [
        { id: "partida", texto: "Parte bien en frío, sin ruidos raros", ayuda: "Pedir que no lo enciendan antes de que llegues" },
        { id: "humo", texto: "Sin humo azul ni negro al acelerar" },
        { id: "fugas", texto: "Sin fugas de aceite ni refrigerante" },
        { id: "correa", texto: "Correa de distribución: fecha o km del último cambio", ayuda: "Vence por años, no solo por km" },
        ...(diesel ? [{ id: "egr", texto: "EGR y DPF sin testigos ni pérdida de fuerza" }] : []),
      ],
    },
    {
      titulo: "Manejando",
      items: [
        { id: "caja", texto: r.caja === "manual" ? "Embrague y cambios suaves" : "Caja: cambios suaves, sin golpes ni patinazos", ayuda: r.caja === "manual" ? undefined : "Preguntar por el cambio de aceite de la Geartronic" },
        ...(awd ? [{ id: "haldex", texto: "AWD: sin ruidos al girar cerrado", ayuda: "Preguntar por el aceite del Haldex" }] : []),
        { id: "frenos", texto: "Frena derecho, sin vibraciones" },
        { id: "direccion", texto: "Dirección sin juego ni ruidos" },
        { id: "suspension", texto: "Sin golpeteos en lomos de toro", ayuda: "Bujes y amortiguadores" },
      ],
    },
    {
      titulo: "Por dentro",
      items: [
        { id: "testigos", texto: "Ninguna luz encendida en el tablero" },
        { id: "aire", texto: "El aire acondicionado enfría" },
        { id: "desgaste", texto: "Volante, pedales y asiento gastados acorde al km" },
        { id: "km", texto: "Km del tablero igual al del aviso" },
      ],
    },
  ];
}
