/**
 * Client for the draw pot API [ID: DRAWPOT-API]
 *
 * Two backends serve the same API (`server/src/plugins/drawpot/core/http.ts`):
 * - `cloud`: the Cloudflare worker. The hosted site calls its own origin (so PR previews use
 *   their own pots); the Android app, `npm run dev` and self-hosted copies call the public site,
 *   unless `VITE_DRAWPOT_API` names another origin.
 * - `companion`: the user's Nexumia server (plugin `drawpot`). Creating needs its token; links
 *   carry the server address as `?server=` so participants reach the same server.
 */
import { PUBLIC_APP_URL } from '../../../lib/publicAppUrl';
import { getHelperToken } from '../../../lib/companion/companionSettings';
import type {
  CreateDrawPotInput,
  CreateDrawPotResponse,
  DrawPotAdminAction,
  DrawPotAdminView,
  DrawPotError,
  DrawPotErrorCode,
  DrawPotPublicView,
  DrawResponse,
} from '../../../../server/src/plugins/drawpot/core/types';

export type {
  CreateDrawPotInput,
  DrawPotAdminView,
  DrawPotErrorCode,
  DrawPotPublicView,
  DrawPotSettings,
  DrawPotEntry,
  DrawRecord,
  DrawPotMode,
} from '../../../../server/src/plugins/drawpot/core/types';

export type DrawPotBackend = { kind: 'cloud' } | { kind: 'companion'; url: string };
export const CLOUD_BACKEND: DrawPotBackend = { kind: 'cloud' };

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

const trimUrl = (url: string) => url.replace(/\/+$/, '');

/** `?server=` value → backend; anything but an http(s) URL means the cloud. */
export function backendFromServer(server: string | null | undefined): DrawPotBackend {
  if (!server) return CLOUD_BACKEND;
  try {
    const url = new URL(server);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return CLOUD_BACKEND;
    return { kind: 'companion', url: trimUrl(url.origin + url.pathname) };
  } catch {
    return CLOUD_BACKEND;
  }
}

export const serverOf = (b: DrawPotBackend): string | undefined =>
  b.kind === 'companion' ? b.url : undefined;

/** Whether people outside this network can reach the server (public https address). */
export function isPublicServerUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:') return false;
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)|\.local$/.test(
      hostname,
    );
  } catch {
    return false;
  }
}

/** In-app path of a pot page, with `?server=` for companion pots. */
export function potPath(page: 'p' | 'admin', potId: string, server?: string): string {
  return `/games/drawpot/${page}/${potId}${server ? `?server=${encodeURIComponent(server)}` : ''}`;
}

export const participantLink = (potId: string, backend: DrawPotBackend): string =>
  `${apiOrigin()}${potPath('p', potId, serverOf(backend))}`;

/** Host link; the key sits in the fragment, which browsers never send to a server. */
export const adminLink = (potId: string, adminKey: string, backend: DrawPotBackend): string =>
  `${apiOrigin()}${potPath('admin', potId, serverOf(backend))}#key=${encodeURIComponent(adminKey)}`;

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

async function request<T>(
  backend: DrawPotBackend,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = backend.kind === 'cloud' ? apiOrigin() : backend.url;
  let res: Response;
  try {
    res = await fetch(`${base}/api/drawpot${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new DrawPotApiError('network', 0);
  }
  const body = (await res.json().catch(() => ({}))) as T | DrawPotError;
  if (!res.ok) {
    const err = body as DrawPotError;
    const code = res.status === 401 ? 'forbidden' : (err.error ?? 'unavailable');
    throw new DrawPotApiError(code, res.status, err);
  }
  return body as T;
}

const admin = (adminKey: string) => ({ 'X-Admin-Key': adminKey });

function creatorAuth(backend: DrawPotBackend): Record<string, string> {
  const token = backend.kind === 'companion' ? getHelperToken() : '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const drawPotApi = {
  create: (b: DrawPotBackend, input: CreateDrawPotInput) =>
    request<CreateDrawPotResponse>(b, '', {
      method: 'POST',
      headers: creatorAuth(b),
      body: JSON.stringify(input),
    }),
  view: (b: DrawPotBackend, potId: string, participantId: string) =>
    request<DrawPotPublicView>(b, `/${potId}?participant=${encodeURIComponent(participantId)}`),
  draw: (b: DrawPotBackend, potId: string, participantId: string, identityId?: string) =>
    request<DrawResponse>(b, `/${potId}/draw`, {
      method: 'POST',
      body: JSON.stringify({ participantId, identityId }),
    }),
  adminView: (b: DrawPotBackend, potId: string, adminKey: string) =>
    request<DrawPotAdminView>(b, `/${potId}/admin`, { headers: admin(adminKey) }),
  adminAction: (b: DrawPotBackend, potId: string, adminKey: string, action: DrawPotAdminAction) =>
    request<DrawPotAdminView>(b, `/${potId}/admin`, {
      method: 'POST',
      headers: admin(adminKey),
      body: JSON.stringify({ action }),
    }),
  remove: (b: DrawPotBackend, potId: string, adminKey: string) =>
    request<{ ok: true }>(b, `/${potId}`, { method: 'DELETE', headers: admin(adminKey) }),
};
