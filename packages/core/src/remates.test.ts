import { strict as assert } from "node:assert";
import { test } from "node:test";
import { coincideRemate, normalizarPatente, patentesEnTexto } from "./index.ts";

test("normaliza patentes con y sin dígito verificador", () => {
  assert.equal(normalizarPatente("SCTZ88-3"), "SCTZ88");
  assert.equal(normalizarPatente("HDKV-76-1"), "HDKV76");
  assert.equal(normalizarPatente("vryb.82"), "VRYB82");
  assert.equal(normalizarPatente("AB-1234"), "AB1234");
  assert.equal(normalizarPatente("sin patente"), null);
});

test("encuentra patentes en el texto sin confundir años", () => {
  assert.deepEqual(patentesEnTexto("Volvo V40 CC 2018, patente HPBL-52, único dueño"), ["HPBL52"]);
  assert.deepEqual(patentesEnTexto("V40 CC 2018 AWD RS2017"), []);
  assert.deepEqual(patentesEnTexto("Patente antigua AB-12-34"), ["AB1234"]);
});

test("cruce con un remate: por patente o posible por modelo, año y km", () => {
  const lote = { patente: "HKWW58", marca: "VOLVO", modelo: "S60", anio: 2016, km: 138043, fecha: "2026-04-30T19:00:00Z" };
  const aviso = { marca: "Volvo", modelo: "S60", anio: 2016, km: 140000, primeraVez: "2026-06-01T00:00:00Z", patentes: [] as string[] };
  assert.equal(coincideRemate({ ...aviso, patentes: ["HKWW58"] }, lote), "patente");
  assert.equal(coincideRemate(aviso, lote), "posible");
  assert.equal(coincideRemate({ ...aviso, km: 120000 }, lote), null, "menos km que en el remate");
  assert.equal(coincideRemate({ ...aviso, primeraVez: "2026-03-01T00:00:00Z" }, lote), null, "publicado antes del remate");
  assert.equal(coincideRemate({ ...aviso, modelo: "V60" }, lote), null);
});
