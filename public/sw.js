// NextReply service worker — branded push notifications
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'NextReply', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'NextReply';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: data.tag || data.type || 'nextreply',
    renotify: true,
    timestamp: Date.now(),
    vibrate: [120, 60, 120],
    requireInteraction: data.type === 'handover' || data.type === 'limit',
    data: { url: data.url || '/dashboard', type: data.type || 'general' },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Tell any open dashboard tab to refresh its notification list right away.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
        list.forEach(function (c) { c.postMessage({ type: 'nr-push', payload: data }); });
      }),
    ])
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/dashboard';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const c of list) {
        if (c.url && c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
          if ('navigate' in c) c.navigate(target);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
