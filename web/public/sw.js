// JOURNEX service worker: shows push notifications and opens the app when one is clicked.
// It does nothing else: no caching, no offline pages.

self.addEventListener('push', (event) => {
  let message = { title: 'JOURNEX', body: '', url: '/notifications' };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // A push without a readable body still says something arrived.
  }
  event.waitUntil(self.registration.showNotification(message.title, { body: message.body, data: { url: message.url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
