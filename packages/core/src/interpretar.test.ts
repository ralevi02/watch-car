import { strict as assert } from "node:assert";
import { test } from "node:test";
import { interpretarBusqueda } from "./index.ts";

test("entiende una búsqueda dicha", () => {
  assert.deepEqual(interpretarBusqueda("V40 automático bajo 12 millones del 2018 en adelante"), { precioMax: 12_000_000, anioMin: 2018, caja: "automatica", texto: "v40" });
  assert.deepEqual(interpretarBusqueda("cross country con menos de 100 mil km, más barato primero"), { kmMax: 100_000, orden: "precio", texto: "cross country" });
  assert.deepEqual(interpretarBusqueda("entre 8 y 12,5 millones de particular en Ñuñoa"), { precioMin: 8_000_000, precioMax: 12_500_000, vendedor: "particular", texto: "nunoa" });
  assert.deepEqual(interpretarBusqueda("xc40 4x4 cerca"), { traccion: "AWD", orden: "cerca", texto: "xc40" });
  assert.deepEqual(interpretarBusqueda("V60 hasta 80.000 km"), { kmMax: 80_000, texto: "v60" });
});
