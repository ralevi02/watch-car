import { strict as assert } from "node:assert";
import { test } from "node:test";
import { claveKarcal, leerKarcal, leerZarate } from "./lector.js";

test("Karcal: encuentra la clave pública y lee un lote", () => {
  assert.deepEqual(claveKarcal(`let a="karcal_cars",c=(0,n.x)("CYJGUD28WQ","0123456789abcdef0123456789abcdef")`), { app: "CYJGUD28WQ", clave: "0123456789abcdef0123456789abcdef" });
  assert.equal(claveKarcal(`(0,n.x)("CYJGUD28WQ","0123456789abcdef0123456789abcdef")`), null, "sin el índice no es la clave");
  const l = leerKarcal({
    objectID: "remate-abc-item-xyz",
    lotNumber: "34",
    auctionId: "abc",
    auctionDate: "2026-04-30T19:00:00+00:00",
    brand: "VOLVO",
    model: "S60",
    year: 2016,
    status: "completed",
    vehicleType: "Siniestrado",
    claimType: "Pérdida Total Asimilada",
    currentPrice: 1100000,
    specifications: { plate: "HKWW58", mileage: 138043, color: "BLANCO" },
    images: ["https://karcal.b-cdn.net/vehiculos/HKWW58/a.jpg"],
  });
  assert.equal(l.patente, "HKWW58");
  assert.equal(l.url, "https://karcal.cl/cerrados/abc/xyz");
  assert.equal(l.condicion, "Siniestrado, Pérdida Total Asimilada");
});

test("Zárate: lee los lotes del HTML", () => {
  const html = `<p>Martes 29/09, 15:00 hrs.</p><div>LOTE 88</div><div>VOLVO S60 II B4</div><div>CÍA. DE SEGUROS</div><div>SINIESTRADO</div><div>SCTZ88-3 · AÑO 2022 · 30.014 Kms.</div><div>Per. Circ. no disp. · No arranca motor · Con llave</div><div>Mínimo: $ 3.900.000</div>
  <img src="https://storage.googleapis.com/cl-media-remateszarate/vehiculos/SCTZ88-3/Publicacion/a.jpg?w=1080&#038;ssl=1">`;
  const [l] = leerZarate(html, new Date("2026-09-28T12:00:00-03:00"));
  assert.equal(l?.patente, "SCTZ88");
  assert.equal(l?.anio, 2022);
  assert.equal(l?.km, 30014);
  assert.equal(l?.marca, "VOLVO");
  assert.equal(l?.precio, 3900000);
  assert.equal(l?.fecha, "2026-09-29T18:00:00.000Z");
  assert.equal(l?.fotos.length, 1);
});
