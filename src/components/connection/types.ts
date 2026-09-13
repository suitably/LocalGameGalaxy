import type React from 'react';
import type { TrackerItem, RemotePeerBase } from '../../lib/webrtc';

export type ConnectedPeer = RemotePeerBase;
export type WebRTCPeerInfo = RemotePeerBase;

export interface WebRTCConnectionData<T extends RemotePeerBase = RemotePeerBase> {
    peers: T[];
    partyId: string;
    regeneratePartyId: () => void;
    trackerUrls: string[];
    activeTrackerUrls: string[];
    disabledTrackerUrls?: string[];
    allTrackers?: TrackerItem[];
    toggleTrackerActive?: (url: string, enabled?: boolean) => void;
    addTrackerUrl: (url: string) => void;
    removeTrackerUrl: (url: string) => void;
    restoreDefaultTrackers: () => void;
}

export interface DeviceConnectionProps<T extends RemotePeerBase = RemotePeerBase> {
    onBack: () => void;
    title?: string;
    description?: string;
    gameId: string; // Identifier used for setting UI properties locally
    clientPath: string; // the path for the phone app, e.g. '/games/melodiq?role=client'
    webrtcData: WebRTCConnectionData<T>;
    renderPeerExtra?: (peer: T) => React.ReactNode;
    /** Extra settings / toggles to render on the connection screen */
    extraOptions?: React.ReactNode;
    /** Storage key for the helper server URL */
    helperStorageKey?: string;
    /** Storage key for the helper auth token */
    helperTokenKey?: string;
}
