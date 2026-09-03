/**
 * worker.ts - Standalone Cloudflare Worker Web Push Relay for LocalGameGalaxy
 *
 * Provides a 24/7 free, zero-config push relay for games like GuessArt.
 * Handles VAPID signing, subscription storage (KV/Memory), and Web Push delivery
 * with proper RFC 8291 encryption and RFC 8292 VAPID authentication.
 */

import { sendWebPush, generateVapidKeys, type WebPushOptions } from './webpush';

export interface Env {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  PUSH_KV?: KVNamespace;
}

interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// In-memory subscription store fallback (lost on worker restart without KV)
const memorySubscriptions = new Map<string, Map<string, StoredPushSubscription>>();
const DEFAULT_VAPID_KEYS = {
  publicKey: 'BHrLPvbicI8okK9MJHcncBp3JYl998H_ubF_3BYtmPuWnn0IVPIiv0ScLHQNjNdsZVT5sOZpjpRF4WMVOm2KhOA',
  privateKey: 'myZY4l9wcTu2pSg_txF-kQpSa3N_T0nyUqzExPraEFM',
};

async function getOrInitVapidKeys(env: Env): Promise<{ publicKey: string; privateKey: string }> {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return { publicKey: env.VAPID_PUBLIC_KEY.trim(), privateKey: env.VAPID_PRIVATE_KEY.trim() };
  }

  if (cachedVapidKeys) {
    return cachedVapidKeys;
  }

  if (env.PUSH_KV) {
    const stored = await env.PUSH_KV.get('config:vapid_keys');
    if (stored) {
      try {
        cachedVapidKeys = JSON.parse(stored);
        return cachedVapidKeys!;
      } catch {
        // Corrupt KV, regenerate
      }
    }
  }

  // Stable default keys guarantee identical VAPID key across all isolates/cold starts
  cachedVapidKeys = DEFAULT_VAPID_KEYS;

  if (env.PUSH_KV) {
    await env.PUSH_KV.put('config:vapid_keys', JSON.stringify(DEFAULT_VAPID_KEYS));
  }

  return DEFAULT_VAPID_KEYS;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health & diagnostic endpoint
    if (path === '' || path === '/health') {
      return jsonResponse({
        status: 'ok',
        service: 'LocalGameGalaxy Push Relay',
        kvBound: Boolean(env.PUSH_KV),
        storageType: env.PUSH_KV ? 'Cloudflare KV (persistent)' : 'In-Memory (ephemeral, cold starts lose state)',
      });
    }

    // 1. GET VAPID Public Key (auto-generated or configured)
    if (path === '/vapid-public-key' || path === '/api/push/vapid-public-key') {
      const keys = await getOrInitVapidKeys(env);
      return jsonResponse({ publicKey: keys.publicKey });
    }

    // 2. POST Subscribe
    if ((path === '/subscribe' || path === '/api/push/subscribe') && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const { gameId, playerId, subscription } = body as {
        gameId?: string;
        playerId?: string;
        subscription?: StoredPushSubscription;
      };

      if (!gameId || !playerId || !subscription?.endpoint) {
        return jsonResponse({ error: 'Missing gameId, playerId or subscription' }, 400);
      }

      if (env.PUSH_KV) {
        await env.PUSH_KV.put(`sub:${gameId}:${playerId}`, JSON.stringify(subscription), {
          expirationTtl: 7 * 24 * 60 * 60, // 7 days
        });
      } else {
        if (!memorySubscriptions.has(gameId)) {
          memorySubscriptions.set(gameId, new Map());
        }
        memorySubscriptions.get(gameId)!.set(playerId, subscription);
      }

      return jsonResponse({ success: true });
    }

    // 3. POST Unsubscribe
    if ((path === '/unsubscribe' || path === '/api/push/unsubscribe') && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const { gameId, playerId } = body as { gameId?: string; playerId?: string };

      if (env.PUSH_KV && gameId && playerId) {
        await env.PUSH_KV.delete(`sub:${gameId}:${playerId}`);
      } else if (gameId && memorySubscriptions.has(gameId)) {
        memorySubscriptions.get(gameId)!.delete(playerId || '');
      }

      return jsonResponse({ success: true });
    }

    // 4. POST Notify — Dispatch Web Push with VAPID + encryption
    if ((path === '/notify' || path === '/api/push/notify') && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const {
        gameId,
        senderPlayerId,
        title,
        body: textBody,
        url: targetUrl,
        action,
        targetPlayerId,
      } = body as {
        gameId?: string;
        senderPlayerId?: string;
        title?: string;
        body?: string;
        url?: string;
        action?: string;
        targetPlayerId?: string;
      };

      if (!gameId) {
        return jsonResponse({ error: 'Missing gameId' }, 400);
      }

      // Obtain VAPID keys (configured via secrets or auto-generated)
      const keys = await getOrInitVapidKeys(env);

      const pushOptions: WebPushOptions = {
        vapidPublicKey: keys.publicKey,
        vapidPrivateKey: keys.privateKey,
        vapidSubject: env.VAPID_SUBJECT || 'https://github.com/suitably/LocalGameGalaxy',
      };

      // Collect target subscriptions
      const targets: { playerId: string; sub: StoredPushSubscription }[] = [];

      if (env.PUSH_KV) {
        const list = await env.PUSH_KV.list({ prefix: `sub:${gameId}:` });
        for (const key of list.keys) {
          const pId = key.name.split(':')[2];
          if (senderPlayerId && pId === senderPlayerId) continue;
          if (targetPlayerId && pId !== targetPlayerId) continue;

          const raw = await env.PUSH_KV.get(key.name);
          if (raw) {
            targets.push({ playerId: pId, sub: JSON.parse(raw) });
          }
        }
      } else if (memorySubscriptions.has(gameId)) {
        for (const [pId, sub] of memorySubscriptions.get(gameId)!.entries()) {
          if (senderPlayerId && pId === senderPlayerId) continue;
          if (targetPlayerId && pId !== targetPlayerId) continue;
          targets.push({ playerId: pId, sub });
        }
      }

      const payloadString = JSON.stringify({
        title: title || 'GuessArt: Du bist dran!',
        body: textBody || 'Dein Mitspieler hat seinen Zug beendet. Jetzt raten!',
        url: targetUrl || '/',
        tag: `guessart-${gameId}`,
        icon: '/pwa/icon_full.png',
        action: action || 'turn',
      });

      let sent = 0;
      let failed = 0;
      const expiredPlayerIds: string[] = [];

      // Send to all targets in parallel
      const results = await Promise.allSettled(
        targets.map(async (target) => {
          try {
            const result = await sendWebPush(target.sub, payloadString, pushOptions);
            if (result.success) {
              sent++;
            } else {
              failed++;
              // 404 or 410 means the subscription is expired/unsubscribed
              if (result.statusCode === 404 || result.statusCode === 410) {
                expiredPlayerIds.push(target.playerId);
              }
            }
            return { playerId: target.playerId, ...result };
          } catch (err) {
            failed++;
            return { playerId: target.playerId, success: false, error: String(err) };
          }
        }),
      );

      // Clean up expired subscriptions
      for (const pId of expiredPlayerIds) {
        if (env.PUSH_KV) {
          await env.PUSH_KV.delete(`sub:${gameId}:${pId}`);
        } else if (memorySubscriptions.has(gameId)) {
          memorySubscriptions.get(gameId)!.delete(pId);
        }
      }

      const deliveryDetails = results.map((r) =>
        r.status === 'fulfilled' ? r.value : { success: false, error: String(r.reason) },
      );

      return jsonResponse({
        success: true,
        sent,
        failed,
        totalTargets: targets.length,
        details: deliveryDetails,
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
