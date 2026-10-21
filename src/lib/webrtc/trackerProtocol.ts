import type SimplePeer from 'simple-peer';

/**
 * Wire helpers shared by the WebRTC host (`WebRTCHostManager`) and phone client (`useWebRTCClient`).
 * Both sides must agree on these byte for byte, otherwise TV ↔ phone pairing breaks.
 */

/** A decoded message on the tracker or data channel. Known fields are typed; the rest is app payload. */
export interface TrackerWireMessage {
  type?: string;
  partyId?: string;
  connectionId?: string;
  signal?: SimplePeer.SignalData;
  name?: string;
  hue?: number;
  deviceId?: string;
  [key: string]: unknown;
}

const isWireMessage = (value: unknown): value is TrackerWireMessage =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 20-byte BitTorrent info hash derived from the party id (repeats the UTF-8 bytes). */
export function stringToInfoHash(str: string): Uint8Array {
  const hash = new Uint8Array(20);
  const strBuf = new TextEncoder().encode(str);
  for (let i = 0; i < 20; i++) {
    hash[i] = strBuf[i % strBuf.length];
  }
  return hash;
}

/** Tracker peer id: fixed 20-character prefix plus 20 random hex characters. */
export function generatePeerId(): string {
  const array = new Uint8Array(10);
  crypto.getRandomValues(array);
  return (
    '01234567890123456789' +
    Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Decodes one received chunk of newline-delimited JSON. Each chunk is decoded on its own
 * (no buffering of partial lines across chunks); blank lines and non-object values are skipped, malformed lines
 * are reported to `onInvalidLine` instead of aborting the rest of the chunk.
 */
export function decodeNdjsonChunk(
  data: Uint8Array | string,
  onInvalidLine?: (line: string, error: unknown) => void,
): TrackerWireMessage[] {
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  const messages: TrackerWireMessage[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isWireMessage(parsed)) messages.push(parsed);
    } catch (error) {
      onInvalidLine?.(line, error);
    }
  }
  return messages;
}

const isLocalTracker = (url: string) =>
  url.includes('localhost') || url.includes('127.0.0.1') || url.includes(':8000');

/**
 * Trackers usable from the current page: `ws:` is upgraded to `wss:` on https pages, local
 * trackers (localhost, 127.0.0.1, port 8000) are only kept when the page itself is local,
 * duplicates are removed.
 */
export function filterTrackerUrls(
  urls: string[],
  page: { isSecure: boolean; hostname: string },
): string[] {
  const pageIsLocal = page.hostname === 'localhost' || page.hostname === '127.0.0.1';
  const usable = urls
    .map((url) => (page.isSecure && url.startsWith('ws:') ? url.replace('ws:', 'wss:') : url))
    .filter((url) => !isLocalTracker(url) || pageIsLocal);
  return Array.from(new Set(usable));
}

/** `filterTrackerUrls` for the current `window.location`. */
export function filterTrackerUrlsForPage(urls: string[]): string[] {
  return filterTrackerUrls(urls, {
    isSecure: window.location.protocol === 'https:',
    hostname: window.location.hostname,
  });
}
