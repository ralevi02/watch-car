import type { Seguimiento } from "@radar/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Rango = Seguimiento["anio"];

const miles = (n: number) => n.toLocaleString("es-CL");
const pesos = (n: number) => `$${miles(n)}`;

function describirRango(r: Rango, f: (n: number) => string, unidad = ""): string | null {
  const u = unidad ? ` ${unidad}` : "";
  const partes: string[] = [];
  if (r.min !== undefined && r.max !== undefined) partes.push(`${f(r.min)} a ${f(r.max)}${u}`);
  else if (r.min !== undefined) partes.push(`desde ${f(r.min)}${u}`);
  else if (r.max !== undefined) partes.push(`hasta ${f(r.max)}${u}`);
  if (r.maxConAdvertencia !== undefined) partes.push(`con advertencia hasta ${f(r.maxConAdvertencia)}${u}`);
  return partes.length ? partes.join(" · ") : null;
}

const NOMBRE_FUENTE: Record<Seguimiento["fuentes"][number], string> = {
  chileautos: "Chileautos",
  facebook: "Facebook",
  mercadolibre: "MercadoLibre",
  kavak: "Kavak",
  yapo: "Yapo",
};

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function FichaCard({ ficha, pie }: { ficha: Seguimiento; pie?: React.ReactNode }) {
  const motor = [
    ficha.motoresIncluidos.length ? `solo ${ficha.motoresIncluidos.join(", ")}` : null,
    ficha.motoresExcluidos.length ? `sin ${ficha.motoresExcluidos.join(", ")}` : null,
  ].filter(Boolean);

  return (
    <Card className="w-full ring-border">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Ficha de seguimiento</p>
        <CardTitle className="font-heading text-xl font-bold">{ficha.nombre}</CardTitle>
        <CardDescription>
          {ficha.marca} {ficha.modelo}
          {ficha.modeloPortal && ficha.modeloPortal !== ficha.modelo && ` · se busca como "${ficha.modeloPortal}"`}
        </CardDescription>
        {ficha.alias.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ficha.alias.map((a) => (
              <Badge key={a} variant="secondary">
                {a}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">
          <Fila etiqueta="Año">{describirRango(ficha.anio, String) ?? "Cualquiera"}</Fila>
          <Fila etiqueta="Kilometraje">{describirRango(ficha.km, miles, "km") ?? "Cualquiera"}</Fila>
          <Fila etiqueta="Precio">{describirRango(ficha.precio, pesos) ?? "Cualquiera"}</Fila>
          <Fila etiqueta="Motor">{motor.length ? motor.join(" · ") : "Cualquiera"}</Fila>
          <Fila etiqueta="Tracción">{ficha.traccion === "cualquiera" ? "Cualquiera" : ficha.traccion}</Fila>
          <Fila etiqueta="Caja">{ficha.caja === "cualquiera" ? "Cualquiera" : ficha.caja === "automatica" ? "Automática" : "Manual"}</Fila>
          <Fila etiqueta="Zona">{ficha.regiones.length ? ficha.regiones.join(", ") : "Todo Chile"}</Fila>
          <Fila etiqueta="Fuentes">
            <span className="flex flex-wrap gap-1.5">
              {ficha.fuentes.map((f) => (
                <Badge key={f} variant="outline">
                  {NOMBRE_FUENTE[f]}
                </Badge>
              ))}
            </span>
          </Fila>
          <Fila etiqueta="Revisión">cada {ficha.frecuenciaHoras} h</Fila>
          {ficha.notas && <Fila etiqueta="Notas">{ficha.notas}</Fila>}
        </dl>
      </CardContent>
      {pie && <CardFooter className="py-3">{pie}</CardFooter>}
    </Card>
  );
}
