const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

let vapidKeys = null;
const subscriptionsByGame = new Map(); // gameId -> Map<playerId, { subscription, updatedAt }>

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), '.push_subscriptions.json');
const SAVE_DEBOUNCE_MS = 5000;
let saveTimer = null;

// ─── Subscription Persistence ────────────────────────────────────────────────

function loadSubscriptions() {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
            const data = JSON.parse(raw);
            const now = Date.now();
            let loaded = 0;
            let expired = 0;

            for (const [gameId, players] of Object.entries(data)) {
                const playersMap = new Map();
                for (const [playerId, entry] of Object.entries(players)) {
                    // Skip entries older than 7 days
                    if (now - (entry.updatedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
                        expired++;
                        continue;
                    }
                    playersMap.set(playerId, entry);
                    loaded++;
                }
                if (playersMap.size > 0) {
                    subscriptionsByGame.set(gameId, playersMap);
                }
            }

            console.log(`[WebPush] Loaded ${loaded} push subscriptions from disk (${expired} expired, discarded).`);
        }
    } catch (err) {
        console.warn('[WebPush] Failed to load push subscriptions from disk:', err.message);
    }
}

function saveSubscriptions() {
    try {
        const data = {};
        for (const [gameId, playersMap] of subscriptionsByGame.entries()) {
            data[gameId] = {};
            for (const [playerId, entry] of playersMap.entries()) {
                data[gameId][playerId] = entry;
            }
        }
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.warn('[WebPush] Failed to save push subscriptions to disk:', err.message);
    }
}

function debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveSubscriptions();
        saveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

// Load persisted subscriptions on module init
loadSubscriptions();

// Save before process exits
process.on('beforeExit', () => saveSubscriptions());
process.on('SIGINT', () => { saveSubscriptions(); process.exit(0); });
process.on('SIGTERM', () => { saveSubscriptions(); process.exit(0); });

// ─── Cleanup Stale Subscriptions ─────────────────────────────────────────────

// Cleanup stale subscriptions after 7 days
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [gameId, playersMap] of subscriptionsByGame.entries()) {
        for (const [playerId, entry] of playersMap.entries()) {
            if (now - (entry.updatedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
                playersMap.delete(playerId);
                cleaned++;
            }
        }
        if (playersMap.size === 0) {
            subscriptionsByGame.delete(gameId);
        }
    }
    if (cleaned > 0) {
        console.log(`[WebPush] Cleaned ${cleaned} stale subscriptions.`);
        saveSubscriptions();
    }
}, 60 * 60 * 1000).unref();

// ─── VAPID Initialization ────────────────────────────────────────────────────

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

// ─── Service API ─────────────────────────────────────────────────────────────

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

        debouncedSave();
        return true;
    },

    unsubscribe(gameId, playerId) {
        if (!gameId || !subscriptionsByGame.has(gameId)) return false;
        const gameSubscriptions = subscriptionsByGame.get(gameId);
        const deleted = gameSubscriptions.delete(playerId);
        if (deleted) debouncedSave();
        return deleted;
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
        let needsSave = false;

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
                        // Expired/unsubscribed endpoint — remove and persist
                        gameSubscriptions.delete(playerId);
                        needsSave = true;
                    } else {
                        console.warn(`[WebPush] Failed push to player ${playerId}:`, err.message);
                    }
                });

            promises.push(sendPromise);
        }

        await Promise.all(promises);

        if (needsSave) {
            debouncedSave();
        }

        return { sent, failed };
    },
};

module.exports = webPushService;
