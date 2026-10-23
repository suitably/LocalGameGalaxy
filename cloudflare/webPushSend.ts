/**
 * Stateless Web Push sender for the app worker [ID: CF-WEB-PUSH-SEND]
 *
 * - GET  /api/push/vapid-public-key → `{ publicKey }` (secret `VAPID_PUBLIC_KEY`).
 * - POST /api/push/send `{ subscription, title, body, url?, tag?, icon? }` → one encrypted push
 *   to the browser's push service, signed with `VAPID_PRIVATE_KEY`.
 *
 * Nothing is stored: the sending device passes the receiving device's subscription, which travels
 * with that player's seat in the game snapshot. Only push-service endpoints are accepted, the
 * notification text is size-limited and its link must point at this site.
 */
import { sendWebPush, type PushTarget } from './webPush';

export interface PushEnv {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  /** Contact for push services (`mailto:` or https URL); defaults to the site origin. */
  VAPID_SUBJECT?: string;
}

export interface SendRequest {
  subscription: PushTarget;
  payload: { title: string; body: string; url: string; tag?: string; icon?: string };
}

const MAX_TEXT = 300;
const B64URL = /^[A-Za-z0-9_-]+$/;

/** Push services of Chrome/Android (FCM), Firefox, Edge/Windows and Safari/iOS. */
export function isPushServiceHost(hostname: string): boolean {
  return (
    hostname === 'fcm.googleapis.com' ||
    hostname === 'android.googleapis.com' ||
    hostname.endsWith('.push.services.mozilla.com') ||
    hostname.endsWith('.notify.windows.com') ||
    hostname === 'web.push.apple.com' ||
    hostname.endsWith('.push.apple.com')
  );
}

const text = (value: unknown, max = MAX_TEXT): string | null =>
  typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;

/** Checks a send request; `null` when anything is missing, too long or not allowed. */
export function parseSendRequest(raw: unknown, siteOrigin: string): SendRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const { subscription, title, body, url, tag, icon } = raw as Record<string, unknown>;
  const sub = subscription as SendRequest['subscription'] | undefined;
  let endpoint: URL;
  try {
    endpoint = new URL(sub?.endpoint ?? '');
  } catch {
    return null;
  }
  if (endpoint.protocol !== 'https:' || !isPushServiceHost(endpoint.hostname)) return null;
  const { p256dh, auth } = sub?.keys ?? ({} as Partial<SendRequest['subscription']['keys']>);
  if (!text(p256dh, 200) || !text(auth, 100) || !B64URL.test(p256dh!) || !B64URL.test(auth!))
    return null;

  const t = text(title);
  const b = text(body);
  if (!t || !b) return null;
  // The click opens this site only, never a link chosen by the sender.
  let target: URL;
  try {
    target = new URL(typeof url === 'string' ? url : '/', siteOrigin);
  } catch {
    return null;
  }
  if (target.origin !== siteOrigin) return null;

  return {
    subscription: { endpoint: endpoint.toString(), keys: { p256dh: p256dh!, auth: auth! } },
    payload: {
      title: t,
      body: b,
      url: target.toString(),
      tag: text(tag, 100) ?? undefined,
      icon: typeof icon === 'string' && icon.startsWith('/') ? icon : undefined,
    },
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function handlePush(request: Request, env: PushEnv): Promise<Response> {
  const url = new URL(request.url);
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY)
    return json(503, { error: 'web push not configured' });

  if (url.pathname === '/api/push/vapid-public-key' && request.method === 'GET')
    return new Response(JSON.stringify({ publicKey: env.VAPID_PUBLIC_KEY.trim() }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });

  if (url.pathname === '/api/push/send' && request.method === 'POST') {
    const raw = await request.text();
    if (raw.length > 4096) return json(413, { error: 'request too large' });
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json(400, { error: 'invalid json' });
    }
    const send = parseSendRequest(parsed, url.origin);
    if (!send) return json(400, { error: 'invalid push request' });
    let result: { status: number; detail: string };
    try {
      result = await sendWebPush(send.subscription, JSON.stringify(send.payload), {
        // Pasted secrets often carry a trailing newline or space.
        publicKey: env.VAPID_PUBLIC_KEY.trim(),
        privateKey: env.VAPID_PRIVATE_KEY.trim(),
        subject: env.VAPID_SUBJECT?.trim() || url.origin,
      });
    } catch (err) {
      // Signing or encryption failed here (e.g. the two keys do not belong together).
      return json(502, { error: 'push not sent', reason: String((err as Error)?.message ?? err) });
    }
    const { status, detail } = result;
    // 404/410 from the push service: the subscription is gone; the sender falls back to ntfy.
    if (status === 404 || status === 410) return json(410, { error: 'subscription gone' });
    if (status < 200 || status >= 300)
      return json(502, { error: 'push service refused', status, detail });
    return json(200, { ok: true });
  }
  return json(404, { error: 'not found' });
}
