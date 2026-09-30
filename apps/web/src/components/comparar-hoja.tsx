"use client";

import { Car, X } from "lucide-react";
import { useEffect } from "react";
import { lecturaPrecio } from "@/components/auto/precio-justo";
import { Hoja } from "@/components/ui/hoja";
import { useAlmacen } from "@/lib/almacen";
import type { ResultadoAuto } from "@/lib/datos";
import { useComparar } from "@/lib/comparar";
import { distanciaDeCasa } from "@/lib/lugares";
import { caja, lugar, miles, millones, tituloAuto } from "@/lib/presentar";
import { cn } from "@/lib/utils";
import { checklist } from "@/lib/visita";

type Fila = { etiqueta: string; valor: (r: ResultadoAuto) => string; numero?: (r: ResultadoAuto) => number | null; mejor?: "menor" | "mayor" };

/** Los autos elegidos, lado a lado: lo mejor de cada fila en verde, lo peor en ámbar. */
export function CompararHoja({ abierta, onCerrar, abrir }: { abierta: boolean; onCerrar: () => void; abrir: (id: string) => void }) {
  const { datos, detalles, pedirDetalle } = useAlmacen();
  const { ids, alternar } = useComparar();
  const todos = [...(datos?.resultados ?? []), ...(datos?.casi ?? [])];
  const autos = ids.map((id) => todos.find((r) => r.autoId === id)).filter((r): r is ResultadoAuto => Boolean(r));
  const casa = datos?.ajustes?.casa?.comuna ?? null;

  // Lo que dijo el vendedor y la visita vienen en el detalle de cada auto.
  useEffect(() => {
    if (abierta) for (const r of autos) pedirDetalle(r.autoId);
  }, [abierta, autos.map((r) => r.autoId).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const dijo = (r: ResultadoAuto, campo: string) => detalles[r.autoId]?.llamadas.map((l) => l.datos[campo]).filter(Boolean).at(-1) ?? "";
  const visita = (r: ResultadoAuto) => {
    const items = Object.values(detalles[r.autoId]?.visita.items ?? {});
    const total = checklist(r).reduce((t, g) => t + g.items.length, 0);
    if (!items.some((x) => x.estado)) return "";
    const mal = items.filter((x) => x.estado === "mal").length;
    const ojo = items.filter((x) => x.estado === "ojo").length;
    return `${items.filter((x) => x.estado).length}/${total} revisados${mal ? `, ${mal} mal` : ""}${ojo ? `, ${ojo} ojo` : ""}`;
  };
  const dias = (r: ResultadoAuto) => Math.floor((Date.now() - new Date(r.enlaces.reduce((m, e) => (e.primeraVez < m ? e.primeraVez : m), r.primeraVez)).getTime()) / 86_400_000);

  const filas: Fila[] = [
    { etiqueta: "Precio", valor: (r) => (r.precio !== null ? millones(r.precio) : "?"), numero: (r) => r.precio, mejor: "menor" },
    { etiqueta: "Frente al normal", valor: (r) => lecturaPrecio(r)?.texto ?? "Sin datos", numero: (r) => (r.justo && r.precio !== null ? r.precio - r.justo.precio : null), mejor: "menor" },
    { etiqueta: "Año", valor: (r) => String(r.anio ?? "?"), numero: (r) => r.anio, mejor: "mayor" },
    { etiqueta: "Km", valor: (r) => (r.km !== null ? miles(r.km) : "?"), numero: (r) => r.km, mejor: "menor" },
    { etiqueta: "Versión", valor: (r) => [r.version && r.version !== "No declarada" ? r.version : null, r.motor].filter(Boolean).join(" ") || "?" },
    { etiqueta: "Caja", valor: (r) => caja(r.caja) ?? "?" },
    { etiqueta: "Tracción", valor: (r) => (r.traccion === "AWD" ? "AWD" : r.traccion ? "4x2" : "?") },
    { etiqueta: "Vende", valor: (r) => (r.tipoVendedor === "automotora" ? "Automotora" : r.tipoVendedor === "particular" ? "Particular" : "?") },
    { etiqueta: "Dónde", valor: (r) => [lugar(r), distanciaDeCasa(r, casa)?.texto].filter(Boolean).join(", ") || "?", numero: (r) => distanciaDeCasa(r, casa)?.km ?? null, mejor: "menor" },
    { etiqueta: "Publicado hace", valor: (r) => (dias(r) === 0 ? "hoy" : `${dias(r)} ${dias(r) === 1 ? "día" : "días"}`), numero: dias, mejor: "mayor" },
    { etiqueta: "Dueños", valor: (r) => dijo(r, "duenos") },
    { etiqueta: "Mantenciones", valor: (r) => dijo(r, "mantenciones") },
    { etiqueta: "Visita", valor: visita },
    { etiqueta: "Para revisar", valor: (r) => [...(r.senales ?? []), ...(r.remate ? ["Remate"] : [])].join(", ") },
  ];
  // Filas sin nada que mostrar en ningún auto se esconden.
  const visibles = filas.filter((f) => autos.some((r) => f.valor(r)));

  const tono = (f: Fila, r: ResultadoAuto) => {
    if (!f.numero || !f.mejor || autos.length < 2) return "";
    const nums = autos.map(f.numero).filter((x): x is number => x !== null);
    const n = f.numero(r);
    if (n === null || nums.length < 2 || Math.min(...nums) === Math.max(...nums)) return "";
    const mejor = f.mejor === "menor" ? Math.min(...nums) : Math.max(...nums);
    const peor = f.mejor === "menor" ? Math.max(...nums) : Math.min(...nums);
    return n === mejor ? "text-calza font-semibold" : n === peor ? "text-advertencia" : "";
  };

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Comparar" derecha={<button type="button" onClick={onCerrar}>Listo</button>}>
      <div className="pb-[calc(20px+env(safe-area-inset-bottom))]">
        {autos.length < 2 && <p className="px-5 pb-3 text-[14px] text-muted-foreground">Agrega otro auto desde su detalle (botón «Comparar») para verlos lado a lado.</p>}
        <div className="overflow-x-auto px-5">
          <table className="w-full min-w-[340px] table-fixed border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="w-[92px]" />
                {autos.map((r) => (
                  <th key={r.autoId} className="px-1.5 pb-3 text-left align-top font-normal">
                    <div className="relative">
                      <button type="button" onClick={() => abrir(r.autoId)} className="block w-full overflow-hidden rounded-xl bg-card" aria-label={`Abrir ${tituloAuto(r)}`}>
                        {r.foto ? <img src={r.foto} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center text-tenue"><Car className="size-7" /></div>}
                      </button>
                      <button type="button" onClick={() => alternar(r.autoId)} aria-label="Quitar de la comparación" className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/45 text-white">
                        <X className="size-4" strokeWidth={2.2} />
                      </button>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-[17px]">{tituloAuto(r)}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.etiqueta} className="border-t border-separador">
                  <th className="py-2.5 pr-2 text-left align-top text-[13px] font-normal text-muted-foreground">{f.etiqueta}</th>
                  {autos.map((r) => (
                    <td key={r.autoId} className={cn("px-1.5 py-2.5 align-top leading-[19px]", tono(f, r))}>
                      {f.valor(r) || <span className="text-tenue">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Hoja>
  );
}
