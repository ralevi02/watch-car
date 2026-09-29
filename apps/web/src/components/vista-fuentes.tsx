"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { salir } from "@/app/(app)/acciones";
import { AjustesAvisos, TuComuna } from "@/components/ajustes-avisos";
import { Apariencia } from "@/components/apariencia";
import { Gastos } from "@/components/gastos";
import { BotonPush } from "@/components/boton-push";
import { ConectarGithub } from "@/components/conectar-github";
import { AvisoCorridas, BotonCorrer, BotonCorrerTodas, EstadoFuente, ProveedorCorridas } from "@/components/corridas";
import { CuentasFacebook } from "@/components/cuentas-facebook";
import { Encabezado } from "@/components/encabezado";
import { InterruptorFuente } from "@/components/interruptor-fuente";
import { Pantalla } from "@/components/pantalla";
import { borrarGuardado, useAlmacen } from "@/lib/almacen";
import { NOMBRE_FUENTE } from "@/lib/presentar";
import type { FuenteCorrible } from "@/lib/github";
import { cn } from "@/lib/utils";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  ok: { texto: "Bien", clase: "text-calza" },
  corriendo: { texto: "Corriendo", clase: "text-muted-foreground" },
  bloqueo: { texto: "Bloqueo", clase: "text-destructive" },
  error: { texto: "Error", clase: "text-destructive" },
};

const HORARIO: Record<string, string> = {
  chileautos: "cada 3 horas de 8:00 a 23:00",
  kavak: "2 veces al día, necesita proxy",
  yapo: "2 veces al día, necesita proxy",
  mercadolibre: "2 veces al día",
  brunofritsch: "2 veces al día, Volvo usados de la automotora",
};

/** Por qué falló la última pasada, en corto. */
const motivo = (p: { estado: string; detalle: unknown }) => {
  if (p.estado === "ok" || p.estado === "corriendo") return null;
  const d = (p.detalle ?? {}) as { errores?: string[]; bloqueo?: string };
  const m = d.bloqueo ?? d.errores?.[0];
  return m?.includes("PROXY_URL") || m?.includes("proxy residencial") ? "Bloquea las IPs de GitHub: necesita proxy" : (m ?? null);
};

const fecha = (s: string) => new Date(s).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Fuentes: portales, Facebook, avisos, GitHub y el registro. Lee del almacén del teléfono. */
export function VistaFuentes() {
  const ml = useSearchParams().get("ml");
  const { datos } = useAlmacen();
  if (!datos) {
    return (
      <>
        <Encabezado titulo="Fuentes" />
        <main className="flex flex-col gap-3 px-5 pt-2" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[14px] bg-card" />
          ))}
        </main>
      </>
    );
  }
  const { fuentes, pasadas, mlConectado, githubConectado } = datos.fuentes;
  const facebook = datos.facebook;
  const ultima = (id: string) => pasadas.find((p) => p.fuente_id === id);
  const portales = fuentes.filter((f) => f.id !== "facebook");

  return (
    <ProveedorCorridas conGithub={githubConectado}>
      <Encabezado titulo="Fuentes">
        <BotonCorrerTodas />
      </Encabezado>
      <Pantalla>
        <main className="flex flex-col gap-7 px-5 pb-10 pt-2">
          <AvisoCorridas />
          <section>
            <h2 className="titulo-grupo">Portales</h2>
            <div className="lista-ios">
              {portales.map((f) => {
                const u = ultima(f.id);
                return (
                  <div key={f.id} className="fila-ios justify-between gap-3">
                    <span className="flex min-w-0 flex-grow flex-col">
                      <span>{f.nombre}</span>
                      <span className="text-[13px] leading-[18px] text-muted-foreground">
                        <EstadoFuente fuente={f.id as FuenteCorrible}>
                          {u ? (
                            <>
                              <span className={ESTADO[u.estado]?.clase}>{ESTADO[u.estado]?.texto ?? u.estado}</span> · {fecha(u.inicio)}
                              {motivo(u) && <span className="block truncate text-destructive">{motivo(u)}</span>}
                            </>
                          ) : (
                            HORARIO[f.id]
                          )}
                        </EstadoFuente>
                      </span>
                    </span>
                    {f.id === "mercadolibre" && !mlConectado ? (
                      <a href="/api/mercadolibre/conectar" className="presionable shrink-0 text-primary">
                        Conectar
                      </a>
                    ) : (
                      <>
                        {f.activa && <BotonCorrer fuente={f.id as FuenteCorrible} nombre={f.nombre} />}
                        <InterruptorFuente id={f.id as "chileautos" | "kavak" | "yapo" | "mercadolibre" | "brunofritsch"} activa={f.activa} nombre={f.nombre} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {ml === "ok" && <p className="pie-grupo text-calza">MercadoLibre quedó conectado.</p>}
            {ml === "error" && <p className="pie-grupo text-destructive">No se pudo conectar MercadoLibre. Intenta de nuevo.</p>}
            {ml === "falta-config" && <p className="pie-grupo text-destructive">Falta ML_CLIENT_ID en la configuración de la app.</p>}
          </section>

          <CuentasFacebook {...facebook} />

          <section>
            <h2 className="titulo-grupo">Notificaciones</h2>
            <BotonPush />
            <AjustesAvisos />
          </section>

          <TuComuna />

          <Apariencia />

          <Gastos />

          <ConectarGithub conectado={githubConectado} />

          <section>
            <h2 className="titulo-grupo">Registro de pasadas</h2>
            <div className="lista-ios">
              {pasadas.length === 0 && <div className="fila-ios text-muted-foreground">Todavía no corre ninguna pasada.</div>}
              {pasadas.map((p) => {
                const d = (p.detalle ?? {}) as { run?: string; errores?: string[]; bloqueo?: string; nota?: string; diagnostico_ia?: string | null };
                const contenido = (
                  <>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        {NOMBRE_FUENTE[p.fuente_id] ?? p.fuente_id}
                        {p.busquedas?.nombre ? `, ${p.busquedas.nombre}` : ""}
                      </span>
                      <span className="text-[13px] leading-[18px] text-muted-foreground">
                        {fecha(p.inicio)} · {p.avisos_vistos ?? 0} vistos, {p.avisos_nuevos ?? 0} nuevos
                      </span>
                      {Boolean(d.bloqueo || d.errores?.length) && <span className="text-[13px] leading-[18px] text-destructive">{[d.bloqueo, ...(d.errores ?? [])].filter(Boolean).join(". ")}</span>}
                      {d.nota && <span className="text-[13px] leading-[18px] text-muted-foreground">{d.nota}</span>}
                      {d.diagnostico_ia && <span className="text-[13px] leading-[18px] text-advertencia">La IA cree que: {d.diagnostico_ia}</span>}
                    </span>
                    <span className={cn("flex shrink-0 items-center gap-1 text-[15px]", ESTADO[p.estado]?.clase)}>
                      {ESTADO[p.estado]?.texto ?? p.estado}
                      {d.run && <ChevronRight className="size-5 text-tenue" strokeWidth={2.4} />}
                    </span>
                  </>
                );
                return d.run ? (
                  <a key={p.id} href={d.run} target="_blank" rel="noopener noreferrer" className="fila-ios justify-between active:bg-presion">
                    {contenido}
                  </a>
                ) : (
                  <div key={p.id} className="fila-ios justify-between">
                    {contenido}
                  </div>
                );
              })}
            </div>
          </section>

          {/* El form va adentro: Next le agrega inputs ocultos que moverían la línea separadora. */}
          <div className="lista-ios">
            <form action={salir} onSubmit={borrarGuardado}>
              <button type="submit" className="fila-ios w-full justify-center text-destructive active:bg-presion">
                <LogOut className="size-5" /> Cerrar sesión
              </button>
            </form>
          </div>
        </main>
      </Pantalla>
    </ProveedorCorridas>
  );
}
