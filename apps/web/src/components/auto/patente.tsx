import { ExternalLink } from "lucide-react";

const CONSULTAS = [
  { nombre: "Encargo por robo", nota: "Auto Seguro, gratis", url: "https://www.autoseguro.gob.cl/" },
  { nombre: "Revisión técnica", nota: "PRT, gratis", url: "https://www.prt.cl/Paginas/RevisionTecnica.aspx" },
  { nombre: "Dueños y prendas", nota: "Certificado de anotaciones vigentes, Registro Civil", url: "https://www.chileatiende.gob.cl/fichas/3370-certificado-de-anotaciones-vigentes-de-vehiculos-motorizados" },
  { nombre: "Multas impagas", nota: "Certificado del Registro Civil", url: "https://www.chileatiende.gob.cl/fichas/3439-certificado-de-multas-de-transito-no-pagadas" },
  { nombre: "¿Salió de remate?", nota: "Asociación de Aseguradoras", url: "https://www.aach.cl/conRemate" },
];

/** La patente (si se conoce) y los sitios oficiales para revisarla. La patente se copia al tocarla. */
export function Patente({ patente }: { patente: string | null | undefined }) {
  const copiar = () => patente && navigator.clipboard?.writeText(patente).catch(() => {});
  return (
    <section className="mt-7">
      <h2 className="titulo-grupo !ml-0">Revisar la patente</h2>
      {patente ? (
        <button type="button" onClick={copiar} className="presionable mb-2 inline-flex h-10 items-center rounded-lg border-2 border-foreground px-3 text-[17px] font-bold tracking-[2px] tabular-nums">
          {patente.replace(/^([A-Z]{2})([A-Z]{2}|\d{2})(\d{2})$/, "$1·$2·$3")}
        </button>
      ) : (
        <p className="mb-2 text-[14px] text-muted-foreground">El aviso no muestra la patente: pídesela al vendedor antes de ir a verlo.</p>
      )}
      <div className="flex flex-col divide-y divide-separador">
        {CONSULTAS.map((c) => (
          <a key={c.nombre} href={c.url} target="_blank" rel="noopener noreferrer" onClick={copiar} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex flex-col">
              <span className="text-[15px]">{c.nombre}</span>
              <span className="text-[12.5px] text-tenue">{c.nota}</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-tenue" strokeWidth={2} />
          </a>
        ))}
      </div>
      {patente && <p className="pie-grupo !mx-0">Al abrir un sitio, la patente queda copiada para pegarla.</p>}
    </section>
  );
}
