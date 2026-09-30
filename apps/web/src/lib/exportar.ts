import type { ResultadoAuto } from "@/lib/datos";
import { NOMBRE_FUENTE, tituloAuto } from "@/lib/presentar";

const celda = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Planilla (CSV con ; para que Excel en español la abra bien) con los autos que se ven. */
export function aCsv(autos: ResultadoAuto[]): string {
  const cab = ["Auto", "Año", "Km", "Precio", "Precio normal", "Caja", "Tracción", "Comuna", "Vende", "Veredicto", "En qué va", "Nota", "Portal", "Link"];
  const filas = autos.map((r) => {
    const e = r.enlaces.find((x) => x.id === r.avisoPrincipal) ?? r.enlaces[0];
    return [
      [r.marcaAuto, tituloAuto(r)].filter(Boolean).join(" "),
      r.anio,
      r.km,
      r.precio,
      r.justo?.precio,
      r.caja,
      r.traccion,
      r.comuna ?? r.region,
      r.tipoVendedor,
      r.veredicto === "calza" ? "Calza" : "Revisar",
      r.marca?.contacto,
      r.marca?.nota,
      e ? (NOMBRE_FUENTE[e.fuente] ?? e.fuente) : "",
      e?.url,
    ];
  });
  return "﻿" + [cab, ...filas].map((f) => f.map(celda).join(";")).join("\n");
}

/** Comparte la planilla (Android ofrece guardarla o mandarla) o la descarga. */
export async function compartirCsv(autos: ResultadoAuto[]) {
  const archivo = new File([aCsv(autos)], `radar-autos-${new Date().toISOString().slice(0, 10)}.csv`, { type: "text/csv" });
  if (navigator.canShare?.({ files: [archivo] })) {
    await navigator.share({ files: [archivo], title: "Autos de Radar" }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(archivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
