import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EJEMPLO_V40CC, evaluar, modeloCalza, modeloCanonico } from "./index.ts";

test("evalúa km, precio y motor contra la ficha", () => {
  assert.deepEqual(evaluar({ anio: 2018, km: 90000, precio: 13000000, motor: "T4" }, EJEMPLO_V40CC), { tipo: "calza" });
  assert.deepEqual(evaluar({ km: 125000 }, EJEMPLO_V40CC), { tipo: "advertencia", motivos: ["Km 125.000 sobre 120.000"] });
  assert.equal(evaluar({ km: 160000 }, EJEMPLO_V40CC).tipo, "fuera");
  assert.equal(evaluar({ motor: "D2" }, EJEMPLO_V40CC).tipo, "fuera");
});

test("compara el modelo: el V40 base no sirve para una ficha de V40 CC", () => {
  assert.equal(modeloCanonico("V40 Cross Country"), "v40cc");
  assert.equal(modeloCanonico("V40 CC"), "v40cc");
  assert.ok(modeloCalza("V40 Cross Country", "V40"));
  assert.ok(!modeloCalza("V40", "V40 Cross Country"));
  assert.deepEqual(evaluar({ modelo: "V40" }, EJEMPLO_V40CC), { tipo: "fuera", motivos: ["Es V40, no V40 Cross Country"] });
  assert.deepEqual(evaluar({ modelo: "V40", porConfirmar: ["modelo"] }, EJEMPLO_V40CC), {
    tipo: "advertencia",
    motivos: ["Modelo por confirmar (parece V40)"],
  });
  assert.deepEqual(evaluar({ modelo: "V40 CC" }, EJEMPLO_V40CC), { tipo: "calza" });
  assert.deepEqual(evaluar({ modelo: "V40 Cross Country", porConfirmar: ["modelo"] }, EJEMPLO_V40CC), {
    tipo: "advertencia",
    motivos: ["Modelo por confirmar (parece V40 Cross Country)"],
  });
});

test("deduplica por modelo, año, km, precio y región", async () => {
  const { esMismoAuto } = await import("./index.ts");
  const base = { modelo: "V40 Cross Country", anio: 2017, km: 104400, precio: 12190000, region: "Metropolitana de Santiago" };
  assert.ok(esMismoAuto(base, { ...base, modelo: "V40 CC", km: 105000, precio: 12990000 }));
  assert.ok(!esMismoAuto(base, { ...base, km: 110000 }), "km a más de 2%");
  assert.ok(!esMismoAuto(base, { ...base, precio: 14000000 }), "precio a más de 10%");
  assert.ok(!esMismoAuto(base, { ...base, region: "Valparaíso" }));
  assert.ok(!esMismoAuto(base, { ...base, anio: 2018 }));
  assert.ok(!esMismoAuto({ ...base, km: null }, base), "sin km no se arriesga");
});

test("reconoce links compartidos", async () => {
  const { identificarLink } = await import("./index.ts");
  assert.deepEqual(identificarLink("https://www.chileautos.cl/vehiculos/detalles/2017-volvo-v40/CL-AD-20869022/?gts=x"), {
    fuente: "chileautos",
    id: "CL-AD-20869022",
    url: "https://www.chileautos.cl/vehiculos/detalles/2017-volvo-v40/CL-AD-20869022/",
  });
  assert.deepEqual(identificarLink("Mira este auto https://m.facebook.com/marketplace/item/123456789/?ref=share"), {
    fuente: "facebook",
    id: "123456789",
    url: "https://www.facebook.com/marketplace/item/123456789/",
  });
  assert.equal(identificarLink("https://auto.mercadolibre.cl/MLC-1234567-volvo-v40-_JM")?.id, "MLC1234567");
  assert.equal(identificarLink("hola"), null);
});
