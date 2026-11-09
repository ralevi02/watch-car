import assert from "node:assert/strict";
import { test } from "node:test";
import { enZona, regionDe } from "./regiones.ts";

test("regionDe entiende cómo escribe la región cada portal", () => {
  assert.equal(regionDe("Santiago, RM"), "RM");
  assert.equal(regionDe("Viña del Mar, VS"), "VS");
  assert.equal(regionDe("Rancagua, LI"), "LI");
  assert.equal(regionDe("Metropolitana de Santiago"), "RM");
  assert.equal(regionDe("RM (Metropolitana)"), "RM");
  assert.equal(regionDe("Bío Bío"), "BI");
  assert.equal(regionDe("OHiggins"), "LI");
  assert.equal(regionDe("Los Ríos"), "LR");
  assert.equal(regionDe("$686"), undefined);
});

test("enZona: sin regiones en la ficha o sin región en el aviso, no se marca", () => {
  assert.equal(enZona("Viña del Mar, VS", []), true);
  assert.equal(enZona(null, ["Metropolitana"]), true);
  assert.equal(enZona("Las Condes, RM", ["Metropolitana"]), true);
  assert.equal(enZona("Viña del Mar, VS", ["Metropolitana"]), false);
  assert.equal(enZona("Viña del Mar, VS", ["Metropolitana", "Valparaíso"]), true);
});

test("evaluar: fuera de la zona de la ficha queda con aviso, no fuera", async () => {
  const { evaluar, EJEMPLO_V40CC } = await import("./seguimiento.ts");
  const ficha = { ...EJEMPLO_V40CC, regiones: ["Metropolitana"] };
  const aviso = { modelo: "V40 Cross Country", anio: 2018, km: 90_000, precio: 12_000_000 };
  assert.equal(evaluar({ ...aviso, region: "Las Condes, RM" }, ficha).tipo, "calza");
  const lejos = evaluar({ ...aviso, region: "Viña del Mar, VS" }, ficha);
  assert.equal(lejos.tipo, "advertencia");
  assert.deepEqual(lejos.tipo === "advertencia" ? lejos.motivos : [], ["En Valparaíso, fuera de tu zona"]);
  assert.equal(evaluar({ ...aviso, region: "Viña del Mar, VS" }, EJEMPLO_V40CC).tipo, "calza");
});
