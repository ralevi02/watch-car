import assert from "node:assert/strict";
import { test } from "node:test";
import { EJEMPLO_V40CC } from "@radar/core";
import { leerTarjetaML, urlWeb } from "./web.ts";

test("urlWeb arma la ruta por marca y modelo, con páginas de 48", () => {
  assert.equal(urlWeb(EJEMPLO_V40CC), "https://autos.mercadolibre.cl/volvo/v40");
  assert.equal(urlWeb(EJEMPLO_V40CC, 3), "https://autos.mercadolibre.cl/volvo/v40/_Desde_97");
});

test("leerTarjetaML lee precio partido en dos líneas, año, km y lugar", () => {
  const a = leerTarjetaML({
    url: "https://auto.mercadolibre.cl/MLC-1234567890-volvo-v40-cross-country-t4-_JM#polycard_client=search",
    titulo: "Volvo V40 Cross Country 2.0 T4 Momentum",
    texto: "Promocionado\nVolvo V40 Cross Country 2.0 T4 Momentum\n$\n12.990.000\n2017 | 86.000 Km\nLas Condes - RM (Metropolitana)",
    foto: "https://http2.mlstatic.com/D_Q_NP_123-F.webp",
  });
  assert.equal(a?.id, "MLC1234567890");
  assert.equal(a?.url, "https://auto.mercadolibre.cl/MLC-1234567890-volvo-v40-cross-country-t4-_JM");
  assert.equal(a?.precio, 12_990_000);
  assert.equal(a?.anio, 2017);
  assert.equal(a?.km, 86_000);
  assert.equal(a?.region, "RM (Metropolitana)");
  assert.equal(a?.destacado, true);
});

test("leerTarjetaML no usa precios en UF", () => {
  const a = leerTarjetaML({ url: "https://auto.mercadolibre.cl/MLC-99999999-x", texto: "Volvo XC60\nUF 450\n2019 | 50.000 Km" });
  assert.equal(a?.precio, undefined);
});
