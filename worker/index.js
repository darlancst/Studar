// Custom Service Worker script para o Studar PWA

// Manipula cliques nas notificações
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Foca na aba aberta do Studar ou abre uma nova
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Listener de push para compatibilidade futura com Web Push Server
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Studar';
      const options = {
        body: data.body || '',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-192x192.png',
        tag: data.tag || 'studar-push',
        vibrate: data.vibrate || [200, 100, 200],
        data: data.data,
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch {
      event.waitUntil(
        self.registration.showNotification('Studar', {
          body: event.data.text(),
          icon: '/icons/icon-192x192.png',
        })
      );
    }
  }
});
