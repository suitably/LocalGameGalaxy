import { useEffect, useState, useRef } from 'react';
import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';
import { computeRMS, autoCorrelate, freqToMidi } from './audio/AudioUtils';

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

    // Audio visualization state
    const [visualVolume, setVisualVolume] = useState(0);
    const [visualPitch, setVisualPitch] = useState(0);

    // Refs
    const peerRef = useRef<SimplePeer.Instance | null>(null);
    const trackerClientRef = useRef<Client | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const handledTrackerPeersRef = useRef<Set<string>>(new Set()); // Track handled tracker peers to avoid duplicates
    // const audioPeerCreatedRef = useRef<boolean>(false); // REMOVE (Replaced by race mode)
    const candidatePeersRef = useRef<Set<any>>(new Set()); // Track all racing peers
    const isWebRTCConnectedRef = useRef<boolean>(false); // For suppressing discovery spam

    // Audio processing refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const bufferRef = useRef<Float32Array | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastPitchSendTimeRef = useRef<number>(0);

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

    // Cleanup function
    const cleanup = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

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
        // Reset state refs
        handledTrackerPeersRef.current.clear();
        candidatePeersRef.current.forEach(p => {
            try { p.destroy(); } catch (e) { }
        });
        candidatePeersRef.current.clear();
        isWebRTCConnectedRef.current = false;
    };

    // Audio Loop
    const startAudioProcessing = (stream: MediaStream) => {
        try {
            const audioContext = new AudioContext({ latencyHint: 'interactive' });
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            bufferRef.current = new Float32Array(analyser.fftSize);

            const processAudio = () => {
                if (!analyserRef.current || !bufferRef.current || !audioContextRef.current) return;

                analyserRef.current.getFloatTimeDomainData(bufferRef.current as any);
                const volume = computeRMS(bufferRef.current);

                // Update Visualization State (Throttled slightly by React renders, but good enough)
                setVisualVolume(Math.min(1, volume * 5)); // Amplify for visibility

                if (volume > 0.01) {
                    const frequency = autoCorrelate(bufferRef.current, audioContextRef.current.sampleRate);
                    if (frequency !== -1) {
                        const note = freqToMidi(frequency);
                        setVisualPitch(note);

                        // SEND TO HOST
                        const now = Date.now();
                        // Send at max 30 times per second (approx every 33ms)
                        if (isWebRTCConnectedRef.current && peerRef.current && (peerRef.current as any).connected) {
                            if (now - lastPitchSendTimeRef.current > 33) {
                                const msg = JSON.stringify({
                                    type: 'pitch',
                                    frequency,
                                    note,
                                    volume
                                });
                                try {
                                    peerRef.current.send(msg);
                                    lastPitchSendTimeRef.current = now;
                                } catch (e) { /* Ignore send errors */ }
                            }
                        }
                    } else {
                        setVisualPitch(0);
                    }
                } else {
                    setVisualPitch(0);
                }

                animFrameRef.current = requestAnimationFrame(processAudio);
            };

            processAudio();

        } catch (err) {
            console.error('[Phone] Failed to start local audio processing:', err);
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
            // No early return for audioPeerCreatedRef - we allow racing!

            console.log('[Phone] Tracker peer connected. Initiating audio handshake (Race Candidate)...');

            try {
                const peer = new SimplePeer({
                    initiator: true, // Phone initiates to send stream immediately
                    trickle: true,
                    stream: mediaStreamRef.current!,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' },
                        ],
                    },
                });

                const connectionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

                // Track wrapped state
                (peer as any)._connectionId = connectionId;

                // Add to race candidates
                candidatePeersRef.current.add(peer);

                // Send our signals back to Host
                peer.on('signal', (data: any) => {
                    if (data.type !== 'candidate') {
                        console.log('[Phone] Sending signal to host:', data.type, 'ConnID:', connectionId);
                    }
                    if (trackerPeer.connected) {
                        try {
                            const payload = { connectionId, signal: data };
                            trackerPeer.send(JSON.stringify(payload) + '\n');
                        } catch (e) {
                            console.error('[Phone] Failed to send signal:', e);
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
                                        if (signal.type !== 'candidate') {
                                            console.log('[Phone] Processing matched signal:', signal.type);
                                        }
                                        peer.signal(signal);
                                    }
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

                peer.on('connect', () => {
                    if (isWebRTCConnectedRef.current) {
                        console.log('[Phone] Another peer won the race. Destroying late arrival.');
                        peer.destroy();
                        return;
                    }

                    console.log('[Phone] Connected to host! (We won the race)');
                    isWebRTCConnectedRef.current = true;
                    peerRef.current = peer; // Set winner as main peer
                    updateStatus('✅ Connected', 'status-connected');
                    setShowReconnect(false);
                    updateStatus('✅ Connected', 'status-connected');
                    setShowReconnect(false);
                    // Send identity inside an envelope too? No, Host expects specific format for identity.
                    // But we modified Host to check connectionId for identity too.
                    const identityMsg = {
                        type: 'identify',
                        name: playerName,
                        hue: playerHue,
                        connectionId // Include matching connectionId
                    };
                    // Send via WebRTC data (fastest) and Tracker (fallback)
                    if ((peer as any).connected) peer.send(JSON.stringify(identityMsg));
                    if (trackerPeer.connected) trackerPeer.send(JSON.stringify(identityMsg) + '\n');

                    // Destroy all other candidates
                    candidatePeersRef.current.delete(peer);
                    candidatePeersRef.current.forEach(p => {
                        try { p.destroy(); } catch (e) { }
                    });
                    candidatePeersRef.current.clear();
                });

                peer.on('error', (err: Error) => {
                    candidatePeersRef.current.delete(peer);

                    // Only show error if THIS was the connected peer
                    if (isWebRTCConnectedRef.current && peerRef.current === peer) {
                        console.error('[Phone] Peer error:', err);
                        isWebRTCConnectedRef.current = false;
                        updateStatus(`Connection lost: ${err.message}`, 'status-error');
                        setShowReconnect(true);
                        handledTrackerPeersRef.current.delete(trackerPeerId); // Allow retry
                    } else {
                        console.warn('[Phone] Candidate peer failed (ignored):', err.message);
                        // If we are NOT connected, and this was the last candidate... maybe show error?
                        // But usually better to stay "Connecting..."
                    }
                    trackerPeer.off('data', onData);
                });

                peer.on('close', () => {
                    candidatePeersRef.current.delete(peer);

                    if (isWebRTCConnectedRef.current && peerRef.current === peer) {
                        console.log('[Phone] Connection closed');
                        isWebRTCConnectedRef.current = false;
                        updateStatus('Disconnected', 'status-disconnected');
                        setShowReconnect(true);
                        handledTrackerPeersRef.current.delete(trackerPeerId);
                    }
                    trackerPeer.off('data', onData);
                });

                trackerPeer.on('close', () => {
                    peer.destroy();
                    candidatePeersRef.current.delete(peer);
                    handledTrackerPeersRef.current.delete(trackerPeerId);
                });

            } catch (err) {
                console.error('[Phone] Failed to create/signal peer:', err);
                handledTrackerPeersRef.current.delete(trackerPeerId);
            }
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
            // START LOCAL PROCESSING
            startAudioProcessing(stream);

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
                rtcConfig: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            } as any);

            trackerClientRef.current = trackerClient;

            trackerClient.on('peer', (trackerPeer: any) => {
                if (isWebRTCConnectedRef.current) {
                    return; // Ignore spam if we already have a live WebRTC link
                }

                // Prevent connecting to self
                const tpId = trackerPeer._id || trackerPeer.id;
                if (tpId === (trackerClient as any).peerId) {
                    return;
                }

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
            const reliableTrackers: string[] = [];



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
            const reliableTrackers: string[] = [];



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

                {/* VISUALIZATION BAR */}
                {status.className === 'status-connected' && (
                    <div style={{
                        width: '100%',
                        height: '20px',
                        background: '#333',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginBottom: '20px',
                        position: 'relative',
                        border: '1px solid #555'
                    }}>
                        <div style={{
                            width: `${Math.min(100, visualVolume * 100)}%`,
                            height: '100%',
                            background: `hsl(${playerHue}, 100%, 50%)`,
                            transition: 'width 0.1s linear'
                        }} />
                        {visualPitch > 0 && (
                            <div style={{
                                position: 'absolute',
                                left: `${((visualPitch - 36) / (84 - 36)) * 100}%`, // Assuming C2 to C6 roughly
                                top: 0,
                                bottom: 0,
                                width: '4px',
                                background: 'white',
                                boxShadow: '0 0 5px white'
                            }} />
                        )}
                    </div>
                )}

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
