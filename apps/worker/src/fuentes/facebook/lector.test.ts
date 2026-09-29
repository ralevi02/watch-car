import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EJEMPLO_V40CC } from "@radar/core";
import { consultas, detectarMuro, kmDeTexto, leerDetalle, leerTarjeta, tramosDePrecio, urlBusqueda } from "./lector.js";

test("arma las consultas y la URL de búsqueda", () => {
  assert.deepEqual(consultas(EJEMPLO_V40CC), ["Volvo V40 Cross Country", "Volvo V40"]);
  const url = new URL(urlBusqueda(EJEMPLO_V40CC, "Volvo V40"));
  assert.equal(url.pathname, "/marketplace/santiago/search/");
  assert.equal(url.searchParams.get("query"), "Volvo V40");
  // El año se filtra después de leer el aviso: con minYear Facebook esconde los publicados como artículo común.
  assert.equal(url.searchParams.get("minYear"), null);
  assert.equal(url.searchParams.get("maxPrice"), "14000000");
  assert.equal(url.searchParams.get("sortBy"), "creation_time_descend");
});

test("divide el precio en tramos", () => {
  assert.deepEqual(tramosDePrecio(6_000_000, 15_000_000, 3), [
    { min: 6_000_000, max: 8_999_999 },
    { min: 9_000_000, max: 11_999_999 },
    { min: 12_000_000, max: 15_000_000 },
  ]);
  assert.deepEqual(tramosDePrecio(undefined, undefined), [{ min: undefined, max: undefined }]);
});

test("lee el km en sus formatos", () => {
  assert.equal(kmDeTexto("120 mil km"), 120000);
  assert.equal(kmDeTexto("98K km"), 98000);
  assert.equal(kmDeTexto("104.400 km"), 104400);
  assert.equal(kmDeTexto("Conducido 85.000 kilómetros"), 85000);
  assert.equal(kmDeTexto("sin datos"), undefined);
});

test("lee una tarjeta de la grilla", () => {
  assert.deepEqual(leerTarjeta("123456789", "$12.500.000\n$13.000.000\n2017 Volvo V40 cross country\nSantiago, RM\n120 mil km"), {
    id: "123456789",
    url: "https://www.facebook.com/marketplace/item/123456789/",
    titulo: "2017 Volvo V40 cross country",
    precio: 12500000,
    anio: 2017,
    km: 120000,
    region: "Santiago, RM",
    destacado: false,
  });
  assert.equal(leerTarjeta("1", "$12.500.000"), null, "sin título no hay aviso");
  assert.equal(leerTarjeta("2", "CLP 9.990.000\nVolvo v40\nMaipú, RM")?.precio, 9990000);
});

test("detecta muros de login y checkpoint", () => {
  assert.equal(detectarMuro("https://www.facebook.com/login/?next=x", "", false), "login");
  assert.equal(detectarMuro("https://www.facebook.com/checkpoint/123/", "", false), "checkpoint");
  assert.equal(detectarMuro("https://www.facebook.com/marketplace/", "Confirma tu identidad para continuar", false), "checkpoint");
  assert.equal(detectarMuro("https://www.facebook.com/marketplace/", "Marketplace\nVolvo V40", false), null);
});

test("lee el detalle", () => {
  const d = leerDetalle("Volvo V40 CC 2017\n$12.500.000\nAcerca de este vehículo\nConducido 104.400 km\nTransmisión automática\nDescripción del vendedor\nImpecable.\nInformación del vendedor\nJuan\nSe unió a Facebook en 2012");
  assert.equal(d.datos["Kilometraje"], "104.400 km");
  assert.equal(d.datos["Transmisión"], "automática");
  assert.ok(d.descripcion?.includes("Impecable."));
  assert.ok(!d.descripcion?.includes("Juan"), "corta antes de los datos del vendedor");
});
