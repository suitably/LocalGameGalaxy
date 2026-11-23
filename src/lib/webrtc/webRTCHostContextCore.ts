import { createContext, useContext } from 'react';
import type { RemotePeerBase, WebRTCHostManager } from './WebRTCHostManager';
import { DEFAULT_PUBLIC_TRACKERS, type TrackerItem } from './trackerTypes';

export { DEFAULT_PUBLIC_TRACKERS, type TrackerItem };

export interface WebRTCHostContextType<
  T extends RemotePeerBase = RemotePeerBase,
  M extends WebRTCHostManager<T> = WebRTCHostManager<T>,
> {
  manager: M | null;
  peers: T[];
  activePeers: T[];
  inactivePeers: T[];
  togglePeerActive: (peerId: string) => void;
  partyId: string;
  regeneratePartyId: () => void;
  trackerUrls: string[];
  activeTrackerUrls: string[];
  disabledTrackerUrls: string[];
  allTrackers: TrackerItem[];
  toggleTrackerActive: (url: string, enabled?: boolean) => void;
  addTrackerUrl: (url: string) => void;
  removeTrackerUrl: (url: string) => void;
  restoreDefaultTrackers: () => void;
}

// We use a generic context type but map to any under the hood.
// Consumers can cast it or use specific typed hooks.
export const WebRTCHostContext = createContext<WebRTCHostContextType<any, any> | null>(null);

export function useWebRTCHost<
  T extends RemotePeerBase = RemotePeerBase,
  M extends WebRTCHostManager<T> = WebRTCHostManager<T>,
>() {
  const context = useContext(WebRTCHostContext);
  if (!context) {
    throw new Error('useWebRTCHost must be used within a WebRTCHostProvider');
  }
  return context as WebRTCHostContextType<T, M>;
}

