/**
 * worker.ts - Standalone Cloudflare Worker Web Push & ntfy Relay for LocalGameGalaxy
 *
 * Provides a 24/7 free, zero-config hybrid push relay for games like GuessArt & Geschichtenschreiber.
 * Supports:
 * - RFC 8291 Web Push encryption & RFC 8292 VAPID authentication (Google/Mozilla/Apple standard)
 * - 100% De-Googled push via ntfy
 * - In-Memory and Cloudflare KV persistent subscription storage
 */

import { sendWebPush, type WebPushOptions } from './webpush';

export interface Env {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  NTFY_SERVER?: string;
  PUSH_KV?: KVNamespace;
}

export interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StoredRegistration {
  method?: 'auto' | 'webpush' | 'ntfy' | 'both';
  subscription?: StoredPushSubscription;
  ntfyTopic?: string;
}

let cachedVapidKeys: { publicKey: string; privateKey: string } | null = null;

// In-memory subscription store fallback (lost on worker restart without KV)
const memorySubscriptions = new Map<string, Map<string, StoredRegistration>>();
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

function sanitizeNtfyTopic(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
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
        ntfyServer: env.NTFY_SERVER || 'https://ntfy.sh',
        hybridSupported: true,
      });
    }

    // 1. GET VAPID Public Key (auto-generated or configured)
    if (path === '/vapid-public-key' || path === '/api/push/vapid-public-key') {
      const keys = await getOrInitVapidKeys(env);
      return jsonResponse({ publicKey: keys.publicKey });
    }

    // 2. POST Subscribe
    if ((path === '/subscribe' || path === '/api/push/subscribe') && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const {
        gameId,
        playerId,
        subscription,
        method = 'auto',
        ntfyTopic,
      } = body as {
        gameId?: string;
        playerId?: string;
        subscription?: StoredPushSubscription;
        method?: 'auto' | 'webpush' | 'ntfy' | 'both';
        ntfyTopic?: string;
      };

      if (!gameId || !playerId) {
        return jsonResponse({ error: 'Missing gameId or playerId' }, 400);
      }

      if (!subscription?.endpoint && method !== 'ntfy' && !ntfyTopic) {
        return jsonResponse({ error: 'Missing push subscription or ntfyTopic' }, 400);
      }

      const cleanTopic = ntfyTopic
        ? sanitizeNtfyTopic(ntfyTopic)
        : `lgg-${sanitizeNtfyTopic(gameId)}-${sanitizeNtfyTopic(playerId)}`;

      const registration: StoredRegistration = {
        method,
        subscription: subscription?.endpoint ? subscription : undefined,
        ntfyTopic: cleanTopic,
      };

      if (env.PUSH_KV) {
        await env.PUSH_KV.put(`sub:${gameId}:${playerId}`, JSON.stringify(registration), {
          expirationTtl: 7 * 24 * 60 * 60, // 7 days
        });
      } else {
        if (!memorySubscriptions.has(gameId)) {
          memorySubscriptions.set(gameId, new Map());
        }
        memorySubscriptions.get(gameId)!.set(playerId, registration);
      }

      return jsonResponse({ success: true, ntfyTopic: cleanTopic });
    }

    // 3. POST Unsubscribe
    if ((path === '/unsubscribe' || path === '/api/push/unsubscribe') && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const { gameId, playerId } = body as { gameId?: string; playerId?: string };

      if (env.PUSH_KV && gameId && playerId) {
        await env.PUSH_KV.delete(`sub:${gameId}:${playerId}`);
      } else if (gameId && memorySubscriptions.has(gameId)) {
        memorySubscriptions.get(gameId)!.delete(playerId || '');
      }

      return jsonResponse({ success: true });
    }

    // 4. POST Notify — Dispatch Hybrid Push (Web Push + ntfy)
    if ((path === '/notify' || path === '/api/push/notify') && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const {
        gameId,
        senderPlayerId,
        title,
        body: textBody,
        url: targetUrl,
        action,
        targetPlayerId,
        ntfyTopic: customTopic,
      } = body as {
        gameId?: string;
        senderPlayerId?: string;
        title?: string;
        body?: string;
        url?: string;
        action?: string;
        targetPlayerId?: string;
        ntfyTopic?: string;
      };

      if (!gameId) {
        return jsonResponse({ error: 'Missing gameId' }, 400);
      }

      const notifTitle = title || 'LocalGameGalaxy: Du bist dran!';
      const notifBody = textBody || 'Dein Mitspieler hat seinen Zug beendet. Jetzt mitspielen!';
      const notifUrl = targetUrl || '/';
      const ntfyServer = env.NTFY_SERVER || 'https://ntfy.sh';

      // Obtain VAPID keys for Web Push
      const keys = await getOrInitVapidKeys(env);
      const pushOptions: WebPushOptions = {
        vapidPublicKey: keys.publicKey,
        vapidPrivateKey: keys.privateKey,
        vapidSubject: env.VAPID_SUBJECT || 'https://github.com/suitably/LocalGameGalaxy',
      };

      // Collect target registrations from KV or Memory
      const targets: { playerId: string; reg: StoredRegistration }[] = [];

      if (env.PUSH_KV) {
        const list = await env.PUSH_KV.list({ prefix: `sub:${gameId}:` });
        for (const key of list.keys) {
          const pId = key.name.split(':')[2];
          if (senderPlayerId && pId === senderPlayerId) continue;
          if (targetPlayerId && pId !== targetPlayerId) continue;

          const raw = await env.PUSH_KV.get(key.name);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              // Support legacy format where raw was just StoredPushSubscription
              if (parsed.endpoint) {
                targets.push({ playerId: pId, reg: { method: 'webpush', subscription: parsed } });
              } else {
                targets.push({ playerId: pId, reg: parsed });
              }
            } catch {
              // Ignore corrupted record
            }
          }
        }
      } else if (memorySubscriptions.has(gameId)) {
        for (const [pId, reg] of memorySubscriptions.get(gameId)!.entries()) {
          if (senderPlayerId && pId === senderPlayerId) continue;
          if (targetPlayerId && pId !== targetPlayerId) continue;
          targets.push({ playerId: pId, reg });
        }
      }

      // 4A. Dispatch Web Push to eligible subscribers
      const webPushPayload = JSON.stringify({
        title: notifTitle,
        body: notifBody,
        url: notifUrl,
        tag: `lgg-${gameId}`,
        icon: '/pwa/icon_full.png',
        action: action || 'turn',
      });

      let webPushSent = 0;
      let webPushFailed = 0;
      const expiredPlayerIds: string[] = [];

      const webPushTargets = targets.filter(
        (t) => t.reg.subscription?.endpoint && t.reg.method !== 'ntfy',
      );

      const webPushResults = await Promise.allSettled(
        webPushTargets.map(async (target) => {
          try {
            const result = await sendWebPush(target.reg.subscription!, webPushPayload, pushOptions);
            if (result.success) {
              webPushSent++;
            } else {
              webPushFailed++;
              if (result.statusCode === 404 || result.statusCode === 410) {
                expiredPlayerIds.push(target.playerId);
              }
            }
            return { playerId: target.playerId, channel: 'webpush', ...result };
          } catch (err) {
            webPushFailed++;
            return { playerId: target.playerId, channel: 'webpush', success: false, error: String(err) };
          }
        }),
      );

      // Clean up expired Web Push subscriptions
      for (const pId of expiredPlayerIds) {
        if (env.PUSH_KV) {
          await env.PUSH_KV.delete(`sub:${gameId}:${pId}`);
        } else if (memorySubscriptions.has(gameId)) {
          memorySubscriptions.get(gameId)!.delete(pId);
        }
      }

      // 4B. Dispatch ntfy Push (100% De-Googled fallback / hybrid)
      // Collect all ntfy topics to ping
      const ntfyTopics = new Set<string>();

      if (customTopic) {
        ntfyTopics.add(sanitizeNtfyTopic(customTopic));
      }

      if (targetPlayerId) {
        ntfyTopics.add(`lgg-${sanitizeNtfyTopic(gameId)}-${sanitizeNtfyTopic(targetPlayerId)}`);
      } else {
        ntfyTopics.add(`lgg-${sanitizeNtfyTopic(gameId)}`);
      }

      // Add player-specific registered topics
      for (const t of targets) {
        if (t.reg.ntfyTopic) {
          ntfyTopics.add(sanitizeNtfyTopic(t.reg.ntfyTopic));
        }
      }

      let ntfySent = 0;
      let ntfyFailed = 0;

      const ntfyResults = await Promise.allSettled(
        Array.from(ntfyTopics).map(async (topic) => {
          try {
            const ntfyRes = await fetch(`${ntfyServer.replace(/\/$/, '')}/${topic}`, {
              method: 'POST',
              headers: {
                Title: notifTitle,
                Click: notifUrl,
                Priority: 'high',
                Tags: 'game_die,tada',
              },
              body: notifBody,
            });
            if (ntfyRes.ok) {
              ntfySent++;
              return { topic, channel: 'ntfy', success: true, status: ntfyRes.status };
            } else {
              ntfyFailed++;
              return { topic, channel: 'ntfy', success: false, status: ntfyRes.status };
            }
          } catch (err) {
            ntfyFailed++;
            return { topic, channel: 'ntfy', success: false, error: String(err) };
          }
        }),
      );

      const allDetails = [
        ...webPushResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { channel: 'webpush', success: false, error: String(r.reason) },
        ),
        ...ntfyResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { channel: 'ntfy', success: false, error: String(r.reason) },
        ),
      ];

      return jsonResponse({
        success: webPushSent > 0 || ntfySent > 0 || (webPushTargets.length === 0 && ntfyTopics.size > 0),
        webPushSent,
        webPushFailed,
        ntfySent,
        ntfyFailed,
        totalTargets: targets.length,
        ntfyTopicsCount: ntfyTopics.size,
        details: allDetails,
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
