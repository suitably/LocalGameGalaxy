import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

const MAX_CANDIDATES = 5;
const CONNECTION_TIMEOUT_MS = 15000;

export interface WebRTCClientOptions {
    onStatusChange?: (message: string, className: string) => void;
    onMessage?: (message: any) => void;
    autoConnect?: boolean;
    getMediaStream?: () => Promise<MediaStream | null>; // Provide a stream (e.g. microphone)
    getIdentity?: () => { name: string; hue: number };
}

export function useWebRTCClient(partyId: string | null, trackerUrls: string[], options: WebRTCClientOptions = {}) {
    const { onStatusChange, onMessage, autoConnect = true, getMediaStream, getIdentity } = options;

    const [statusClassName, setStatusClassName] = useState('status-connecting');
    const [statusMessage, setStatusMessage] = useState('Initializing...');

    const peerRef = useRef<SimplePeer.Instance | null>(null);
    const trackerClientRef = useRef<Client | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const handledTrackerPeersRef = useRef<Set<string>>(new Set());
    const candidatePeersRef = useRef<Set<any>>(new Set());
    const pendingPeerCandidatesRef = useRef<any[]>([]);
    const isWebRTCConnectedRef = useRef<boolean>(false);

    const updateStatus = useCallback((message: string, className: string) => {
        setStatusMessage(message);
        setStatusClassName(className);
        onStatusChange?.(message, className);
    }, [onStatusChange]);

    const cleanup = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (trackerClientRef.current) {
            (trackerClientRef.current as any).stop();
            trackerClientRef.current.destroy();
            trackerClientRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        handledTrackerPeersRef.current.clear();
        candidatePeersRef.current.forEach(p => {
            try { p.destroy(); } catch (e) { }
        });
        candidatePeersRef.current.clear();
        isWebRTCConnectedRef.current = false;
        pendingPeerCandidatesRef.current = [];
    }, []);

    const stringToInfoHash = (str: string): Uint8Array => {
        const hash = new Uint8Array(20);
        const encoder = new TextEncoder();
        const strBuf = encoder.encode(str);
        for (let i = 0; i < 20; i++) {
            hash[i] = strBuf[i % strBuf.length];
        }
        return hash;
    };

    const generatePeerId = (): string => {
        const array = new Uint8Array(10);
        crypto.getRandomValues(array);
        return '01234567890123456789' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const processNextPendingPeer = useCallback((trackerPeerId: string) => {
        handledTrackerPeersRef.current.delete(trackerPeerId); // allow retry just in case it was cleaned up
        if (candidatePeersRef.current.size < MAX_CANDIDATES && pendingPeerCandidatesRef.current.length > 0) {
            const nextPeer = pendingPeerCandidatesRef.current.shift();
            const nextTpId = nextPeer._id || nextPeer.channelName || Math.random().toString(36);
            initiateConnection(nextPeer, nextTpId);
        }
    }, []);

    const sendIdentity = useCallback((peer: SimplePeer.Instance, trackerPeer?: any) => {
        const identity = getIdentity?.();
        if (identity && (peer as any)._connectionId) {
            const identityMsg = {
                type: 'identify',
                name: identity.name,
                hue: identity.hue,
                connectionId: (peer as any)._connectionId
            };
            if ((peer as any).connected) peer.send(JSON.stringify(identityMsg));
            if (trackerPeer && trackerPeer.connected) trackerPeer.send(JSON.stringify(identityMsg) + '\n');
        }
    }, [getIdentity]);

    const initiateConnection = useCallback((trackerPeer: any, trackerPeerId: string) => {
        console.log('[WebRTCClient] Tracker peer found. Waiting for Host signal...', trackerPeerId);

        const setupAudioPeer = () => {
            let connectionTimeout: any = null;

            try {
                const peer = new SimplePeer({
                    initiator: true,
                    trickle: true,
                    stream: mediaStreamRef.current || undefined,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' },
                        ],
                    },
                });

                const connectionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                (peer as any)._connectionId = connectionId;

                candidatePeersRef.current.add(peer);

                connectionTimeout = setTimeout(() => {
                    if (peer && !(peer as any).destroyed && !(peer as any).connected) {
                        peer.destroy();
                    }
                }, CONNECTION_TIMEOUT_MS);

                peer.on('signal', (data: any) => {
                    if (trackerPeer.connected) {
                        try {
                            const payload = { connectionId, signal: data };
                            trackerPeer.send(JSON.stringify(payload) + '\n');
                        } catch (e) {
                            console.error('[WebRTCClient] Failed to send signal:', e);
                        }
                    }
                });

                const onData = (data: Uint8Array | string) => {
                    try {
                        const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                        const parts = str.split('\n');

                        for (const part of parts) {
                            if (!part.trim()) continue;

                            try {
                                const parsed = JSON.parse(part);

                                if (parsed.connectionId === connectionId && parsed.signal) {
                                    const signal = parsed.signal;
                                    if (peer && !(peer as any).destroyed) {
                                        peer.signal(signal);
                                    }
                                    continue;
                                }

                                // Forward application-level messages directly
                                if (peerRef.current === peer) {
                                    onMessage?.(parsed);
                                }
                            } catch (e) {
                                // Ignore non-json parts
                            }
                        }
                    } catch (e) {
                        console.error('[WebRTCClient] Failed to process received data:', e);
                    }
                };

                trackerPeer.on('data', onData);
                peer.on('data', onData);

                peer.on('connect', () => {
                    clearTimeout(connectionTimeout);

                    if (isWebRTCConnectedRef.current) {
                        peer.destroy();
                        return;
                    }

                    console.log('[WebRTCClient] Connected to host! (We won the race)');
                    isWebRTCConnectedRef.current = true;
                    peerRef.current = peer;
                    updateStatus('✅ Connected', 'status-connected');

                    sendIdentity(peer, trackerPeer);

                    candidatePeersRef.current.delete(peer);
                    candidatePeersRef.current.forEach(p => {
                        try { p.destroy(); } catch (e) { }
                    });
                    candidatePeersRef.current.clear();
                    pendingPeerCandidatesRef.current = [];
                });

                peer.on('error', (err: Error) => {
                    clearTimeout(connectionTimeout);
                    candidatePeersRef.current.delete(peer);

                    if (isWebRTCConnectedRef.current && peerRef.current === peer) {
                        isWebRTCConnectedRef.current = false;
                        updateStatus(`Connection lost: ${err.message}`, 'status-error');
                    }
                    trackerPeer.off('data', onData);

                    if (!isWebRTCConnectedRef.current) {
                        processNextPendingPeer(trackerPeerId);
                    }
                });

                peer.on('close', () => {
                    clearTimeout(connectionTimeout);
                    candidatePeersRef.current.delete(peer);

                    if (isWebRTCConnectedRef.current && peerRef.current === peer) {
                        isWebRTCConnectedRef.current = false;
                        updateStatus('Disconnected', 'status-disconnected');
                    }
                    trackerPeer.off('data', onData);

                    if (!isWebRTCConnectedRef.current) {
                        processNextPendingPeer(trackerPeerId);
                    }
                });

                trackerPeer.on('close', () => {
                    clearTimeout(connectionTimeout);
                    peer.destroy();
                    candidatePeersRef.current.delete(peer);

                    if (!isWebRTCConnectedRef.current) {
                        processNextPendingPeer(trackerPeerId);
                    }
                });

            } catch (err) {
                if (connectionTimeout) clearTimeout(connectionTimeout);
                processNextPendingPeer(trackerPeerId);
            }
        };

        if (trackerPeer.connected) {
            setupAudioPeer();
        } else {
            trackerPeer.on('connect', setupAudioPeer);
        }
    }, [updateStatus, processNextPendingPeer, onMessage, sendIdentity]);

    const setupPeerConnection = useCallback((trackerPeer: any) => {
        const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
        if (handledTrackerPeersRef.current.has(trackerPeerId)) {
            return;
        }
        handledTrackerPeersRef.current.add(trackerPeerId);

        if (candidatePeersRef.current.size >= MAX_CANDIDATES) {
            pendingPeerCandidatesRef.current.push(trackerPeer);
            return;
        }

        initiateConnection(trackerPeer, trackerPeerId);
    }, [initiateConnection]);

    const connect = useCallback(async () => {
        if (!partyId || trackerUrls.length === 0) return;

        cleanup();

        try {
            updateStatus('Requesting permissions...', 'status-connecting');

            if (getMediaStream) {
                const stream = await getMediaStream();
                mediaStreamRef.current = stream;
            }

            updateStatus('Connecting to party...', 'status-connecting');

            const infoHash = stringToInfoHash(partyId);
            const peerId = generatePeerId();

            const trackerClient = new Client({
                infoHash,
                peerId,
                announce: trackerUrls,
                port: 0,
                rtcConfig: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
                numWant: 4,
            } as any);

            trackerClientRef.current = trackerClient;

            trackerClient.on('peer', (trackerPeer: any) => {
                if (isWebRTCConnectedRef.current) return;
                const tpId = trackerPeer._id || trackerPeer.id;
                if (tpId === (trackerClient as any).peerId) return;

                setupPeerConnection(trackerPeer);
            });

            trackerClient.on('error', (err: Error) => {
                updateStatus(`Connection error: ${err.message}`, 'status-error');
            });

            trackerClient.start();
        } catch (err: any) {
            console.error('[WebRTCClient] Connect error:', err);
            updateStatus(err.message || 'Failed to connect', 'status-error');
        }
    }, [partyId, trackerUrls, cleanup, getMediaStream, updateStatus, setupPeerConnection]);

    const sendData = useCallback((data: any) => {
        if (isWebRTCConnectedRef.current && peerRef.current && (peerRef.current as any).connected) {
            try {
                peerRef.current.send(JSON.stringify(data));
                return true;
            } catch (e) {
                console.error('[WebRTCClient] Failed to send data:', e);
            }
        }
        return false;
    }, []);

    useEffect(() => {
        if (autoConnect) {
            const timeout = setTimeout(() => {
                connect();
            }, 1000); // 1s delay on initial mount helps cleanup Previous tracks
            return () => clearTimeout(timeout);
        }
    }, [connect, autoConnect]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        statusMessage,
        statusClassName,
        isConnected: isWebRTCConnectedRef.current,
        sendData,
        reconnect: connect,
        peer: peerRef.current
    };
}
