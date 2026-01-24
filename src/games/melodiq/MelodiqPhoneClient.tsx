import { useEffect, useState, useRef } from 'react';
import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

export const MelodiqPhoneClient = () => {
    const [status, setStatus] = useState<{ message: string; className: string }>({
        message: 'Initializing...',
        className: 'status-connecting'
    });
    const [showReconnect, setShowReconnect] = useState(false);

    const peerRef = useRef<SimplePeer.Instance | null>(null);
    const trackerClientRef = useRef<Client | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const handledTrackerPeersRef = useRef<Set<string>>(new Set()); // Track handled tracker peers to avoid duplicates
    const audioPeerCreatedRef = useRef<boolean>(false); // Global flag: only ONE audio peer ever

    const updateStatus = (message: string, className: string) => {
        setStatus({ message, className });
    };

    const getPartyIdFromUrl = (): string | null => {
        const params = new URLSearchParams(window.location.search);
        return params.get('party');
    };

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

    const cleanup = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (trackerClientRef.current) {
            trackerClientRef.current.destroy();
            trackerClientRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    };

    const setupPeerConnection = (trackerPeer: any) => {
        // Use the trackerPeer's unique ID to prevent duplicate audio peer creation
        const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
        if (handledTrackerPeersRef.current.has(trackerPeerId)) {
            console.log('[Phone] Ignoring duplicate tracker peer:', trackerPeerId);
            return;
        }
        handledTrackerPeersRef.current.add(trackerPeerId);

        console.log('[Phone] Tracker peer found. Waiting for Host signal...', trackerPeerId);

        const setupAudioPeer = () => {
            console.log('[Phone] Tracker peer connected. Waiting for Host to initiate...');

            // Wait for the Host to send the first signal (offer), then create our peer
            const onData = (data: Uint8Array | string) => {
                try {
                    const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                    const parts = str.split('\n');

                    for (const part of parts) {
                        if (!part.trim()) continue;
                        try {
                            const signal = JSON.parse(part);

                            // Create peer on first signal from Host (and only if we haven't created one already)
                            if (!audioPeerCreatedRef.current) {
                                console.log('[Phone] Received first signal from Host. Creating audio peer...');
                                audioPeerCreatedRef.current = true;

                                const peer = new SimplePeer({
                                    initiator: false,
                                    trickle: true,
                                    stream: mediaStreamRef.current!,
                                    config: {
                                        iceServers: [
                                            { urls: 'stun:stun.l.google.com:19302' },
                                            { urls: 'stun:global.stun.twilio.com:3478' },
                                        ],
                                    },
                                });

                                peerRef.current = peer;

                                // Send our signals back to Host
                                peer.on('signal', (data: any) => {
                                    console.log('[Phone] Sending signal to host');
                                    if (trackerPeer.connected) {
                                        try {
                                            trackerPeer.send(JSON.stringify(data) + '\n');
                                        } catch (e) {
                                            console.error('[Phone] Failed to send signal:', e);
                                        }
                                    }
                                });

                                peer.on('connect', () => {
                                    console.log('[Phone] Connected to host!');
                                    updateStatus('✅ Connected', 'status-connected');
                                    setShowReconnect(false);
                                });

                                peer.on('error', (err: Error) => {
                                    console.error('[Phone] Peer error:', err);
                                    updateStatus('Connection lost', 'status-error');
                                    setShowReconnect(true);
                                    trackerPeer.off('data', onData);
                                });

                                peer.on('close', () => {
                                    console.log('[Phone] Connection closed');
                                    updateStatus('Disconnected', 'status-disconnected');
                                    setShowReconnect(true);
                                    trackerPeer.off('data', onData);
                                });

                                trackerPeer.on('close', () => {
                                    peer.destroy();
                                });

                                // Process the first signal immediately
                                peer.signal(signal);
                            } else {
                                // Forward subsequent signals to existing peer
                                peerRef.current?.signal(signal);
                            }
                        } catch (e) {
                            console.error('[Phone] Failed to parse individual signal chunk:', part, e);
                        }
                    }
                } catch (e) {
                    console.error('[Phone] Failed to process received data:', e);
                }
            };

            trackerPeer.on('data', onData);
        };

        if (trackerPeer.connected) {
            setupAudioPeer();
        } else {
            trackerPeer.on('connect', setupAudioPeer);
        }
    };

    const connect = async (partyId: string, trackerUrls: string[]) => {
        try {
            updateStatus('Requesting microphone...', 'status-connecting');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                },
                video: false,
            });

            mediaStreamRef.current = stream;
            updateStatus('Connecting to party...', 'status-connecting');

            const infoHash = stringToInfoHash(partyId);
            console.log('[Phone] Generated InfoHash for Party ID:', partyId);
            // Convert Uint8Array to hex string manually for logging
            const infoHashHex = Array.from(infoHash).map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('[Phone] InfoHash (Hex):', infoHashHex);

            const peerId = generatePeerId();

            const trackerClient = new Client({
                infoHash,
                peerId,
                announce: trackerUrls,
                port: 0,
            });

            trackerClientRef.current = trackerClient;

            trackerClient.on('peer', (trackerPeer: any) => {
                console.log('[Phone] Tracker discovered host (Peer info):', trackerPeer);
                setupPeerConnection(trackerPeer);
            });

            trackerClient.on('update', (data: any) => {
                console.log('[Phone] Tracker Announce Update:', data);
            });

            trackerClient.on('warning', (err: Error) => {
                console.warn('[Phone] Tracker warning:', err);
            });

            trackerClient.on('error', (err: Error) => {
                console.error('[Phone] Tracker fatal error:', err);
                updateStatus(`Connection error: ${err.message}`, 'status-error');
                setShowReconnect(true);
            });

            trackerClient.start();
        } catch (err: any) {
            updateStatus(err.message || 'Failed to connect', 'status-error');
            setShowReconnect(true);
        }
    };

    const handleReconnect = () => {
        cleanup();
        const partyId = getPartyIdFromUrl();
        if (partyId) {
            // Reliable public trackers only - SINGLE default to ensure matching
            const reliableTrackers = [
                'wss://tracker.openwebtorrent.com',
            ];

            // Only add local tracker if we are actually on localhost
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                reliableTrackers.unshift(`ws://${window.location.hostname}:8000`);
            }

            const uniqueTrackers = Array.from(new Set(reliableTrackers));
            connect(partyId, uniqueTrackers);
        }
    };

    useEffect(() => {
        const partyId = getPartyIdFromUrl();
        if (!partyId) {
            updateStatus('❌ No Party ID', 'status-error');
        } else {
            // Deduplicate using Set to prevent multiple connections to the same tracker
            // Reliable public trackers only - SINGLE default to ensure matching
            const reliableTrackers = [
                'wss://tracker.openwebtorrent.com',
            ];

            // Only add local tracker if we are actually on localhost
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                reliableTrackers.unshift(`ws://${window.location.hostname}:8000`);
            }

            // Deduplicate
            const uniqueTrackers = Array.from(new Set(reliableTrackers));
            connect(partyId, uniqueTrackers);
        }

        return cleanup;
    }, []);

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
            background: '#121212',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            margin: 0,
        }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#90caf9' }}>🎤 Melodiq Phone Mic</h1>
                <div
                    style={{
                        fontSize: '1.5rem',
                        margin: '2rem 0',
                        padding: '1.5rem',
                        background: '#1e1e1e',
                        borderRadius: '12px',
                        border: '1px solid rgba(144, 202, 249, 0.2)',
                    }}
                    className={status.className}
                >
                    {status.message}
                </div>
                {showReconnect && (
                    <button
                        onClick={handleReconnect}
                        style={{
                            background: '#90caf9',
                            color: '#000',
                            border: 'none',
                            padding: '1rem 2rem',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '1rem',
                        }}
                    >
                        Reconnect
                    </button>
                )}
                <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7, color: 'rgba(255, 255, 255, 0.7)' }}>
                    <p>Keep this page open while playing</p>
                </div>
            </div>
            <style>{`
                .status-connecting { color: #fbbf24; }
                .status-connected { color: #4ade80; }
                .status-error { color: #f87171; }
                .status-disconnected { color: #9ca3af; }
                button:active { transform: scale(0.95); }
                button:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};
