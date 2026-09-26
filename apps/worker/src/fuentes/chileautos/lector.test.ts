import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EJEMPLO_V40CC, leerTitulo } from "@radar/core";
import { urlBusqueda } from "./consulta.js";
import { leerDetalle, leerLista, leerPaginacion } from "./lector.js";

// Recorte del árbol real de una búsqueda (septiembre 2026), con la misma forma.
const texto = (value: string) => ({ type: "Text", value });
const tarjeta = (id: string, titulo: string, detalles: string[], extra: Record<string, string> = {}, showcase = false) => ({
  type: "ListingCard",
  id: `uuid-${id}`,
  action: {
    type: "NavigateAction",
    key: "showItemDetails",
    data: {
      url: `/vehiculos/detalles/x/${id}/?gts=${id}${showcase ? "&gtsViewType=showcase" : ""}`,
      prefetchTitle: titulo,
    },
    tracking: {
      additionalAttributes: {
        "tracking/item/networkId": id,
        "tracking/item/year": "2017",
        "tracking/item/price": "12190000",
        "tracking/item/adtype": "Particular",
        "tracking/item/state": "Metropolitana de Santiago",
        "tracking/page/listingresultcount": "44",
        ...extra,
      },
    },
  },
  keyDetails: { type: "Stack", children: detalles.map((d) => ({ type: "Stack", children: [{ type: "Icon" }, texto(d)] })) },
  sellerTitle: texto("Particular"),
  sellerSubtitle: texto("Metropolitana de Santiago"),
});

const pagina = {
  type: "PageContainer",
  children: [
    tarjeta("CL-AD-20869022", "2017 Volvo V40 2.0 CROSS COUNTRY T4 AWD AT 5P.", ["Hatchback", "Automática", "Bencina", "104.400 km"], {}, true),
    tarjeta("CP-AD-8549571", "2018 Volvo V40 2.0 T3 COMFORT 4X2 HB MT 5P.", ["Hatchback", "Manual", "Bencina", "75.000 km"], {
      "tracking/item/adtype": "Vehículo Usado",
    }),
    tarjeta("CL-AD-20869022", "repetido", ["Hatchback"]),
    { type: "ListingCard", action: { type: "NavigateAction" } },
    { type: "PaginationNav", label: "Página 1 de 3", nextButton: { type: "PaginationNavButton" } },
  ],
};

test("arma la URL con la sintaxis de Chileautos", () => {
  assert.equal(
    urlBusqueda(EJEMPLO_V40CC),
    "https://www.chileautos.cl/vehiculos/?q=(And.(C.Marca.Volvo._.Modelo.V40.)_.Ano.range(2017..)._.Precio.range(..14000000)._.Kilometraje.range(..150000).)",
  );
  assert.equal(
    urlBusqueda({ ...EJEMPLO_V40CC, marca: "Mercedes-Benz", modelo: "Clase C", modeloPortal: undefined, anio: {}, km: {}, precio: {} }),
    "https://www.chileautos.cl/vehiculos/?q=(C.Marca.Mercedes-Benz._.Modelo.Clase%20C.)",
  );
});

test("lee las tarjetas de la lista", () => {
  const { avisos, descartadas } = leerLista(pagina);
  assert.equal(avisos.length, 2, "deduplica por id");
  assert.equal(descartadas.length, 1, "reporta la tarjeta sin url");
  const [cc, t3] = avisos;
  assert.deepEqual(cc, {
    id: "CL-AD-20869022",
    url: "https://www.chileautos.cl/vehiculos/detalles/x/CL-AD-20869022/",
    titulo: "2017 Volvo V40 2.0 CROSS COUNTRY T4 AWD AT 5P.",
    anio: 2017,
    precio: 12190000,
    km: 104400,
    carroceria: "Hatchback",
    caja: "Automática",
    combustible: "Bencina",
    tipoVendedor: "Particular",
    vendedor: "Particular",
    region: "Metropolitana de Santiago",
    destacado: true,
    foto: undefined,
  });
  assert.equal(t3?.km, 75000);
  assert.equal(t3?.tipoVendedor, "Vehículo Usado");
  assert.equal(t3?.destacado, false);
});

test("lee la paginación y el total", () => {
  assert.deepEqual(leerPaginacion(pagina), { pagina: 1, paginas: 3, totalAvisos: 44 });
  assert.deepEqual(leerPaginacion({ type: "Stack" }), { pagina: 1, paginas: 1, totalAvisos: undefined });
});

test("lee descripción y ficha técnica del detalle", () => {
  const fila = (k: string, v: string) => ({ type: "Grid", children: [{ type: "GridItem", child: texto(k) }, { type: "GridItem", child: texto(v) }] });
  const detalle = {
    type: "Stack",
    children: [
      { type: "GridItem", child: { type: "Stack", children: [texto("Kilometraje"), texto("104.400km")] } },
      texto("Comentarios del vendedor"),
      texto("Volvo V40 Cross Country T4 AWD.\n\nPrecio: $12.490.000"),
      fila("Tracción", "4X4"),
      fila("Versión", "2.0 CROSS COUNTRY T4 AWD AT 5P"),
      fila("Comuna", "Las Condes"),
    ],
  };
  const d = leerDetalle(detalle);
  assert.equal(d.descripcion, "Volvo V40 Cross Country T4 AWD.\n\nPrecio: $12.490.000");
  assert.deepEqual(d.datos, {
    Kilometraje: "104.400km",
    Tracción: "4X4",
    Versión: "2.0 CROSS COUNTRY T4 AWD AT 5P",
    Comuna: "Las Condes",
  });
});

test("lee motor, tracción y Cross Country del título", () => {
  assert.deepEqual(leerTitulo("2017 Volvo V40 2.0 CROSS COUNTRY T4 AWD AT 5P."), { motor: "T4", traccion: "AWD", crossCountry: true });
  assert.deepEqual(leerTitulo("2017 Volvo V40 1.6 D2 COMFORT DIESEL 4X2 HB AT 5P."), { motor: "D2", traccion: "FWD", crossCountry: false });
  assert.deepEqual(leerTitulo("Volvo V40 2017 D2 2.0T"), { motor: "D2", traccion: undefined, crossCountry: false });
});
