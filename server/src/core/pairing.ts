import crypto from 'node:crypto';
import type { Context, Hono } from 'hono';
import type { ApiKey, HonoEnv } from './types';
import { requireAuth, requireMasterToken } from './auth';

/** How long a pairing code stays valid. */
export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
/** Failed redemptions allowed per client in one window before it gets 429. */
export const PAIRING_MAX_ATTEMPTS = 5;
export const PAIRING_WINDOW_MS = 60 * 1000;
/** Default web app that the pairing URL points to (override with APP_URL). */
export const DEFAULT_APP_URL = 'https://nexumia.de';

export interface PairingCode {
  code: string;
  expiresAt: number;
}

export type RedeemResult = 'ok' | 'invalid' | 'rate_limited';

export interface PairingStoreOptions {
  ttlMs?: number;
  maxAttempts?: number;
  windowMs?: number;
  now?: () => number;
}

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * One-time pairing codes (in memory only). At most one code is live: issuing a new one
 * replaces the old. A code is single-use and expires after `ttlMs`; failed redemptions are
 * rate-limited per client so the code cannot be brute-forced.
 */
export class PairingStore {
  private current: PairingCode | null = null;
  private readonly failures = new Map<string, { count: number; windowStart: number }>();
  private readonly ttlMs: number;
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: PairingStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? PAIRING_CODE_TTL_MS;
    this.maxAttempts = options.maxAttempts ?? PAIRING_MAX_ATTEMPTS;
    this.windowMs = options.windowMs ?? PAIRING_WINDOW_MS;
    this.now = options.now ?? Date.now;
  }

  issue(): PairingCode {
    this.current = {
      code: crypto.randomBytes(12).toString('hex'),
      expiresAt: this.now() + this.ttlMs,
    };
    return { ...this.current };
  }

  redeem(code: string, clientId: string): RedeemResult {
    const now = this.now();
    const entry = this.failures.get(clientId);
    if (entry && now - entry.windowStart < this.windowMs && entry.count >= this.maxAttempts) {
      return 'rate_limited';
    }

    const live = this.current;
    if (live && live.expiresAt <= now) this.current = null;
    if (this.current && code && safeEqual(code, this.current.code)) {
      this.current = null; // single use
      this.failures.delete(clientId);
      return 'ok';
    }

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.failures.set(clientId, { count: 1, windowStart: now });
    } else {
      entry.count += 1;
    }
    return 'invalid';
  }
}

export const pairingStore = new PairingStore();

/** URL the server prints (and opens on first start): the app's server settings with the code. */
export const buildPairingUrl = (appUrl: string, serverUrl: string, code: string): string => {
  const base = appUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({ pair: serverUrl, code });
  return `${base}/settings/connectivity?${params.toString()}`;
};

type CreatePairedKey = (name: string) => ApiKey;

const clientIdOf = (c: Context<HonoEnv>): string => {
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)
    ?.incoming;
  return incoming?.socket?.remoteAddress || 'unknown';
};

const sanitizeDeviceName = (raw: unknown): string => {
  const name =
    typeof raw === 'string'
      ? [...raw]
          .filter((ch) => ch.charCodeAt(0) >= 0x20)
          .join('')
          .trim()
      : '';
  return name ? `Paired: ${name.slice(0, 60)}` : 'Paired device';
};

/**
 * `POST /api/pair` (public): exchanges a one-time code for a new API key.
 * `POST /api/pair/code` (master token): issues a fresh code, e.g. to pair another device.
 */
export function registerPairingRoutes(
  app: Hono<HonoEnv>,
  store: PairingStore,
  createPairedKey: CreatePairedKey,
): void {
  app.post('/api/pair', async (c) => {
    c.header('Cache-Control', 'no-store');
    let body: { code?: unknown; name?: unknown } = {};
    try {
      body = await c.req.json();
    } catch {
      // Treated as an empty (invalid) code below.
    }
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const result = store.redeem(code, clientIdOf(c));
    if (result === 'rate_limited') {
      return c.json({ error: 'Too many pairing attempts. Try again later.' }, 429);
    }
    if (result === 'invalid') {
      return c.json({ error: 'Invalid or expired pairing code.' }, 401);
    }
    const key = createPairedKey(sanitizeDeviceName(body.name));
    return c.json({ token: key.token, keyId: key.id, name: key.name });
  });

  app.post('/api/pair/code', requireAuth, requireMasterToken, (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(store.issue());
  });
}
