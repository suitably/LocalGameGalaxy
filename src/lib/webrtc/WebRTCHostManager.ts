import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

export type RemotePeerBase = {
    peer: SimplePeer.Instance;
    peerId: string;
    connectionId?: string; // The ID used by Phone for signaling
    name: string; // Display name for the phone
    hue?: number; // Hue for avatar
};

export interface WebRTCHostManagerCallbacks<T extends RemotePeerBase> {
    onPeerConnected?: (peerId: string, name: string, hue?: number, connectionId?: string) => void;
    onPeerDisconnected?: (peerId: string) => void;
    onPeerUpdated?: (peerId: string, name: string, hue?: number, connectionId?: string) => void;
    onMessage?: (peerId: string, data: any) => void;
    onStream?: (peerId: string, stream: MediaStream) => void;
    createRemotePeer?: (peerId: string, connectionId: string, name: string, peer: SimplePeer.Instance) => T;
    onPeerCreated?: (peerId: string, peer: T) => void;
    onPeerRemoved?: (peerId: string, peer: T) => void;
}

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
        const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
        console.log('[WebRTCHostManager] Tracker peer found. Waiting for connection...', trackerPeerId);

        const onData = (data: Uint8Array | string) => {
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                const parts = str.split('\n');
                for (const part of parts) {
                    if (!part.trim()) continue;

                    try {
                        const parsedData = JSON.parse(part);

                        if (parsedData.type === 'identify' && parsedData.connectionId) {
                            const remotePeer = Array.from(this.peers.values()).find(p =>
                                (trackerPeer as any)._audioPeerInstance === p.peer &&
                                (trackerPeer as any)._currentConnectionId === parsedData.connectionId
                            );
                            if (remotePeer) {
                                console.log('[WebRTCHostManager] Received identity from phone (tracker):', parsedData.name, parsedData.hue);
                                remotePeer.name = parsedData.name || remotePeer.name;
                                remotePeer.hue = parsedData.hue;
                                this.callbacks?.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId);
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
            if ((trackerPeer as any)._audioPeerInstance) {
                (trackerPeer as any)._audioPeerInstance.destroy();
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
            this.callbacks?.onPeerConnected?.(peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId);
        });

        dataPeer.on('data', (data: Uint8Array | string) => {
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                const parts = str.split('\n');
                for (const part of parts) {
                    if (!part.trim()) continue;
                    const msg = JSON.parse(part);

                    if (msg.type === 'identify') {
                        console.log('[WebRTCHostManager] Received identity (WebRTC):', msg.name, msg.hue);
                        remotePeer.name = msg.name || remotePeer.name;
                        remotePeer.hue = msg.hue;
                        this.callbacks?.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId);
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
