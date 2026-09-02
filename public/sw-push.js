/**
 * sw-push.js - Background Web Push Service Worker Event Listeners
 * Handles incoming OS push events and notification clicks even when browser tabs are closed.
 */

self.addEventListener('push', function(event) {
    let payload = {
        title: 'GuessArt',
        body: 'Du bist an der Reihe!',
        url: '/',
        icon: '/pwa/icon_full.png',
        tag: 'lgg-game-turn',
    };

    try {
        if (event.data) {
            const parsed = event.data.json();
            payload = Object.assign(payload, parsed);
        }
    } catch (e) {
        if (event.data) {
            payload.body = event.data.text();
        }
    }

    const title = payload.title || 'LocalGameGalaxy';
    const options = {
        body: payload.body || 'Du bist an der Reihe!',
        icon: payload.icon || '/pwa/icon_full.png',
        badge: '/pwa/icon_full.png',
        tag: payload.tag || 'lgg-game-turn',
        renotify: true,
        data: {
            url: payload.url || '/',
            timestamp: Date.now()
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    if (targetUrl && targetUrl !== '/') {
                        client.navigate(targetUrl);
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
