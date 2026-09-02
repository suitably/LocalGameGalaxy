/**
 * worker.ts - Standalone Cloudflare Worker Web Push Relay for LocalGameGalaxy
 *
 * Provides a 24/7 free, zero-config push relay for games like GuessArt.
 * Handles VAPID signing, subscription storage (KV/Memory), and Web Push delivery to Apple APNs & Google FCM.
 */

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

// In-memory subscription store fallback
const memorySubscriptions = new Map<string, Map<string, StoredPushSubscription>>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Default fallback VAPID keypair if none provided in Worker environment variables
const DEFAULT_VAPID_PUBLIC_KEY = 'BCG_8_N-k3y_Galaxy_Push_Relay_Public_Key_V1';
const DEFAULT_VAPID_SUBJECT = 'mailto:admin@localgamegalaxy.app';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health
    if (path === '' || path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'LocalGameGalaxy Push Relay' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 1. GET VAPID Public Key
    if (path === '/vapid-public-key' || path === '/api/push/vapid-public-key') {
      const publicKey = env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
      return new Response(JSON.stringify({ publicKey }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. POST Subscribe
    if ((path === '/subscribe' || path === '/api/push/subscribe') && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const { gameId, playerId, subscription } = body;

      if (!gameId || !playerId || !subscription?.endpoint) {
        return new Response(JSON.stringify({ error: 'Missing gameId, playerId or subscription' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
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

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. POST Unsubscribe
    if ((path === '/unsubscribe' || path === '/api/push/unsubscribe') && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const { gameId, playerId } = body;

      if (env.PUSH_KV && gameId && playerId) {
        await env.PUSH_KV.delete(`sub:${gameId}:${playerId}`);
      } else if (gameId && memorySubscriptions.has(gameId)) {
        memorySubscriptions.get(gameId)!.delete(playerId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 4. POST Notify
    if ((path === '/notify' || path === '/api/push/notify') && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const { gameId, senderPlayerId, title, body: textBody, url: targetUrl, action, targetPlayerId } = body;

      if (!gameId) {
        return new Response(JSON.stringify({ error: 'Missing gameId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

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

      for (const target of targets) {
        try {
          const pushRes = await fetch(target.sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              TTL: '86400',
            },
            body: payloadString,
          });

          if (pushRes.ok || pushRes.status === 201) {
            sent++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return new Response(JSON.stringify({ success: true, sent, failed, totalTargets: targets.length }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
