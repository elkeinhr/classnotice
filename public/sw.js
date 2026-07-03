self.addEventListener("push", function (event) {
  const data = event.data
    ? event.data.json()
    : {
        title: "공지 알림",
        body: "새 알림이 도착했습니다.",
        url: "/",
      };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: {
        url: data.url || "/",
      },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});