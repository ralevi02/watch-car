import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormOpinion } from "@/components/form-opinion";
import { fotoGrande } from "@/lib/fotos";
import { caja, miles, NOMBRE_FUENTE, pesos } from "@/lib/presentar";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "¿Qué te parece este auto?", robots: { index: false, follow: false } };

interface AvisoPublico {
  fuente: string;
  url: string;
  titulo: string;
  precio: number | null;
  anio: number | null;
  km: number | null;
  modelo: string | null;
  version: string | null;
  motor: string | null;
  caja: string | null;
  traccion: string | null;
  comuna: string | null;
  region: string | null;
  vendedor: string | null;
  descripcion: string | null;
  foto: string | null;
  fotos: string[] | null;
  estado: string;
}
interface OpinionPublica {
  nombre: string;
  voto: string;
  texto: string | null;
  creada_en: string;
}

const VOTO: Record<string, string> = { me_gusta: "Me gusta", no_me_convence: "No me convence", dudas: "Tengo dudas" };

/** Un auto compartido para que alguien (pareja, mecánico) lo vea y opine. Sin notas ni datos privados. */
export default async function AutoCompartido({ params }: PageProps<"/v/[token]">) {
  const { token } = await params;
  if (!/^[0-9a-f]{24}$/.test(token)) notFound();
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("auto_publico", { p_token: token });
  const d = data as { avisos: AvisoPublico[]; opiniones: OpinionPublica[] } | null;
  const a = d?.avisos[0];
  if (!d || !a) notFound();

  const fotos = [...new Set(d.avisos.flatMap((x) => (x.fotos?.length ? x.fotos : x.foto ? [x.foto] : [])))].slice(0, 12);
  const titulo = [a.modelo ?? a.titulo, a.version && a.version !== "No declarada" ? a.version : null, a.motor].filter(Boolean).join(" ");
  const filas = [
    ["Año", a.anio],
    ["Km", a.km !== null ? miles(a.km) : null],
    ["Caja", caja(a.caja)],
    ["Tracción", a.traccion === "AWD" ? "AWD" : a.traccion ? "4x2" : null],
    ["Dónde", a.comuna ?? a.region],
    ["Vende", a.vendedor === "automotora" ? "Automotora" : a.vendedor === "particular" ? "Particular" : null],
  ].filter((f): f is [string, string | number] => f[1] !== null && f[1] !== undefined);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-16 pt-[calc(env(safe-area-inset-top)+16px)]">
      <p className="text-[14px] text-muted-foreground">Te compartieron este auto para saber qué opinas.</p>
      {fotos.length > 0 && (
        <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {fotos.map((f) => (
            <img key={f} src={fotoGrande(f) ?? f} alt="" className="aspect-[3/2] w-[88%] shrink-0 snap-center rounded-[14px] bg-card object-cover" />
          ))}
        </div>
      )}
      <h1 className="mt-5 text-[24px] font-bold leading-[29px] tracking-[-0.4px]">{titulo}</h1>
      <p className="mt-1 text-[28px] font-bold tabular-nums tracking-[-0.5px]">{a.precio !== null ? pesos(a.precio) : "Sin precio"}</p>

      <dl className="mt-4 flex flex-col divide-y divide-separador border-y border-separador text-[15px]">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium first-letter:uppercase">{v}</dd>
          </div>
        ))}
      </dl>

      {a.descripcion && <p className="mt-5 line-clamp-[12] whitespace-pre-line text-[15px] leading-[23px] text-suave">{a.descripcion}</p>}

      <div className="mt-5 flex flex-col gap-2">
        {d.avisos.map((x) => (
          <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="presionable flex h-12 items-center justify-between rounded-xl bg-card px-4 text-[15px]">
            <span>Ver en {NOMBRE_FUENTE[x.fuente] ?? x.fuente}</span>
            {x.precio !== null && <span className="tabular-nums text-muted-foreground">{pesos(x.precio)}</span>}
          </a>
        ))}
      </div>

      <section className="mt-9">
        <h2 className="text-[19px] font-semibold">¿Qué te parece?</h2>
        {d.opiniones.length > 0 && (
          <div className="mt-3 flex flex-col divide-y divide-separador">
            {d.opiniones.map((o) => (
              <div key={o.creada_en} className="py-3">
                <p className="text-[15px]">
                  <span className="font-semibold">{o.nombre}</span> <span className="text-muted-foreground">{VOTO[o.voto] ?? o.voto}</span>
                </p>
                {o.texto && <p className="mt-0.5 whitespace-pre-line text-[15px] text-suave">{o.texto}</p>}
              </div>
            ))}
          </div>
        )}
        <FormOpinion token={token} />
      </section>
    </main>
  );
}
