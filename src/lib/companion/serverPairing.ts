/**
 * One-time server pairing [ID: LIB-COMPANION-PAIRING]
 *
 * On start the Nexumia server prints (and on first start opens) a link
 * `/settings/connectivity?pair=<serverUrl>&code=<one-time code>`. The app trades the code for
 * an API key via `POST /api/pair` and stores URL and key, so nobody copies the token by hand.
 */
import { setHelperActive, setHelperToken, setHelperUrl } from './companionSettings';

export interface PairingRequest {
  serverUrl: string;
  code: string;
}

export type PairingResult =
  | { status: 'paired'; token: string }
  | { status: 'invalid' }
  | { status: 'rate_limited' }
  | { status: 'unreachable' };

/** URL query keys of the pairing link. */
export const PAIRING_PARAMS = ['pair', 'code'] as const;

/** Reads a pairing link; null unless both keys are present and the server URL is http(s). */
export function parsePairingParams(params: URLSearchParams): PairingRequest | null {
  const rawUrl = params.get('pair')?.trim();
  const code = params.get('code')?.trim();
  if (!rawUrl || !code) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return { serverUrl: url.origin, code };
  } catch {
    return null;
  }
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * True when an https page talks to a plain-http server that is not loopback: browsers block
 * that as mixed content, so the user needs an https URL (tunnel) or the app over http.
 */
export function isMixedContentBlocked(serverUrl: string, pageProtocol: string): boolean {
  try {
    const url = new URL(serverUrl);
    return (
      pageProtocol === 'https:' && url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

/** Trades the one-time code for an API key. Never throws. */
export async function redeemPairingCode(
  { serverUrl, code }: PairingRequest,
  deviceName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PairingResult> {
  let res: Response;
  try {
    res = await fetchImpl(`${serverUrl}/api/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name: deviceName }),
    });
  } catch {
    return { status: 'unreachable' };
  }
  if (res.status === 429) return { status: 'rate_limited' };
  if (!res.ok) return { status: 'invalid' };
  const body = (await res.json().catch(() => null)) as { token?: unknown } | null;
  return typeof body?.token === 'string' && body.token
    ? { status: 'paired', token: body.token }
    : { status: 'invalid' };
}

/** Stores the paired server as this device's companion connection and tells open views. */
export function applyPairing(serverUrl: string, token: string): void {
  setHelperUrl(serverUrl);
  setHelperToken(token);
  setHelperActive(true);
  window.dispatchEvent(new Event('server_connection_updated'));
  window.dispatchEvent(new Event('melodiq_settings_updated'));
}

/** Short label for the API key the server creates, e.g. "Chrome on Windows". */
export function describeDevice(userAgent: string): string {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const os = /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : /Win/.test(userAgent)
        ? 'Windows'
        : /Mac/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}
