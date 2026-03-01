import { useEffect, useState, useRef, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { computeRMS, autoCorrelate, freqToMidi } from './audio/AudioUtils';
import { useWebRTCClient } from '../../lib/webrtc/useWebRTCClient';
import { initMelodiqI18n } from './i18n';
import { useTranslation } from 'react-i18next';

export const MelodiqPhoneClient = () => {
    initMelodiqI18n();
    const { t } = useTranslation();
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('melodiq_phone_name') || `Phone ${Math.floor(Math.random() * 1000)}`);
    const [playerHue, setPlayerHue] = useState<number>(() => {
        const stored = localStorage.getItem('melodiq_phone_hue');
        return stored ? parseInt(stored) : Math.floor(Math.random() * 360);
    });
    const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => localStorage.getItem('melodiq_mic_id') || '');
    const [isActive, setIsActive] = useState(true);

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const handleSnackbarClose = () => setSnackbarOpen(false);

    const volumeBarRef = useRef<HTMLDivElement>(null);
    const pitchIndicatorRef = useRef<HTMLDivElement>(null);
    const noteNameRef = useRef<HTMLDivElement>(null);

    const [latestStats, setLatestStats] = useState<{ song: string, score: number, date: string } | null>(null);
    const [availableTracks, setAvailableTracks] = useState<string[]>([]);
    const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);

    const peerRef = useRef<any>(null);

    // --- Queue & Library State ---
    const [activeTab, setActiveTab] = useState<'mic' | 'queue' | 'remote'>('mic');
    const [queueSearchQuery, setQueueSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ genre: 'All', year: 'All', language: 'All' });
    const [libraryResults, setLibraryResults] = useState<any[]>([]);
    const [hostQueue, setHostQueue] = useState<any[]>([]);
    const [nowPlaying, setNowPlaying] = useState<any>(null);

    const sendSearch = useCallback((query: string) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'library.search', query, filters };
        peerRef.current.send(JSON.stringify(msg));
    }, [filters]);

    useEffect(() => {
        if (activeTab === 'queue' && peerRef.current?.connected) {
            sendSearch(queueSearchQuery);
        }
    }, [activeTab, queueSearchQuery, sendSearch]);

    useEffect(() => {
        localStorage.setItem('melodiq_phone_name', playerName);
        localStorage.setItem('melodiq_phone_hue', String(playerHue));
        if (selectedDeviceId) localStorage.setItem('melodiq_mic_id', selectedDeviceId);

        if (peerRef.current && peerRef.current.connected) {
            peerRef.current.send(JSON.stringify({
                type: 'identify',
                name: playerName,
                hue: playerHue,
                connectionId: peerRef.current._connectionId
            }));
        }
    }, [playerName, playerHue, selectedDeviceId]);

    useEffect(() => {
        const getDevices = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
        };
        getDevices();
        navigator.mediaDevices.ondevicechange = getDevices;
        return () => { navigator.mediaDevices.ondevicechange = null; };
    }, []);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const bufferRef = useRef<Float32Array | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastPitchSendTimeRef = useRef<number>(0);

    const startAudioProcessing = useCallback((stream: MediaStream) => {
        try {
            if (audioContextRef.current) return;
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

                const visVolume = Math.min(1, volume * 5);
                if (volumeBarRef.current) volumeBarRef.current.style.width = `${visVolume * 100}%`;

                if (volume > 0.01) {
                    const frequency = autoCorrelate(bufferRef.current, audioContextRef.current.sampleRate);
                    if (frequency !== -1) {
                        const note = freqToMidi(frequency);
                        const roundedNote = Math.round(note);
                        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                        const noteName = noteNames[((roundedNote % 12) + 12) % 12];
                        const octave = Math.floor(roundedNote / 12) - 1;

                        if (noteNameRef.current) noteNameRef.current.innerText = `${noteName}${octave}`;
                        if (pitchIndicatorRef.current) {
                            pitchIndicatorRef.current.style.display = 'block';
                            pitchIndicatorRef.current.style.left = `${((note - 36) / (84 - 36)) * 100}%`;
                        }

                        const now = Date.now();
                        if (peerRef.current && (peerRef.current as any).connected && now - lastPitchSendTimeRef.current > 33) {
                            try {
                                peerRef.current.send(JSON.stringify({ type: 'pitch', frequency, note, volume }));
                                lastPitchSendTimeRef.current = now;
                            } catch (e) { }
                        }
                    } else {
                        if (noteNameRef.current) noteNameRef.current.innerText = '';
                        if (pitchIndicatorRef.current) pitchIndicatorRef.current.style.display = 'none';
                    }
                } else {
                    if (noteNameRef.current) noteNameRef.current.innerText = '';
                    if (pitchIndicatorRef.current) pitchIndicatorRef.current.style.display = 'none';
                }
                animFrameRef.current = requestAnimationFrame(processAudio);
            };
            processAudio();
        } catch (err) {
            console.error('[Phone] Failed to start local audio processing:', err);
        }
    }, []);

    const params = new URLSearchParams(window.location.search);
    const partyId = params.get('party');
    const trackerUrls = Array.from(new Set(params.getAll('tracker')));

    const { statusMessage, statusClassName, isConnected, reconnect, peer } = useWebRTCClient(partyId, trackerUrls, {
        getMediaStream: async () => {
            const constraints: MediaStreamConstraints = {
                audio: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                },
                video: false,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
            startAudioProcessing(stream);
            return stream;
        },
        getIdentity: () => ({ name: playerName, hue: playerHue }),
        onMessage: (parsed) => {
            if (parsed.type === 'songInfo') {
                if (parsed.tracks && Array.isArray(parsed.tracks)) {
                    setAvailableTracks(parsed.tracks);
                    setSelectedTrackIndex(0);
                }
            } else if (parsed.type === 'stats') {
                const statsEntry = { song: parsed.songTitle, score: parsed.score, date: new Date().toISOString() };
                const historyStr = localStorage.getItem('melodiq_history');
                const history = historyStr ? JSON.parse(historyStr) : [];
                history.unshift(statsEntry);
                if (history.length > 50) history.pop();
                localStorage.setItem('melodiq_history', JSON.stringify(history));
                setLatestStats(statsEntry);

                const songHistory = history.filter((h: any) => h.song === parsed.songTitle);
                const relevantScores = songHistory.map((h: any) => h.score);
                const maxScore = relevantScores.length > 0 ? Math.max(...relevantScores) : 0;

                if (peerRef.current?.connected) {
                    peerRef.current.send(JSON.stringify({
                        type: 'history_report',
                        songTitle: parsed.songTitle,
                        history: songHistory,
                        isNewRecord: statsEntry.score >= maxScore && statsEntry.score > 0
                    }));
                }
                setTimeout(() => setLatestStats(null), 5000);
            } else if (parsed.type === 'roster.update') {
                if (peerRef.current && peerRef.current._connectionId) {
                    const myId = peerRef.current._connectionId;
                    setIsActive(parsed.roster.some((p: any) => p.connectionId === myId));
                }
            } else if (parsed.type === 'queue.update') {
                setHostQueue(parsed.queue || []);
                setNowPlaying(parsed.nowPlaying);
            } else if (parsed.type === 'library.results') {
                setLibraryResults(parsed.results || []);
            }
        }
    });

    useEffect(() => {
        peerRef.current = peer;
        if (peer && (peer as any).connected) {
            [500, 1500, 3000].forEach(delay => {
                setTimeout(() => {
                    if (peerRef.current && (peerRef.current as any).connected) {
                        peerRef.current.send(JSON.stringify({ type: 'queue.get' }));
                        peerRef.current.send(JSON.stringify({ type: 'library.search', query: '' }));
                    }
                }, delay);
            });
        }
    }, [peer]);

    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const handleTrackSelect = (index: number) => {
        setSelectedTrackIndex(index);
        if (isConnected && peerRef.current?.connected) {
            peerRef.current.send(JSON.stringify({ type: 'trackSelect', trackIndex: index }));
        }
    };

    const status = { message: statusMessage, className: statusClassName };
    const showReconnect = !isConnected && statusClassName === 'status-error';
    const handleReconnect = reconnect;



    // --- Remote Configuration State ---
    const [showRemoteSettings, setShowRemoteSettings] = useState(false);
    const [remoteUrl, setRemoteUrl] = useState('');
    const [remoteToken, setRemoteToken] = useState('');

    const sendRemoteConfig = () => {
        if (!peerRef.current || !(peerRef.current as any).connected) {
            alert('Not connected to Host');
            return;
        }

        const msg = {
            type: 'configure',
            config: {
                url: remoteUrl,
                token: remoteToken
            }
        };

        try {
            peerRef.current.send(JSON.stringify(msg));
            alert('Settings sent to Host! The TV should reload shortly.');
            setShowRemoteSettings(false);
        } catch (e) {
            alert('Failed to send settings');
            console.error(e);
        }
    };

    const addToQueue = (songId: string) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'queue.add', songId };
        peerRef.current.send(JSON.stringify(msg));
        setSnackbarMessage('Added to Queue!');
        setSnackbarOpen(true);
    };

    // --- Remote Control Actions ---
    const sendRemoteCommand = (command: string, value?: any) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'remote.command', command, value };
        peerRef.current.send(JSON.stringify(msg));
        // vibration feedback
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const removeFromQueue = (itemId: string) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'queue.remove', itemId };
        peerRef.current.send(JSON.stringify(msg));
    };

    const GENRES = ['All', 'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 'Jazz', 'Metal', 'Folk', 'Reggae', 'Blues', 'Soundtrack', 'Holiday'];
    const YEARS = ['All', '2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s'];
    const LANGUAGES = ['All', 'English', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Chinese'];


    if (showRemoteSettings) {
        return (
            <div className="phone-client" style={{ padding: 20, textAlign: 'left' }}>
                <h2>{t('melodiq.host_settings')}</h2>
                <p>{t('melodiq.host_desc')}</p>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>{t('melodiq.helper_url')}</label>
                    <input
                        type="text"
                        value={remoteUrl}
                        onChange={e => setRemoteUrl(e.target.value)}
                        placeholder="http://192.168.1.50:3000"
                        style={{ width: '100%', padding: 10, fontSize: 16 }}
                    />
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>{t('melodiq.security_token')}</label>
                    <input
                        type="text"
                        value={remoteToken}
                        onChange={e => setRemoteToken(e.target.value)}
                        placeholder="Token from Helper Console"
                        style={{ width: '100%', padding: 10, fontSize: 16 }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={sendRemoteConfig} style={{ flex: 1, padding: 15, background: '#4caf50', color: 'white', border: 'none', borderRadius: 8 }}>
                        {t('melodiq.send_tv')}
                    </button>
                    <button onClick={() => setShowRemoteSettings(false)} style={{ flex: 1, padding: 15, background: '#666', color: 'white', border: 'none', borderRadius: 8 }}>
                        {t('melodiq.cancel')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`melodiq-phone-client ${status.className}`}>
            {/* Header / Status Bar */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                padding: '10px 15px',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        backgroundColor: status.className === 'status-connected' ? '#4ade80' :
                            status.className === 'status-connecting' ? '#fbbf24' : '#f87171'
                    }} />
                    <div style={{ fontWeight: 'bold' }}>{status.message}</div>
                </div>
                <button
                    onClick={() => setShowRemoteSettings(true)}
                    style={{ background: 'transparent', border: '1px solid #666', color: '#aaa', padding: '5px 10px', borderRadius: 4, fontSize: 12 }}
                >
                    ⚙️ Host
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: 60, background: '#1a1a1a', borderTop: '1px solid #333',
                display: 'flex', zIndex: 100
            }}>
                <button
                    onClick={() => setActiveTab('mic')}
                    style={{
                        flex: 1, background: activeTab === 'mic' ? '#333' : 'transparent',
                        border: 'none', color: activeTab === 'mic' ? '#fff' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎤</span>
                    <span style={{ fontSize: 12 }}>{t('melodiq.mic')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('queue')}
                    style={{
                        flex: 1, background: activeTab === 'queue' ? '#333' : 'transparent',
                        border: 'none', color: activeTab === 'queue' ? '#fff' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎵</span>
                    <span style={{ fontSize: 12 }}>{t('melodiq.queue')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('remote')}
                    style={{
                        flex: 1, background: activeTab === 'remote' ? '#333' : 'transparent',
                        border: 'none', color: activeTab === 'remote' ? '#fff' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎮</span>
                    <span style={{ fontSize: 12 }}>{t('melodiq.remote')}</span>
                </button>
            </div>

            <div className="main-content" style={{ marginTop: 60, paddingBottom: 100, paddingLeft: 10, paddingRight: 10, width: '100%', boxSizing: 'border-box' }}>

                {activeTab === 'mic' && (
                    <>
                        {/* VISUALIZATION BAR */}
                        <div style={{
                            width: '100%',
                            height: '40px',
                            background: '#222',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            marginTop: '20px',
                            position: 'relative',
                            border: '1px solid #444',
                            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
                        }}>
                            <div
                                ref={volumeBarRef}
                                style={{
                                    width: '0%',
                                    height: '100%',
                                    background: `linear-gradient(90deg, hsl(${playerHue}, 100%, 30%) 0%, hsl(${playerHue}, 100%, 50%) 100%)`,
                                    transition: 'width 0.05s linear',
                                    opacity: 0.5
                                }}
                            />

                            {/* Note Name Display */}
                            <div
                                ref={noteNameRef}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem',
                                    color: 'white',
                                    textShadow: '0 2px 4px black'
                                }}
                            >
                            </div>

                            <div
                                ref={pitchIndicatorRef}
                                style={{
                                    position: 'absolute',
                                    left: '0%',
                                    top: '5px',
                                    bottom: '5px',
                                    width: '6px',
                                    borderRadius: '3px',
                                    background: 'white',
                                    boxShadow: '0 0 10px white, 0 0 5px ' + `hsl(${playerHue}, 100%, 50%)`,
                                    transition: 'left 0.1s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
                                    display: 'none'
                                }}
                            />
                        </div>

                        {/* Stats Notification */}
                        {latestStats && (
                            <div style={{
                                animation: 'fadeIn 0.5s',
                                background: 'rgba(255, 255, 255, 0.1)',
                                padding: '15px',
                                borderRadius: '10px',
                                marginTop: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{t('melodiq.last_performance')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '5px 0' }}>{latestStats.song}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>{latestStats.score} pts</div>
                            </div>
                        )}

                        {/* Track Selector */}
                        {availableTracks.length > 1 && (
                            <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#ccc' }}>{t('melodiq.select_part')}</div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {availableTracks.map((track, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleTrackSelect(idx)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: selectedTrackIndex === idx ? `hsl(${playerHue}, 80%, 40%)` : 'rgba(255,255,255,0.1)',
                                                border: selectedTrackIndex === idx ? `1px solid hsl(${playerHue}, 100%, 70%)` : '1px solid transparent',
                                                color: 'white',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: selectedTrackIndex === idx ? 'bold' : 'normal',
                                                minWidth: '100px'
                                            }}
                                        >
                                            {track}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Roster Toggle */}
                        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#ccc' }}>
                                {isActive ? t('melodiq.in_game') : t('melodiq.sitting_out')}
                            </div>
                            <button
                                onClick={() => {
                                    console.log('[Phone] Toggle Button Clicked'); // DEBUG LOG
                                    if (peerRef.current && (peerRef.current as any).connected) {
                                        // Send toggle
                                        console.log('[Phone] Sending roster.toggle request...'); // DEBUG LOG
                                        const msg = { type: 'roster.toggle' };
                                        peerRef.current.send(JSON.stringify(msg));
                                        // Optimistic update
                                        setIsActive(!isActive);
                                    } else {
                                        console.warn('[Phone] Cannot toggle: Peer not connected'); // DEBUG LOG
                                    }
                                }}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isActive ? '#f44336' : '#4caf50',
                                    color: 'white',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                {isActive ? t('melodiq.leave_game') : t('melodiq.join_game')}
                            </button>
                        </div>

                        {/* Identity Settings */}
                        <div className="identity-settings" style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>{t('melodiq.your_name')}</label>
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
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>{t('melodiq.your_color')}</label>
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
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>{t('melodiq.microphone')}</label>
                                <select
                                    value={selectedDeviceId}
                                    onChange={(e) => {
                                        setSelectedDeviceId(e.target.value);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <option value="">{t('melodiq.default_mic')}</option>
                                    {audioInputDevices.map((device, i) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Microphone ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {showReconnect && (
                            <button onClick={handleReconnect} className="reconnect-btn">
                                {t('melodiq.retry_connection')}
                            </button>
                        )}
                    </>
                )}

                {activeTab === 'queue' && (
                    <div style={{ paddingTop: 10 }}>
                        {/* Now Playing */}
                        {nowPlaying && (
                            <div style={{ padding: 10, background: '#333', borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #4caf50' }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', marginBottom: 2 }}>{t('melodiq.now_playing')}</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{nowPlaying.title}</div>
                                <div style={{ fontSize: 12, color: '#bbb' }}>{nowPlaying.artist}</div>
                            </div>
                        )}

                        {/* Search */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                            <input
                                type="text"
                                value={queueSearchQuery}
                                onChange={(e) => {
                                    setQueueSearchQuery(e.target.value);
                                    sendSearch(e.target.value); // Live search
                                }}
                                placeholder={t('melodiq.search_songs')}
                                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#333', color: 'white', fontSize: 16 }}
                            />
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    padding: '0 15px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: showFilters ? '#2196f3' : '#444',
                                    color: 'white'
                                }}
                            >
                                🌪️
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
                                marginBottom: 15, padding: 10, background: '#222', borderRadius: 8
                            }}>
                                <select
                                    value={filters.genre}
                                    onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
                                    style={{ padding: 8, borderRadius: 4, background: '#333', color: 'white', border: 'none' }}
                                >
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <select
                                    value={filters.year}
                                    onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                                    style={{ padding: 8, borderRadius: 4, background: '#333', color: 'white', border: 'none' }}
                                >
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    value={filters.language}
                                    onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                                    style={{ padding: 8, borderRadius: 4, background: '#333', color: 'white', border: 'none' }}
                                >
                                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Search Results */}
                        {libraryResults.length > 0 ? (
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#888' }}>
                                    {queueSearchQuery || filters.genre !== 'All' ? t('melodiq.results') : t('melodiq.library')}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {libraryResults.map(song => (
                                        <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#222', borderRadius: 8 }}>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                                                <div style={{ fontSize: 12, color: '#888' }}>{song.artist}</div>
                                            </div>
                                            <button
                                                onClick={() => addToQueue(song.id)}
                                                style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#4caf50', color: 'white', marginLeft: 10 }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: 20, textAlign: 'center', padding: 20, color: '#666', background: '#222', borderRadius: 8 }}>
                                <div>{queueSearchQuery ? t('melodiq.no_matches') : t('melodiq.library_not_loaded')}</div>
                                <button
                                    className="load-lib-btn"
                                    onClick={() => sendSearch(queueSearchQuery)}
                                    style={{ marginTop: 10, padding: '12px 24px', borderRadius: 8, border: 'none', background: '#444', color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                                >
                                    ↻ {t('melodiq.load_library_btn')}
                                </button>
                            </div>
                        )}

                        {/* Queue List */}
                        <div>
                            <h4 style={{ margin: '0 0 10px 0', color: '#888' }}>{t('melodiq.up_next', { count: hostQueue.length })}</h4>
                            {hostQueue.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>{t('melodiq.queue_empty_phone')}</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {hostQueue.map((item, idx) => (
                                        <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#2a2a2a', borderRadius: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                                <div style={{ color: '#666', width: 20, textAlign: 'center' }}>{idx + 1}</div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                                    <div style={{ fontSize: 12, color: '#888' }}>{item.artist} {item.requester && `• ${item.requester}`}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromQueue(item.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 16, padding: '0 10px' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'remote' && (
                    <div style={{ paddingTop: 20, textAlign: 'center' }}>
                        <h3 style={{ color: '#aaa', marginBottom: 20 }}>{t('melodiq.remote_control')}</h3>

                        {/* Playback Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 30 }}>
                            <button
                                onClick={() => sendRemoteCommand('play')}
                                className="remote-btn"
                                style={{ background: '#4caf50', gridColumn: 'span 2' }}
                            >
                                ⏯ {t('melodiq.play_pause')}
                            </button>

                            <button
                                onClick={() => sendRemoteCommand('restart')}
                                className="remote-btn"
                                style={{ background: '#ff9800' }}
                            >
                                ⏮ {t('melodiq.restart')}
                            </button>

                            <button
                                onClick={() => sendRemoteCommand('next')}
                                className="remote-btn"
                                style={{ background: '#2196f3' }}
                            >
                                ⏭ {t('melodiq.next')}
                            </button>
                        </div>

                        <div style={{ height: 1, background: '#333', margin: '20px 0' }} />

                        {/* System Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
                            <button
                                onClick={() => {
                                    if (confirm(t('melodiq.stop_confirm'))) {
                                        sendRemoteCommand('exit');
                                    }
                                }}
                                className="remote-btn"
                                style={{ background: '#f44336' }}
                            >
                                ⏹ {t('melodiq.exit_session')}
                            </button>
                        </div>

                        <div style={{ marginTop: 40, fontSize: 12, color: '#666' }}>
                            {t('melodiq.control_desc')}
                        </div>
                    </div>
                )}
            </div>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .melodiq-phone-client {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: #121212;
                    color: white;
                    display: block; /* Removed flex centering */
                    min-height: 100vh;
                    margin: 0;
                    overflow-x: hidden;
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

                .remote-btn {
                    padding: 20px;
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 1.1rem;
                    font-weight: bold;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: transform 0.1s;
                }
                .remote-btn:active {
                    transform: scale(0.96);
                    box-shadow: 0 2px 3px rgba(0,0,0,0.3);
                }

                /* Ensure main content is clickable and on top */
                .main-content {
                    position: relative;
                    z-index: 10;
                }

                /* load library button active state */
                .load-lib-btn:active {
                    transform: scale(0.95);
                    background: #666 !important;
                }
            `}</style>
        </div>
    );
};
