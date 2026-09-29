import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EJEMPLO_V40CC } from "@radar/core";
import { comunaDe, esDeLaFicha, leerAuto, registros } from "./lector.js";

const muestra = {
  resultsList: {
    totalNumRecs: 1,
    records: [
      {
        records: [
          {
            attributes: {
              "automovil-usado.x_patente": ["HPBL-52"],
              "product.route": ["/autos-usados/HPBL-52"],
              "product.displayName": ["V60 CC T5 COMFORT AWD 2.5"],
              "product.x_marca": ["Volvo"],
              "product.x_version": ["2.5 T5 CROSS COUNTRY COMFORT AWD AT 5P"],
              "product.x_agno": ["2016.0"],
              "product.x_kilometraje": ["113152"],
              "sku.activePrice": ["12900000.000000"],
              "product.x_transmision": ["Automática"],
              "product.x_Ubicacion_Fisica": ["Av. La Florida 9510, La Florida - Santiago"],
              "product.fullImageURLs": ["/ccstore/v1/images/?source=/file/v1/products/HPBL-52.jpg"],
              "product.primaryMediumImageURL": ["/ccstore/v1/images/?source=/file/v1/products/HPBL-52.jpg&height=475&width=475"],
            },
          },
        ],
      },
    ],
  },
};

test("Bruno Fritsch: lee un auto del catálogo", () => {
  const [a] = registros(muestra);
  const leido = leerAuto(a!)!;
  assert.equal(leido.aviso.id, "HPBL-52");
  assert.equal(leido.aviso.titulo, "Volvo V60 CC T5 COMFORT AWD 2.5");
  assert.equal(leido.aviso.anio, 2016);
  assert.equal(leido.aviso.km, 113152);
  assert.equal(leido.aviso.precio, 12900000);
  assert.equal(leido.aviso.url, "https://www.brunofritsch.cl/autos-usados/HPBL-52");
  assert.equal(leido.detalle.datos.Comuna, "La Florida");
  assert.match(leido.detalle.descripcion!, /Patente HPBL-52/);
  assert.equal(leido.detalle.fotos?.[0], "https://www.brunofritsch.cl/ccstore/v1/images/?source=/file/v1/products/HPBL-52.jpg");
  assert.equal(comunaDe("Arturo Prat 320, Concepción - Concepción"), "Concepción");
  assert.ok(esDeLaFicha(leido.aviso, { ...EJEMPLO_V40CC, modelo: "V60 Cross Country", modeloPortal: "V60" }));
  assert.ok(!esDeLaFicha(leido.aviso, EJEMPLO_V40CC));
});
