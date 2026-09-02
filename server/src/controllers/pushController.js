const webPushService = require('../services/webPushService');

function getVapidPublicKey(req, res) {
    const publicKey = webPushService.getPublicKey();
    res.json({ publicKey });
}

function subscribePush(req, res) {
    const { gameId, playerId, subscription } = req.body || {};
    if (!gameId || !playerId || !subscription) {
        return res.status(400).json({ error: 'gameId, playerId and subscription are required' });
    }

    const ok = webPushService.subscribe(gameId, playerId, subscription);
    res.json({ success: ok });
}

function unsubscribePush(req, res) {
    const { gameId, playerId } = req.body || {};
    if (!gameId || !playerId) {
        return res.status(400).json({ error: 'gameId and playerId are required' });
    }

    const ok = webPushService.unsubscribe(gameId, playerId);
    res.json({ success: ok });
}

async function notifyPush(req, res) {
    const { gameId, senderPlayerId, title, body, url, action, targetPlayerId } = req.body || {};
    if (!gameId) {
        return res.status(400).json({ error: 'gameId is required' });
    }

    try {
        const result = await webPushService.sendNotification(gameId, senderPlayerId, {
            title,
            body,
            url,
            action,
            targetPlayerId,
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to dispatch push notifications' });
    }
}

module.exports = {
    getVapidPublicKey,
    subscribePush,
    unsubscribePush,
    notifyPush,
};
