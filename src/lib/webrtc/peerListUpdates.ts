import type { RemotePeerBase } from './WebRTCHostManager';

/** Drops other peers that belong to the same physical device (reconnect with a new peer id). */
function withoutStaleDevicePeers<T extends RemotePeerBase>(
  list: T[],
  peerId: string,
  deviceId?: string,
): T[] {
  return deviceId ? list.filter((p) => p.peerId === peerId || p.deviceId !== deviceId) : list;
}

/** Applies a peer-connected event: updates identity of a known peer, ignores unknown ones. */
export function applyPeerConnected<T extends RemotePeerBase>(
  prev: T[],
  peerId: string,
  name: string,
  hue?: number,
  connectionId?: string,
  deviceId?: string,
): T[] {
  const list = withoutStaleDevicePeers(prev, peerId, deviceId);
  if (!list.some((p) => p.peerId === peerId)) return list;
  return list.map((p) => (p.peerId === peerId ? { ...p, name, hue, connectionId, deviceId } : p));
}

/** Applies a peer-updated event: like connected, but keeps existing connection/device ids. */
export function applyPeerUpdated<T extends RemotePeerBase>(
  prev: T[],
  peerId: string,
  name: string,
  hue?: number,
  connectionId?: string,
  deviceId?: string,
): T[] {
  const list = withoutStaleDevicePeers(prev, peerId, deviceId);
  if (!list.some((p) => p.peerId === peerId)) return list;
  return list.map((p) =>
    p.peerId === peerId
      ? {
          ...p,
          name,
          hue,
          connectionId: connectionId || p.connectionId,
          deviceId: deviceId || p.deviceId,
        }
      : p,
  );
}

/** Adds a newly created peer; replaces an existing entry of the same device. */
export function applyPeerCreated<T extends RemotePeerBase>(
  prev: T[],
  peerId: string,
  remotePeer: T,
): T[] {
  if (prev.some((p) => p.peerId === peerId)) return prev;
  if (remotePeer.deviceId && prev.some((p) => p.deviceId === remotePeer.deviceId)) {
    return prev.map((p) => (p.deviceId === remotePeer.deviceId ? remotePeer : p));
  }
  return [...prev, remotePeer];
}
