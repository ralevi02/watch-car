import type { Seguimiento } from "@radar/core";

type Rango = Seguimiento["anio"];

const miles = (n: number) => n.toLocaleString("es-CL");
const pesos = (n: number) => `$${miles(n)}`;

function describirRango(r: Rango, f: (n: number) => string, unidad = ""): string | null {
  const u = unidad ? ` ${unidad}` : "";
  const partes: string[] = [];
  if (r.min !== undefined && r.max !== undefined) partes.push(`${f(r.min)} a ${f(r.max)}${u}`);
  else if (r.min !== undefined) partes.push(unidad ? `desde ${f(r.min)}${u}` : `${f(r.min)} o más nuevo`);
  else if (r.max !== undefined) partes.push(`hasta ${f(r.max)}${u}`);
  if (r.maxConAdvertencia !== undefined) partes.push(`con aviso hasta ${f(r.maxConAdvertencia)}${u}`);
  return partes.length ? partes.join(", ") : null;
}

const NOMBRE_FUENTE: Record<Seguimiento["fuentes"][number], string> = {
  chileautos: "Chileautos",
  facebook: "Facebook",
  mercadolibre: "MercadoLibre",
  kavak: "Kavak",
  yapo: "Yapo",
  brunofritsch: "Bruno Fritsch",
};

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="fila-ios items-start justify-between">
      <span className="shrink-0">{etiqueta}</span>
      <span className="text-right text-muted-foreground">{children}</span>
    </div>
  );
}

/** La ficha de un seguimiento como lista agrupada de iOS. */
export function FichaCard({ ficha, pie }: { ficha: Seguimiento; pie?: React.ReactNode }) {
  const motor = [
    ficha.motoresIncluidos.length ? `solo ${ficha.motoresIncluidos.join(", ")}` : null,
    ficha.motoresExcluidos.length ? `sin ${ficha.motoresExcluidos.join(", ")}` : null,
  ].filter(Boolean);

  return (
    <div className="lista-ios">
      <div className="flex flex-col gap-0.5 px-4 pb-2.5 pt-3">
        <span className="text-[13px] text-muted-foreground">Ficha</span>
        <span className="text-[20px] font-semibold leading-6">{ficha.nombre}</span>
        {ficha.alias.length > 0 && <span className="text-[13px] text-muted-foreground">También busca: {ficha.alias.join(", ")}</span>}
      </div>
      <Fila etiqueta="Año">{describirRango(ficha.anio, String) ?? "Cualquiera"}</Fila>
      <Fila etiqueta="Kilometraje">{describirRango(ficha.km, miles, "km") ?? "Cualquiera"}</Fila>
      <Fila etiqueta="Precio">{describirRango(ficha.precio, pesos) ?? "Cualquiera"}</Fila>
      {motor.length > 0 && <Fila etiqueta="Motor">{motor.join(", ")}</Fila>}
      {ficha.traccion !== "cualquiera" && <Fila etiqueta="Tracción">{ficha.traccion}</Fila>}
      {ficha.caja !== "cualquiera" && <Fila etiqueta="Caja">{ficha.caja === "automatica" ? "Automática" : "Manual"}</Fila>}
      <Fila etiqueta="Zona">{ficha.regiones.length ? ficha.regiones.join(", ") : "Todo Chile"}</Fila>
      <Fila etiqueta="Portales">{ficha.fuentes.length === 5 ? "Todos" : ficha.fuentes.map((f) => NOMBRE_FUENTE[f]).join(", ")}</Fila>
      {ficha.notas && <Fila etiqueta="Notas">{ficha.notas}</Fila>}
      {pie && <div className="px-4 py-3">{pie}</div>}
    </div>
  );
}
