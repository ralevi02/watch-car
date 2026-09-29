"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { buscarLugar, distanciaKm } from "@/lib/comunas";
import type { ResultadoAuto } from "@/lib/datos";
import { lugarDe } from "@/lib/lugares";
import { millones } from "@/lib/presentar";

const temaOscuro = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/** Pines que quedan a menos de esto (en pantalla) se juntan en uno. */
const JUNTAR_PX = 64;

interface Punto {
  r: ResultadoAuto;
  lat: number;
  lon: number;
}

const precio = (r: ResultadoAuto) => (r.precio !== null ? millones(r.precio).replace("$", "") : "?");

/**
 * Los autos en el mapa, en el centro de su comuna. Los pines que se tapan se
 * juntan ("12 autos"): al tocarlos el mapa se acerca, y si están
 * en el mismo punto se abren en círculo. Tocar un precio abre el auto.
 */
export function MapaAutos({ autos, casa, abrir }: { autos: ResultadoAuto[]; casa?: string | null; abrir: (id: string) => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const [mapa, setMapa] = useState<{ L: typeof Leaflet; m: Leaflet.Map } | null>(null);
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;

  // El mapa y su fondo (se cambia si cambia el tema con el mapa abierto).
  useEffect(() => {
    let vivo = true;
    let limpiar: (() => void) | undefined;
    void import("leaflet").then((L) => {
      if (!vivo || !caja.current) return;
      const m = L.map(caja.current, { zoomControl: false }).setView([-33.45, -70.65], 10);
      // Mapas de OpenStreetMap; en oscuro se invierten con un filtro (.mapa-oscuro en globals.css).
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(m);
      const tema = () => caja.current?.classList.toggle("mapa-oscuro", temaOscuro());
      tema();
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", tema);
      const obs = new MutationObserver(tema);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      limpiar = () => {
        mq.removeEventListener("change", tema);
        obs.disconnect();
        m.remove();
      };
      setMapa({ L, m });
    });
    return () => {
      vivo = false;
      limpiar?.();
    };
  }, []);

  const puntos: Punto[] = autos.flatMap((r) => {
    const l = lugarDe(r);
    return l ? [{ r, lat: l.lat, lon: l.lon }] : [];
  });
  const sinLugar = autos.length - puntos.length;
  const lugarCasa = casa ? buscarLugar(casa, null) : null;

  // Encuadre inicial: donde hay más autos (o la casa), no todo Chile por un auto en Arica.
  useEffect(() => {
    if (!mapa || !puntos.length) return;
    const { L, m } = mapa;
    const vecinos = (p: { lat: number; lon: number }) => puntos.filter((q) => distanciaKm(p, q) < 60).length;
    const centro = lugarCasa ?? puntos.reduce((a, b) => (vecinos(b) > vecinos(a) ? b : a));
    const cerca = puntos.filter((p) => distanciaKm(centro, p) < 150);
    const b = L.latLngBounds((cerca.length ? cerca : puntos).map((p) => [p.lat, p.lon] as [number, number]));
    if (lugarCasa) b.extend([lugarCasa.lat, lugarCasa.lon]);
    m.fitBounds(b.pad(0.2), { maxZoom: 12, animate: false });
    // Solo al abrir el mapa o cambiar qué autos se ven.
  }, [mapa, autos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pines, juntados según el zoom.
  useEffect(() => {
    if (!mapa) return;
    const { L, m } = mapa;
    const capa = L.layerGroup().addTo(m);
    let abiertos: Leaflet.LayerGroup | null = null;

    const pin = (html: string, pos: Leaflet.LatLngExpression, titulo: string, alTocar: () => void, clase = "") =>
      L.marker(pos, { icon: L.divIcon({ className: clase, html, iconSize: [0, 0] }), title: titulo, keyboard: true }).on("click", alTocar);

    const pintar = () => {
      capa.clearLayers();
      abiertos?.remove();
      abiertos = null;
      const grupos: { centro: Leaflet.Point; miembros: Punto[] }[] = [];
      for (const p of [...puntos].sort((a, b) => (a.r.precio ?? Infinity) - (b.r.precio ?? Infinity))) {
        const px = m.latLngToLayerPoint([p.lat, p.lon]);
        const g = grupos.find((x) => x.centro.distanceTo(px) < JUNTAR_PX);
        if (g) g.miembros.push(p);
        else grupos.push({ centro: px, miembros: [p] });
      }
      for (const g of grupos) {
        const [primero] = g.miembros;
        if (!primero) continue;
        if (g.miembros.length === 1) {
          const clase = primero.r.veredicto === "calza" ? "calza" : "revisar";
          pin(`<span class="pin-auto pin-${clase}">${precio(primero.r)}</span>`, [primero.lat, primero.lon], primero.r.titulo, () => abrirRef.current(primero.r.autoId)).addTo(capa);
          continue;
        }
        const pos = m.layerPointToLatLng(g.centro);
        const html = `<span class="pin-auto pin-grupo">${g.miembros.length} autos</span>`;
        pin(html, pos, `${g.miembros.length} autos, desde ${precio(primero.r)}`, () => {
          const b = L.latLngBounds(g.miembros.map((x) => [x.lat, x.lon] as [number, number]));
          // Separados en el mapa: acercarse. En el mismo punto (solo dicen la región): abrirlos en círculo.
          const mismoPunto = b.getNorthEast().distanceTo(b.getSouthWest()) < 300;
          if (!mismoPunto && m.getZoom() < 16) return void m.flyToBounds(b.pad(0.3), { duration: 0.45, maxZoom: 16 });
          abrirCirculo(pos, g.miembros);
        }).addTo(capa);
      }
      if (lugarCasa) {
        L.marker([lugarCasa.lat, lugarCasa.lon], { icon: L.divIcon({ className: "", html: `<span class="pin-casa">Casa</span>`, iconSize: [0, 0] }), interactive: false }).addTo(capa);
      }
    };

    const abrirCirculo = (pos: Leaflet.LatLng, miembros: Punto[]) => {
      abiertos?.remove();
      const centro = m.latLngToLayerPoint(pos);
      const radio = Math.max(56, miembros.length * 9);
      abiertos = L.layerGroup().addTo(m);
      miembros.slice(0, 40).forEach((p, i, arr) => {
        const ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
        const donde = m.layerPointToLatLng(L.point(centro.x + Math.cos(ang) * radio, centro.y + Math.sin(ang) * radio * 0.8));
        const clase = p.r.veredicto === "calza" ? "calza" : "revisar";
        pin(`<span class="pin-auto pin-${clase} pin-abierto" style="--i:${i}">${precio(p.r)}</span>`, donde, p.r.titulo, () => abrirRef.current(p.r.autoId)).addTo(abiertos!);
      });
    };

    pintar();
    m.on("zoomend", pintar);
    m.on("click", () => {
      abiertos?.remove();
      abiertos = null;
    });
    return () => {
      m.off("zoomend", pintar);
      m.off("click");
      capa.remove();
      abiertos?.remove();
    };
  }, [mapa, autos, casa]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="-mx-5">
      {sinLugar > 0 && <p className="px-5 pb-2 text-[13px] text-tenue">{sinLugar === 1 ? "Un auto no sale en el mapa" : `${sinLugar} autos no salen en el mapa`}: el aviso no dice dónde está.</p>}
      <div ref={caja} className="mapa-autos h-[calc(100dvh-330px)] min-h-[360px] w-full bg-card" />
    </div>
  );
}
