import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cuentaNueva, diasParaVender, entrenarMercado, precioJusto, senalesEnTexto } from "./index.ts";

// Un mercado de mentira: cada año suma 1 M y cada 10.000 km resta 150 mil.
const avisos = Array.from({ length: 30 }, (_, i) => {
  const anio = 2016 + (i % 5);
  const km = 40_000 + ((i * 7919) % 100_000);
  return { modelo: "V40 Cross Country", anio, km, precio: 8_000_000 + (anio - 2016) * 1_000_000 - (km / 10_000) * 150_000 + ((i % 3) - 1) * 100_000 };
});

test("precio justo: recupera la recta de año y km", () => {
  const m = entrenarMercado([...avisos, { modelo: "V40 Cross Country", anio: 2018, km: 80_000, precio: 100_000 }]);
  const p = precioJusto(m, { modelo: "V40 Cross Country", anio: 2018, km: 80_000 })!;
  // 8 M + 2 M − 8·150 mil = 8,8 M
  assert.ok(Math.abs(p.precio - 8_800_000) <= 150_000, `salió ${p.precio}`);
  assert.equal(p.base, "modelo");
  assert.ok(p.bajo < p.precio && p.alto > p.precio);
  assert.equal(precioJusto(m, { modelo: "XC90", anio: 2018, km: 1 }), null, "sin datos no inventa");
  assert.equal(precioJusto(m, { modelo: "V40 Cross Country", anio: 2008, km: 1 }), null, "año muy afuera");
  // Un V40 a secas cae en la familia.
  assert.equal(precioJusto(m, { modelo: "V40", anio: 2018, km: 80_000 })?.base, "familia");
});

test("días para vender por familia", () => {
  const d = diasParaVender(Array.from({ length: 6 }, (_, i) => ({ modelo: "V40", primeraVez: "2026-09-01T00:00:00Z", ultimaVez: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z`, estado: "posible_vendido" })));
  assert.equal(d.get("v40")?.dias, 12);
});

test("señales de estafa en el texto", () => {
  assert.deepEqual(senalesEnTexto("Vendo urgente por viaje, estoy fuera de Santiago, pido abono para reservar"), ["Pide abono o reserva", "Vendedor lejos o envío", "Urgencia"]);
  assert.deepEqual(senalesEnTexto("Impecable, único dueño, mantenciones en la marca"), []);
  assert.ok(cuentaNueva(2026, new Date("2026-09-30")));
  assert.ok(!cuentaNueva(2015, new Date("2026-09-30")));
});
