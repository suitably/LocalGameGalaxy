import { useEffect, useState, useRef } from 'react';
import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

export const MelodiqPhoneClient = () => {
    const [status, setStatus] = useState<{ message: string; className: string }>({
        message: 'Initializing...',
        className: 'status-connecting'
    });
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('melodiq_phone_name') || `Phone ${Math.floor(Math.random() * 1000)}`);
    const [playerHue, setPlayerHue] = useState<number>(() => {
        const stored = localStorage.getItem('melodiq_phone_hue');
        return stored ? parseInt(stored) : Math.floor(Math.random() * 360);
    });
    const [showReconnect, setShowReconnect] = useState(false);

    // Refs
    const peerRef = useRef<SimplePeer.Instance | null>(null);
    const trackerClientRef = useRef<Client | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const handledTrackerPeersRef = useRef<Set<string>>(new Set()); // Track handled tracker peers to avoid duplicates
    const audioPeerCreatedRef = useRef<boolean>(false); // Global flag: only ONE audio peer ever

    // Save settings when changed
    useEffect(() => {
        localStorage.setItem('melodiq_phone_name', playerName);
        localStorage.setItem('melodiq_phone_hue', String(playerHue));
    }, [playerName, playerHue]);

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
        // Reset state refs
        handledTrackerPeersRef.current.clear();
        audioPeerCreatedRef.current = false;
    };

    // Helper to send Identity
    const sendIdentity = (peer: SimplePeer.Instance, trackerPeerForSend: any) => {
        const identityMsg = {
            type: 'identify',
            name: playerName,
            hue: playerHue
        };
        console.log('[Phone] Sending identity:', identityMsg);

        // Send via WebRTC data channel if open (most reliable/fast)
        if ((peer as any).connected) {
            peer.send(JSON.stringify(identityMsg));
        }

        // ALSO Send via Tracker signaling channel to ensure it gets there early/reliably 
        // even if WebRTC data channel isn't fully ready or for redundancy
        if (trackerPeerForSend && trackerPeerForSend.connected) {
            try {
                trackerPeerForSend.send(JSON.stringify(identityMsg) + '\n');
            } catch (e) {
                console.error('[Phone] Failed to send identity via tracker:', e);
            }
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
            const processedSignalsRef = new Set<string>();

            const onData = (data: Uint8Array | string) => {
                try {
                    const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                    const parts = str.split('\n');

                    for (const part of parts) {
                        if (!part.trim()) continue;

                        // Deduplicate signals: Ignore if we've already processed this exact signal string
                        if (processedSignalsRef.has(part)) {
                            console.log('[Phone] Ignoring duplicate signal');
                            continue;
                        }
                        processedSignalsRef.add(part);

                        try {
                            const signal = JSON.parse(part);

                            // Create peer on first signal from Host (and only if we haven't created one already)
                            if (!audioPeerCreatedRef.current) {
                                if (signal.type !== 'offer') {
                                    console.warn('[Phone] Received non-offer signal first:', signal.type);
                                    continue;
                                }

                                console.log('[Phone] Received Offer from Host. Creating audio peer...');
                                audioPeerCreatedRef.current = true;

                                // Delay slightly to ensure cleaner execution stack
                                setTimeout(() => {
                                    try {
                                        const peer = new SimplePeer({
                                            initiator: false,
                                            trickle: false,
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
                                            console.log('[Phone] Sending signal to host:', data.type);
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

                                            // Send Identity immediately upon connection
                                            sendIdentity(peer, trackerPeer);
                                        });

                                        peer.on('error', (err: Error) => {
                                            console.error('[Phone] Peer error:', err);
                                            updateStatus(`Connection lost: ${err.message}`, 'status-error');
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

                                        // Process the Offer
                                        console.log('[Phone] Signaling Offer to Peer...');
                                        peer.signal(signal);
                                    } catch (err) {
                                        console.error('[Phone] Failed to create/signal peer:', err);
                                        audioPeerCreatedRef.current = false; // Reset if failed
                                    }
                                }, 100);

                            } else {
                                // Forward subsequent signals to existing peer, BUT IGNORE OFFERS
                                // If we receive another "offer" while we have a peer, it's likely a duplicate or a race.
                                // Trying to signal an existing peer with a new Offer triggers renegotiation/ICE restart,
                                // which is failing here. We should only accept answer/candidate signals on an existing peer.
                                if (signal.type === 'offer') {
                                    console.log('[Phone] Ignoring subsequent/duplicate Offer.');
                                    return;
                                }

                                console.log('[Phone] Received subsequent signal:', signal.type);
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
            const params = new URLSearchParams(window.location.search);
            const urlTrackers = params.getAll('tracker');

            // Reliable public trackers only - SINGLE default to ensure matching
            const reliableTrackers = [
                'wss://tracker.openwebtorrent.com',
            ];



            const uniqueTrackers = Array.from(new Set([...urlTrackers, ...reliableTrackers]));
            connect(partyId, uniqueTrackers);
        }
    };

    useEffect(() => {
        const partyId = getPartyIdFromUrl();
        if (!partyId) {
            updateStatus('❌ No Party ID', 'status-error');
        } else {
            // Get trackers from URL params
            const params = new URLSearchParams(window.location.search);
            const urlTrackers = params.getAll('tracker');

            // Reliable public trackers
            const reliableTrackers = [
                'wss://tracker.openwebtorrent.com',
            ];



            // Combine reliable trackers with URL-provided trackers
            const allTrackers = [...urlTrackers, ...reliableTrackers];

            // Deduplicate
            const uniqueTrackers = Array.from(new Set(allTrackers));

            console.log('[Phone] Connecting with trackers:', uniqueTrackers);
            connect(partyId, uniqueTrackers);
        }

        return cleanup;
    }, []);

    return (
        <div className={`melodiq-phone-client ${status.className}`}>
            <div className="status-container">
                <div className="status-icon">
                    {status.className === 'status-connected' ? '🎤' : '⏳'}
                </div>
                <div className="status-text">{status.message}</div>

                {/* Identity Settings */}
                <div className="identity-settings" style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Your Name</label>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                padding: '8px',
                                borderRadius: '4px',
                                width: '100%',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Your Color</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: `hsl(${playerHue}, 100%, 50%)`,
                                    border: '2px solid white'
                                }}
                            />
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={playerHue}
                                onChange={(e) => setPlayerHue(parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>
                </div>

                {showReconnect && (
                    <button onClick={handleReconnect} className="reconnect-btn">
                        Retry Connection
                    </button>
                )}
            </div>

            <style>{`
                .melodiq-phone-client {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: #121212;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    margin: 0;
                }
                .status-container {
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                }
                .status-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .status-text {
                    font-size: 1.2rem;
                    margin-bottom: 2rem;
                }
                .status-connecting { color: #fbbf24; }
                .status-connected { color: #4ade80; }
                .status-error { color: #f87171; }
                .status-disconnected { color: #9ca3af; }
                
                .reconnect-btn {
                    background: #90caf9;
                    color: #000;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    font-size: 1rem;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 1rem;
                }
                .reconnect-btn:active { transform: scale(0.95); }
            `}</style>
        </div>
    );
};
