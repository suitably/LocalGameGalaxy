/**
 * Client for the draw pot API in the Cloudflare worker [ID: DRAWPOT-API]
 *
 * The hosted site calls its own origin (so PR previews use their own pots). Everything else —
 * the Android app, `npm run dev`, self-hosted copies — calls the public site, unless
 * `VITE_DRAWPOT_API` names another origin. Share links point at the same origin as the API.
 */
import { PUBLIC_APP_URL } from '../../../lib/publicAppUrl';
import type {
  CreateDrawPotInput,
  CreateDrawPotResponse,
  DrawPotAdminAction,
  DrawPotAdminView,
  DrawPotError,
  DrawPotErrorCode,
  DrawPotPublicView,
  DrawResponse,
} from '../../../../cloudflare/drawPot/types';

export type {
  CreateDrawPotInput,
  DrawPotAdminView,
  DrawPotErrorCode,
  DrawPotPublicView,
  DrawPotSettings,
  DrawPotEntry,
  DrawRecord,
  DrawPotMode,
} from '../../../../cloudflare/drawPot/types';

/** True when `hostname` serves the worker itself (production, workers.dev previews). */
export const isWorkerHost = (hostname: string): boolean =>
  hostname === 'nexumia.de' ||
  hostname.endsWith('.nexumia.de') ||
  hostname.endsWith('.workers.dev');

export function apiOrigin(): string {
  const override = import.meta.env.VITE_DRAWPOT_API as string | undefined;
  if (override) return override.replace(/\/+$/, '');
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    isWorkerHost(window.location.hostname)
  )
    return window.location.origin;
  return PUBLIC_APP_URL;
}

export const participantLink = (potId: string): string => `${apiOrigin()}/games/drawpot/p/${potId}`;

/** Host link; the key sits in the fragment, which browsers never send to a server. */
export const adminLink = (potId: string, adminKey: string): string =>
  `${apiOrigin()}/games/drawpot/admin/${potId}#key=${encodeURIComponent(adminKey)}`;

export class DrawPotApiError extends Error {
  readonly code: DrawPotErrorCode | 'network';
  readonly status: number;
  readonly payload?: DrawPotError;

  constructor(code: DrawPotErrorCode | 'network', status: number, payload?: DrawPotError) {
    super(code);
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiOrigin()}/api/drawpot${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new DrawPotApiError('network', 0);
  }
  const body = (await res.json().catch(() => ({}))) as T | DrawPotError;
  if (!res.ok) {
    const err = body as DrawPotError;
    throw new DrawPotApiError(err.error ?? 'unavailable', res.status, err);
  }
  return body as T;
}

const admin = (adminKey: string) => ({ 'X-Admin-Key': adminKey });

export const drawPotApi = {
  create: (input: CreateDrawPotInput) =>
    request<CreateDrawPotResponse>('', { method: 'POST', body: JSON.stringify(input) }),
  view: (potId: string, participantId: string) =>
    request<DrawPotPublicView>(`/${potId}?participant=${encodeURIComponent(participantId)}`),
  draw: (potId: string, participantId: string, identityId?: string) =>
    request<DrawResponse>(`/${potId}/draw`, {
      method: 'POST',
      body: JSON.stringify({ participantId, identityId }),
    }),
  adminView: (potId: string, adminKey: string) =>
    request<DrawPotAdminView>(`/${potId}/admin`, { headers: admin(adminKey) }),
  adminAction: (potId: string, adminKey: string, action: DrawPotAdminAction) =>
    request<DrawPotAdminView>(`/${potId}/admin`, {
      method: 'POST',
      headers: admin(adminKey),
      body: JSON.stringify({ action }),
    }),
  remove: (potId: string, adminKey: string) =>
    request<{ ok: true }>(`/${potId}`, { method: 'DELETE', headers: admin(adminKey) }),
};
