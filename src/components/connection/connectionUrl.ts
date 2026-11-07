/**
 * Builds the full client connection URL for a phone to scan and join via WebRTC.
 * Swaps localhost/127.0.0.1 tracker IPs with the actual reachable host domain/IP if available.
 */
export interface BuildDeviceConnectionUrlOptions {
  baseUrl?: string;
  clientPath: string;
  partyId: string;
  trackerUrls?: string[];
  /**
   * The party code is a party-lobby room (#647): the link opens the lobby (`/#/party?room=`)
   * and the lobby forwards the phone to the game; trackers ride along in the link.
   */
  lobby?: boolean;
}

export function buildDeviceConnectionUrl({
  baseUrl,
  clientPath,
  partyId,
  trackerUrls = [],
  lobby = false,
}: BuildDeviceConnectionUrlOptions): string {
  const defaultOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';

  let cleanBaseUrl = baseUrl;
  if (!cleanBaseUrl || !cleanBaseUrl.startsWith('http')) {
    cleanBaseUrl = defaultOrigin;
  }

  let url: URL;
  try {
    url = new URL(`${cleanBaseUrl}${clientPath}`);
  } catch {
    url = new URL(`${defaultOrigin}${clientPath}`);
  }

  if (lobby && partyId) {
    url = new URL(`${url.origin}/`);
    url.hash = `/party?room=${encodeURIComponent(partyId)}`;
  } else if (partyId) {
    url.searchParams.set('party', partyId);
  }

  let targetHost = '';
  try {
    targetHost = new URL(cleanBaseUrl).hostname;
  } catch {
    // Ignore invalid host URL parsing
  }

  trackerUrls.forEach((tracker: string) => {
    let resolvedTracker = tracker;
    if (targetHost && (tracker.includes('localhost') || tracker.includes('127.0.0.1'))) {
      resolvedTracker = tracker.replace('localhost', targetHost).replace('127.0.0.1', targetHost);
    }
    if (!resolvedTracker.includes('localhost') && !resolvedTracker.includes('127.0.0.1')) {
      if (lobby && partyId) url.hash += `&tracker=${encodeURIComponent(resolvedTracker)}`;
      else url.searchParams.append('tracker', resolvedTracker);
    }
  });

  return url.toString();
}
