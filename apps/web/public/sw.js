// Service worker de Radar seminuevos: notificaciones push.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

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
