// Service worker de Radar seminuevos: notificaciones push y uso sin señal.
// Las pantallas son estáticas y los datos viven en el teléfono (localStorage):
// basta guardar las páginas y los archivos de la app.
const VERSION = "radar-v4";
const PAGINAS = ["/", "/resultados", "/fuentes", "/auto"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => Promise.all(PAGINAS.map((p) => c.add(new Request(p, { credentials: "include" })).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fotos de los portales: no se guardan aquí (llegan "opacas" y Chrome cobra ~7 MB de cuota por cada una); las guarda el caché normal.
  if (url.origin !== self.location.origin) return;
  // Los datos van siempre a la red: si no hay señal, la app usa lo guardado en el teléfono.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Archivos de la app (llevan hash en el nombre): primero lo guardado.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => (await c.match(req)) ?? fetch(req).then((r) => (r.ok && c.put(req, r.clone()), r))),
    );
    return;
  }

  // Páginas: primero la red; sin señal, la última versión guardada (o la de Resultados).
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && !r.redirected && PAGINAS.includes(url.pathname)) caches.open(VERSION).then((c) => c.put(url.pathname, r.clone()));
          return r;
        })
        .catch(async () => (await caches.match(url.pathname)) ?? (await caches.match("/resultados")) ?? Response.error()),
    );
  }
});

self.addEventListener("push", (e) => {
  let datos = {};
  try {
    datos = e.data ? e.data.json() : {};
  } catch {
    datos = { titulo: "Radar seminuevos", cuerpo: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(datos.titulo || "Radar seminuevos", {
      body: datos.cuerpo || "",
      tag: datos.etiqueta,
      icon: "/icons/192",
      badge: "/icons/192",
      data: { url: datos.url || "/resultados" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/resultados", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(self.location.origin) && "focus" in v) {
          v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
