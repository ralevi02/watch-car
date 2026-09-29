import { strict as assert } from "node:assert";
import { test } from "node:test";
import { contactosEnTexto, esCelular, normalizarTelefono } from "./index.ts";

test("normaliza teléfonos chilenos", () => {
  assert.equal(normalizarTelefono("+56 9 1234 5678"), "+56912345678");
  assert.equal(normalizarTelefono("9 1234 5678"), "+56912345678");
  assert.equal(normalizarTelefono("(2) 2345 6789"), "+56223456789");
  assert.equal(normalizarTelefono("12345"), null);
  assert.ok(esCelular("+56912345678"));
  assert.ok(!esCelular("+56223456789"));
});

test("encuentra teléfonos y correos sin confundir precios ni km", () => {
  const r = contactosEnTexto("Vendo V40 2018, $12.500.000, 90.000 km. Llamar al +56 9 8765 4321 o escribir a Juan.Perez@gmail.com");
  assert.deepEqual(r.telefonos, ["+56987654321"]);
  assert.deepEqual(r.emails, ["juan.perez@gmail.com"]);
  assert.deepEqual(contactosEnTexto("Precio 12.500.000, 120.000 km, año 2017").telefonos, []);
});
