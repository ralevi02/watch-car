import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EJEMPLO_V40CC } from "@radar/core";
import * as kavak from "./kavak/lector.js";
import * as yapo from "./yapo/lector.js";

test("Kavak: URL y tarjeta", () => {
  assert.equal(kavak.urlBusqueda(EJEMPLO_V40CC), "https://www.kavak.com/cl/usados/volvo/v40");
  const a = kavak.leerTarjeta("545050", "https://www.kavak.com/cl/venta/volvo-v40-16_t4", [
    "Precio imbatible",
    "Volvo • V40",
    "2016 • 87.000 km • 1.6 T4 COMFORT CROSS COUNTRY • Automático",
    "Precio desde",
    "$",
    "9.368.900",
    "Metropolitana de Santiago",
  ]);
  assert.deepEqual(a, {
    id: "545050",
    url: "https://www.kavak.com/cl/venta/volvo-v40-16_t4",
    titulo: "2016 Volvo V40 1.6 T4 COMFORT CROSS COUNTRY",
    anio: 2016,
    km: 87000,
    caja: "Automático",
    precio: 9368900,
    region: "Metropolitana de Santiago",
    vendedor: "Kavak",
    tipoVendedor: "Automotora",
    destacado: false,
  });
});

test("Yapo: URL, paginación y tarjeta", () => {
  assert.equal(yapo.urlBusqueda(EJEMPLO_V40CC), "https://www.yapo.cl/autos-usados/volvo/v40");
  assert.equal(yapo.urlBusqueda(EJEMPLO_V40CC, 2), "https://www.yapo.cl/autos-usados.2/volvo/v40");
  const texto = "1 / 20\nPrevious slide\nNext slide\nResaltado\nTecnex Automoviles\n$ 11,870,000\n-5%\nRegión Metropolitana, La Granja\n2018\n75,000 km\nManual\nVolvo V40 2018\n" + "x".repeat(130) + "\nContactar";
  const a = yapo.leerTarjeta("32801402", "https://www.yapo.cl/autos-usados/volvo-v40-2018/32801402", texto);
  assert.equal(a?.precio, 11870000);
  assert.equal(a?.anio, 2018);
  assert.equal(a?.km, 75000);
  assert.equal(a?.caja, "Manual");
  assert.equal(a?.region, "Región Metropolitana");
  assert.equal(a?.titulo, "Volvo V40 2018");
  assert.equal(a?.vendedor, "Tecnex Automoviles");
  assert.equal(a?.destacado, true);
  assert.equal(a?.descripcion?.length, 130);
  const particular = yapo.leerTarjeta("1", "u", "$ 7,990,000\nRegión Metropolitana, Las Condes\n2015 Volvo V40 1.6 T4 R-design 4x2 At 5p\nContactar");
  assert.equal(particular?.tipoVendedor, "Particular");
  assert.equal(particular?.titulo, "2015 Volvo V40 1.6 T4 R-design 4x2 At 5p");
});

test("MercadoLibre: URL y resultado de la API", async () => {
  const ml = await import("./mercadolibre/lector.js");
  const url = new URL(ml.urlBusqueda(EJEMPLO_V40CC));
  assert.equal(url.searchParams.get("category"), "MLC1744");
  assert.equal(url.searchParams.get("q"), "Volvo V40");
  assert.equal(url.searchParams.get("price"), "*-14000000");
  const { aviso, detalle } = ml.leerResultado({
    id: "MLC1234567",
    title: "Volvo V40 Cross Country 2017",
    price: 12990000,
    currency_id: "CLP",
    permalink: "https://auto.mercadolibre.cl/MLC-1234567-volvo-_JM",
    thumbnail: "http://http2.mlstatic.com/D_123-I.jpg",
    attributes: [
      { id: "VEHICLE_YEAR", value_name: "2017" },
      { id: "KILOMETERS", value_name: "98000 km" },
      { id: "TRANSMISSION", value_name: "Automática" },
      { id: "TRIM", value_name: "T4 AWD" },
    ],
    address: { state_name: "RM (Metropolitana)" },
    seller: { nickname: "AUTOS SA", car_dealer: true },
  });
  assert.equal(aviso.titulo, "Volvo V40 Cross Country 2017 T4 AWD");
  assert.equal(aviso.anio, 2017);
  assert.equal(aviso.km, 98000);
  assert.equal(aviso.precio, 12990000);
  assert.equal(aviso.tipoVendedor, "Automotora");
  assert.equal(aviso.foto, "https://http2.mlstatic.com/D_123-I.jpg");
  assert.equal(detalle.datos["Versión"], "T4 AWD");
});
