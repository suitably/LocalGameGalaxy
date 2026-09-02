const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

let vapidKeys = null;
const subscriptionsByGame = new Map(); // gameId -> Map<playerId, subscription>

// Cleanup stale subscriptions after 7 days
setInterval(() => {
    const now = Date.now();
    for (const [gameId, playersMap] of subscriptionsByGame.entries()) {
        for (const [playerId, entry] of playersMap.entries()) {
            if (now - (entry.updatedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
                playersMap.delete(playerId);
            }
        }
        if (playersMap.size === 0) {
            subscriptionsByGame.delete(gameId);
        }
    }
}, 60 * 60 * 1000).unref();

function initVapid() {
    if (vapidKeys) return vapidKeys;

    // 1. Environment variables
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        vapidKeys = {
            publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
            privateKey: process.env.VAPID_PRIVATE_KEY.trim(),
        };
    } else {
        // 2. Persistent file next to config
        const keysFile = path.join(process.cwd(), '.vapid_keys.json');
        if (fs.existsSync(keysFile)) {
            try {
                vapidKeys = JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
            } catch {
                // Ignore parse error
            }
        }

        if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
            vapidKeys = webpush.generateVAPIDKeys();
            try {
                fs.writeFileSync(keysFile, JSON.stringify(vapidKeys, null, 2), 'utf-8');
            } catch {
                // In read-only env, in-memory is fine
            }
        }
    }

    const contactEmail = process.env.VAPID_SUBJECT || 'mailto:admin@localgamegalaxy.app';
    webpush.setVapidDetails(contactEmail, vapidKeys.publicKey, vapidKeys.privateKey);
    console.log('[WebPush] VAPID push service initialized.');
    return vapidKeys;
}

initVapid();

const webPushService = {
    getPublicKey() {
        const keys = initVapid();
        return keys.publicKey;
    },

    subscribe(gameId, playerId, subscription) {
        if (!gameId || !playerId || !subscription || !subscription.endpoint) {
            return false;
        }

        if (!subscriptionsByGame.has(gameId)) {
            subscriptionsByGame.set(gameId, new Map());
        }

        const gameSubscriptions = subscriptionsByGame.get(gameId);
        gameSubscriptions.set(playerId, {
            subscription,
            updatedAt: Date.now(),
        });

        return true;
    },

    unsubscribe(gameId, playerId) {
        if (!gameId || !subscriptionsByGame.has(gameId)) return false;
        const gameSubscriptions = subscriptionsByGame.get(gameId);
        return gameSubscriptions.delete(playerId);
    },

    getSubscriptions(gameId) {
        if (!gameId || !subscriptionsByGame.has(gameId)) return [];
        return Array.from(subscriptionsByGame.get(gameId).entries()).map(([playerId, val]) => ({
            playerId,
            subscription: val.subscription,
        }));
    },

    async sendNotification(gameId, senderPlayerId, payload) {
        if (!gameId || !subscriptionsByGame.has(gameId)) {
            return { sent: 0, failed: 0 };
        }

        const gameSubscriptions = subscriptionsByGame.get(gameId);
        let sent = 0;
        let failed = 0;

        const stringPayload = JSON.stringify({
            title: payload.title || 'GuessArt',
            body: payload.body || 'Du bist an der Reihe!',
            url: payload.url || '/',
            tag: payload.tag || `guessart-${gameId}`,
            icon: payload.icon || '/pwa/icon_full.png',
            action: payload.action || 'turn',
        });

        const promises = [];

        for (const [playerId, entry] of gameSubscriptions.entries()) {
            // Do not notify the sender of the turn
            if (senderPlayerId && playerId === senderPlayerId) {
                continue;
            }

            // If targetPlayerId is specified, only notify that player
            if (payload.targetPlayerId && playerId !== payload.targetPlayerId) {
                continue;
            }

            const sendPromise = webpush
                .sendNotification(entry.subscription, stringPayload)
                .then(() => {
                    sent++;
                })
                .catch((err) => {
                    failed++;
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        // Expired/unsubscribed endpoint
                        gameSubscriptions.delete(playerId);
                    } else {
                        console.warn(`[WebPush] Failed push to player ${playerId}:`, err.message);
                    }
                });

            promises.push(sendPromise);
        }

        await Promise.all(promises);
        return { sent, failed };
    },
};

module.exports = webPushService;
