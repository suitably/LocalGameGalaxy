import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

/**
 * Base type for a remote peer entry stored in the peers Map.
 * Subclasses extend this to add domain-specific state (e.g., audio processing nodes).
 */
export type RemotePeerBase = {
    /** The SimplePeer WebRTC connection instance for this peer. */
    peer: SimplePeer.Instance;
    /** Unique host-assigned UUID for this peer session. */
    peerId: string;
    /** The connection ID assigned by the Phone during its signaling offer. Used to match tracker signals. */
    connectionId?: string;
    /** Display name sent by the phone during the `identify` handshake. */
    name: string;
    /** Hue value (0-360) for avatar color, sent during handshake. */
    hue?: number;
    /** Persistent device ID sent by the phone for reconnection handling. */
    deviceId?: string;
};

/** Callback hooks for peer lifecycle events. Use these to update React state from outside the manager. */
export interface WebRTCHostManagerCallbacks<T extends RemotePeerBase> {
    onPeerConnected?: (peerId: string, name: string, hue?: number, connectionId?: string, deviceId?: string) => void;
    onPeerDisconnected?: (peerId: string) => void;
    onPeerUpdated?: (peerId: string, name: string, hue?: number, connectionId?: string, deviceId?: string) => void;
    onMessage?: (peerId: string, data: any) => void;
    onStream?: (peerId: string, stream: MediaStream) => void;
    createRemotePeer?: (peerId: string, connectionId: string, name: string, peer: SimplePeer.Instance) => T;
    onPeerCreated?: (peerId: string, peer: T) => void;
    onPeerRemoved?: (peerId: string, peer: T) => void;
}

/**
 * `WebRTCHostManager` — BitTorrent Tracker-Based WebRTC Connection Manager
 *
 * Manages the full lifecycle of WebRTC peer connections for the Host side of a
 * Melodiq multiplayer session. Uses `bittorrent-tracker` for peer discovery
 * and `simple-peer` for WebRTC negotiation.
 *
 * ## Two-Channel Signaling Architecture
 *
 * Connection establishment uses **two distinct SimplePeer connections**:
 *
 * ### Channel 1: Tracker Peer (Signaling Layer)
 * Created by the BitTorrent tracker protocol. Used exclusively to exchange
 * WebRTC offers/answers (wrapped in `{ connectionId, signal }` JSON envelopes).
 * Not used for application data.
 *
 * ### Channel 2: Data Peer (Application Layer)
 * Created via `initDataPeer()` once a valid offer arrives on Channel 1.
 * This is the actual WebRTC connection carrying:
 * - DataChannel: JSON game messages (`identify`, `pitch`, queue updates, etc.)
 * - MediaStream track: Phone microphone audio for pitch detection.
 *
 * ## Peer Lifecycle
 * ```
 * Tracker announces Host → Tracker discovers Phone peer
 *       ↓
 * Channel 1 opens (tracker.on('peer'))
 *       ↓
 * Phone sends wrapped offer: { connectionId, signal: { type: 'offer' } }
 *       ↓
 * Host creates SimplePeer Data Peer (initiator: false) via initDataPeer()
 *       ↓
 * SDP exchange completes (ICE negotiation via STUN servers)
 *       ↓
 * Data Peer 'connect' fires → onPeerConnected() callback
 *       ↓
 * Phone sends `identify` message → name/hue/deviceId stored on remotePeer
 *       ↓
 * Application messages and audio stream flow over Data Peer
 *       ↓
 * Data Peer 'close'/'error' → removePeer() → onPeerDisconnected() callback
 * ```
 *
 * ## Reconnection
 * If a Phone reconnects with the same `deviceId`, the `onPeerUpdated` callback
 * fires instead of `onPeerConnected` so the UI can restore the existing player slot.
 *
 * ## Extension Points (for subclasses)
 * - `handleCustomTrackerMessage()`: Override to process tracker-channel messages before default handling.
 * - `handleCustomWebRTCMessage()`: Override to process DataChannel messages before generic dispatch.
 * - `createRemotePeer` callback: Override to inject subclass-specific peer state.
 *
 * @see {@link WebRTCMicManager} for the Melodiq audio-streaming specialization.
 */
export class WebRTCHostManager<T extends RemotePeerBase = RemotePeerBase> {
    protected peers: Map<string, T> = new Map();

    // Dynamic callback for session
    public onMessage?: (peerId: string, data: any) => void;
    private pendingTrackerPeers: Set<string> = new Set();

    private trackerClient: Client | null = null;
    protected partyId: string;
    protected trackerUrls: string[];

    // Callbacks
    protected callbacks?: WebRTCHostManagerCallbacks<T>;
    protected messageListeners: Set<(peerId: string, data: any) => void> = new Set();

    constructor(
        partyId: string,
        trackerUrls: string[],
        callbacks?: WebRTCHostManagerCallbacks<T>
    ) {
        this.partyId = partyId;
        this.trackerUrls = trackerUrls;
        this.callbacks = callbacks;
    }

    on(event: 'message', listener: (peerId: string, data: any) => void): void {
        if (event === 'message') {
            this.messageListeners.add(listener);
        }
    }

    off(event: 'message', listener: (peerId: string, data: any) => void): void {
        if (event === 'message') {
            this.messageListeners.delete(listener);
        }
    }

    async start(): Promise<void> {
        const infoHash = this.stringToInfoHash(this.partyId);
        console.log('[WebRTCHostManager] Generated InfoHash for Party ID:', this.partyId);
        const infoHashHex = Array.from(infoHash).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('[WebRTCHostManager] InfoHash (Hex):', infoHashHex);
        const peerId = this.generatePeerId();

        const isSecure = window.location.protocol === 'https:';

        const validTrackers = this.trackerUrls.map(url => {
            if (isSecure && url.startsWith('ws:')) {
                return url.replace('ws:', 'wss:');
            }
            return url;
        }).filter(url => {
            if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes(':8000')) {
                return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            }
            return true;
        });

        const finalTrackers = Array.from(new Set(validTrackers));
        console.log('[WebRTCHostManager] Using trackers:', finalTrackers);

        if (finalTrackers.length === 0) {
            console.warn('[WebRTCHostManager] No trackers provided. Connection will not be possible.');
        }

        this.trackerClient = new Client({
            infoHash,
            peerId,
            announce: finalTrackers,
            port: 0,
            rtcConfig: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ],
            },
        } as any);

        this.trackerClient.on('peer', (peer: any) => {
            console.log('[WebRTCHostManager] Tracker discovered peer:', peer);
            this.handleTrackerPeer(peer);
        });

        this.trackerClient.on('warning', (err: Error) => {
            console.warn('[WebRTCHostManager] Tracker warning:', err);
        });

        this.trackerClient.on('error', (err: Error) => {
            console.error('[WebRTCHostManager] Tracker error:', err);
        });

        this.trackerClient.start();
    }

    private handleTrackerPeer(trackerPeer: any): void {
        const trackerPeerId = trackerPeer.id || trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
        console.log('[WebRTCHostManager] Tracker peer found. Sending host_hello...', trackerPeerId);

        const sendHostHello = () => {
            if (trackerPeer.connected) {
                try {
                    trackerPeer.send(JSON.stringify({ type: 'host_hello', partyId: this.partyId }) + '\n');
                } catch (e) {
                    console.error('[WebRTCHostManager] Failed to send host_hello:', e);
                }
            }
        };

        if (trackerPeer.connected) {
            sendHostHello();
        } else {
            trackerPeer.once('connect', sendHostHello);
        }

        const onData = (data: Uint8Array | string) => {
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                const parts = str.split('\n');
                for (const part of parts) {
                    if (!part.trim()) continue;

                    try {
                        const parsedData = JSON.parse(part);

                        if (parsedData.type === 'client_probe') {
                            sendHostHello();
                            return;
                        }

                        if (parsedData.type === 'identify' && parsedData.connectionId) {
                            const remotePeer = Array.from(this.peers.values()).find(p =>
                                (trackerPeer as any)._audioPeerInstance === p.peer &&
                                (trackerPeer as any)._currentConnectionId === parsedData.connectionId
                            );
                            if (remotePeer) {
                                console.log('[WebRTCHostManager] Received identity from phone (tracker):', parsedData.name, parsedData.hue, parsedData.deviceId);
                                remotePeer.name = parsedData.name || remotePeer.name;
                                remotePeer.hue = parsedData.hue;
                                remotePeer.deviceId = parsedData.deviceId;

                                // Deduplicate by deviceId
                                if (parsedData.deviceId) {
                                    for (const [existingPeerId, existingPeer] of this.peers.entries()) {
                                        if (existingPeerId !== remotePeer.peerId && existingPeer.deviceId === parsedData.deviceId) {
                                            console.log(`[WebRTCHostManager] Replacing stale peer ${existingPeerId} with ${remotePeer.peerId} for deviceId ${parsedData.deviceId}`);
                                            existingPeer.peer.destroy();
                                            this.peers.delete(existingPeerId);
                                            this.callbacks?.onPeerRemoved?.(existingPeerId, existingPeer);
                                        }
                                    }
                                }

                                this.callbacks?.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId, remotePeer.deviceId);
                            } else {
                                console.warn('[WebRTCHostManager] Received identity for unknown or mismatched peer:', parsedData.connectionId);
                            }
                            return;
                        }

                        // Give subclasses a chance to process tracker messages
                        if (this.handleCustomTrackerMessage(parsedData, trackerPeer)) {
                            return;
                        }

                        if (parsedData.connectionId && parsedData.signal) {
                            this.handleWrappedSignal(trackerPeer, parsedData);
                        }
                    } catch (e) {
                        console.error('[WebRTCHostManager] Failed to parse individual signal chunk:', part, e);
                    }
                }
            } catch (e) {
                console.error('[WebRTCHostManager] Failed to process received data:', e);
            }
        };
        trackerPeer.on('data', onData);

        trackerPeer.on('close', () => {
            const audioPeer = (trackerPeer as any)._audioPeerInstance;
            if (audioPeer && !audioPeer.connected && !audioPeer.destroyed) {
                audioPeer.destroy();
                delete (trackerPeer as any)._audioPeerInstance;
            }
            this.pendingTrackerPeers.delete(trackerPeerId);
            delete (trackerPeer as any)._currentConnectionId;
            trackerPeer.off('data', onData);
        });
    }

    // Override to handle custom messages from tracker before they drop
    protected handleCustomTrackerMessage(_parsedData: any, _trackerPeer: any): boolean {
        return false;
    }

    private handleWrappedSignal(trackerPeer: any, wrappedData: any) {
        const { connectionId, signal } = wrappedData;
        const currentConnectionId = (trackerPeer as any)._currentConnectionId;

        if (signal.type === 'offer' && connectionId !== currentConnectionId) {
            console.log('[WebRTCHostManager] New connection attempt detected:', connectionId);

            const existingPeer = (trackerPeer as any)._audioPeerInstance;
            if (existingPeer) {
                existingPeer.destroy();
                delete (trackerPeer as any)._audioPeerInstance;
            }

            (trackerPeer as any)._currentConnectionId = connectionId;
            this.initDataPeer(trackerPeer, connectionId);
        }

        const dataPeer = (trackerPeer as any)._audioPeerInstance;
        if (dataPeer && !dataPeer.destroyed && (trackerPeer as any)._currentConnectionId === connectionId) {
            if (signal.type === 'answer') {
                return;
            }

            try {
                dataPeer.signal(signal);
            } catch (e) {
                console.error('[WebRTCHostManager] Signal error:', e);
            }
        }
    }

    private initDataPeer(trackerPeer: any, connectionId: string) {
        console.log('[WebRTCHostManager] Initializing Data Peer for:', connectionId);
        const peerId = this.generatePeerId();

        const dataPeer = new SimplePeer({
            initiator: false,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ],
            },
        });

        (trackerPeer as any)._audioPeerInstance = dataPeer;

        const name = `Phone ${this.peers.size + 1}`;
        let remotePeer: T;
        if (this.callbacks?.createRemotePeer) {
            remotePeer = this.callbacks.createRemotePeer(peerId, connectionId, name, dataPeer);
        } else {
            remotePeer = {
                peer: dataPeer,
                peerId,
                connectionId,
                name,
            } as T;
        }

        this.peers.set(peerId, remotePeer);
        this.callbacks?.onPeerCreated?.(peerId, remotePeer);

        dataPeer.on('signal', (data: any) => {
            if (trackerPeer.connected) {
                try {
                    const payload = { connectionId, signal: data };
                    trackerPeer.send(JSON.stringify(payload) + '\n');
                } catch (e) { }
            }
        });

        dataPeer.on('connect', () => {
            console.log('[WebRTCHostManager] Data Peer connected:', peerId);
            // Some peers might just be data
            this.callbacks?.onPeerConnected?.(peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId, remotePeer.deviceId);
        });

        dataPeer.on('data', (data: Uint8Array | string) => {
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                const parts = str.split('\n');
                for (const part of parts) {
                    if (!part.trim()) continue;
                    const msg = JSON.parse(part);

                    if (msg.type === 'identify') {
                        console.log('[WebRTCHostManager] Received identity (WebRTC):', msg.name, msg.hue, msg.deviceId);
                        remotePeer.name = msg.name || remotePeer.name;
                        remotePeer.hue = msg.hue;
                        remotePeer.deviceId = msg.deviceId;

                        // Deduplicate by deviceId
                        if (msg.deviceId) {
                            for (const [existingPeerId, existingPeer] of this.peers.entries()) {
                                if (existingPeerId !== remotePeer.peerId && existingPeer.deviceId === msg.deviceId) {
                                    console.log(`[WebRTCHostManager] Replacing stale peer ${existingPeerId} with ${remotePeer.peerId} for deviceId ${msg.deviceId}`);
                                    existingPeer.peer.destroy();
                                    this.peers.delete(existingPeerId);
                                    this.callbacks?.onPeerRemoved?.(existingPeerId, existingPeer);
                                }
                            }
                        }

                        this.callbacks?.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId, remotePeer.deviceId);
                    } else {
                        // Pass to subclass handles or generic listeners
                        if (!this.handleCustomWebRTCMessage(msg, remotePeer)) {
                            this.callbacks?.onMessage?.(peerId, msg);
                            this.messageListeners.forEach(listener => listener(peerId, msg));
                            this.onMessage?.(peerId, msg); // New dynamic callback
                        }
                    }
                }
            } catch (e) {
                // console.error('[WebRTCHostManager] Error parsing WebRTC data:', e);
            }
        });

        dataPeer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
            console.log('[WebRTCHostManager] Received track from phone:', track.kind, stream.id, peerId);
        });

        dataPeer.on('stream', (stream: MediaStream) => {
            console.log('[WebRTCHostManager] Received stream from phone:', peerId);
            this.callbacks?.onStream?.(peerId, stream);
        });

        dataPeer.on('close', () => {
            console.log('[WebRTCHostManager] Data Peer closed:', peerId);
            this.removePeer(peerId);
            if ((trackerPeer as any)._currentConnectionId === connectionId) {
                delete (trackerPeer as any)._currentConnectionId;
                delete (trackerPeer as any)._audioPeerInstance;
            }
        });

        dataPeer.on('error', (e: any) => {
            console.error('[WebRTCHostManager] Data Peer error:', peerId, e);
            this.removePeer(peerId);
            if ((trackerPeer as any)._currentConnectionId === connectionId) {
                delete (trackerPeer as any)._currentConnectionId;
                delete (trackerPeer as any)._audioPeerInstance;
            }
        });
    }

    // Override to handle custom messages via WebRTC
    protected handleCustomWebRTCMessage(_msg: any, _remotePeer: T): boolean {
        return false;
    }

    protected removePeer(peerId: string): void {
        const remotePeer = this.peers.get(peerId);
        if (!remotePeer) return;

        remotePeer.peer.destroy();
        this.callbacks?.onPeerRemoved?.(peerId, remotePeer);
        this.peers.delete(peerId);
        this.callbacks?.onPeerDisconnected?.(peerId);
    }

    stop(): void {
        if (this.trackerClient) {
            (this.trackerClient as any).stop();
            this.trackerClient.destroy();
            this.trackerClient = null;
        }
        this.peers.forEach(p => {
            p.peer.destroy();
            this.callbacks?.onPeerRemoved?.(p.peerId, p);
        });
        this.peers.clear();
    }

    sendToPeer(peerId: string, data: any): void {
        const remotePeer = this.peers.get(peerId);
        if (remotePeer && remotePeer.peer && (remotePeer.peer as any).connected) {
            try {
                remotePeer.peer.send(JSON.stringify(data));
            } catch (e) {
                console.error(`[WebRTCHostManager] Failed to send data to ${peerId}:`, e);
            }
        } else {
            console.warn(`[WebRTCHostManager] Cannot send to ${peerId} - not connected`);
        }
    }

    broadcast(data: any): void {
        this.peers.forEach(p => {
            if (p.peer && (p.peer as any).connected) {
                try {
                    p.peer.send(JSON.stringify(data));
                } catch (e) {
                    console.error(`[WebRTCHostManager] Failed to broadcast to ${p.peerId}:`, e);
                }
            }
        });
    }

    protected stringToInfoHash(str: string): Uint8Array {
        const hash = new Uint8Array(20);
        const encoder = new TextEncoder();
        const strBuf = encoder.encode(str);
        for (let i = 0; i < 20; i++) {
            hash[i] = strBuf[i % strBuf.length];
        }
        return hash;
    }

    protected generatePeerId(): string {
        const array = new Uint8Array(10);
        crypto.getRandomValues(array);
        return '01234567890123456789' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
