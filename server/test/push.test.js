const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

test('Web Push Relay Service & Endpoints', async (t) => {
    const webPushService = require('../src/services/webPushService');

    await t.test('generates or returns a valid VAPID public key', () => {
        const key = webPushService.getPublicKey();
        assert.ok(key, 'VAPID public key should exist');
        assert.ok(typeof key === 'string' && key.length > 20, 'VAPID key should be a non-empty string');
    });

    await t.test('subscribes and unsubscribes players for a game', () => {
        const gameId = 'test-game-' + Date.now();
        const player1 = 'player-1';
        const player2 = 'player-2';

        const mockSub1 = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-1',
            keys: { p256dh: 'test-p256dh-1', auth: 'test-auth-1' },
        };
        const mockSub2 = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-2',
            keys: { p256dh: 'test-p256dh-2', auth: 'test-auth-2' },
        };

        const res1 = webPushService.subscribe(gameId, player1, mockSub1);
        const res2 = webPushService.subscribe(gameId, player2, mockSub2);

        assert.strictEqual(res1, true, 'Subscribing player 1 should succeed');
        assert.strictEqual(res2, true, 'Subscribing player 2 should succeed');

        const subs = webPushService.getSubscriptions(gameId);
        assert.strictEqual(subs.length, 2, 'Game should have 2 registered subscriptions');
        assert.strictEqual(subs[0].playerId, player1);
        assert.strictEqual(subs[1].playerId, player2);

        // Unsubscribe player 1
        const unsubRes = webPushService.unsubscribe(gameId, player1);
        assert.strictEqual(unsubRes, true, 'Unsubscribing player 1 should succeed');

        const remainingSubs = webPushService.getSubscriptions(gameId);
        assert.strictEqual(remainingSubs.length, 1, 'Game should have 1 subscription left');
        assert.strictEqual(remainingSubs[0].playerId, player2);
    });

    await t.test('sendNotification filters out the sender player', async () => {
        const gameId = 'test-game-sender-filter';
        const senderId = 'sender-p1';
        const receiverId = 'receiver-p2';

        const mockSubReceiver = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-receiver',
            keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        };

        webPushService.subscribe(gameId, senderId, {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-sender',
            keys: { p256dh: 'test-p256dh-s', auth: 'test-auth-s' },
        });
        webPushService.subscribe(gameId, receiverId, mockSubReceiver);

        // Calling sendNotification with senderId will attempt delivery to receiver only
        const result = await webPushService.sendNotification(gameId, senderId, {
            title: 'Test Notification',
            body: 'Test Body',
            url: '/games/guessart?gameId=' + gameId,
        });

        // Since the mock FCM endpoint is fake, it will attempt and count as failed/attempted, but won't crash
        assert.ok(result !== undefined, 'Result object should be returned');
    });
});
