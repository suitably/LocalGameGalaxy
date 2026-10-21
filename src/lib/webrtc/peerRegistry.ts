/** Identity fields a phone sends in its `identify` message (tracker or data channel). */
export interface PeerIdentity {
  name?: string;
  hue?: number;
  deviceId?: string;
}

/**
 * Peers that belong to the same device as `keepPeerId` and should be replaced by it
 * (a phone that reconnected gets a new peer id but keeps its persistent `deviceId`).
 */
export function findStalePeersByDevice(
  peers: Iterable<[string, { deviceId?: string }]>,
  keepPeerId: string,
  deviceId: string | undefined,
): string[] {
  if (!deviceId) return [];
  const stale: string[] = [];
  for (const [peerId, peer] of peers) {
    if (peerId !== keepPeerId && peer.deviceId === deviceId) stale.push(peerId);
  }
  return stale;
}
