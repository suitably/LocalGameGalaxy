/**
 * Authenticated requests to the companion server (helper) [ID: LIB-COMPANION-HTTP]
 */
import { getHelperToken, getHelperUrl } from './companionSettings';

/** Absolute URL for a server path such as `/media?...`. */
export function companionUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${getHelperUrl().replace(/\/$/, '')}${path}`;
}

/** JSON request with the helper token; throws the server's `error` text on failure. */
export async function companionRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getHelperToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(companionUrl(path), { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error || `HTTP ${res.status}`);
  return body as T;
}

export const jsonBody = (method: string, value: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});
