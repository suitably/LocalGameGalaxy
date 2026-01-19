import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, IconButton, Slider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { parseUltraStarTxt } from '../parser';
import { PitchVisualizer, type SongWithNotes, type SungSegment } from './PitchVisualizer';
import { LyricsDisplay } from './LyricsDisplay';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';
import { type UserProfile, type ActivePlayer } from '../MelodiqSettings';
import { ScoreBoard } from './ScoreBoard';

interface MelodiqSessionProps {
    song: SongWithNotes;
    onExit: () => void;
    // Props are now optional/ignored as we read from LS, but kept for compatibility if needed for overrides
    showDebugOverlay?: boolean;
    showDevSlider?: boolean;
    showMicStatus?: boolean;
}

// Helper class to manage runtime state for a single player
class PlayerRuntime {
    public mic: MicrophoneManager;
    public score: number = 0;

    // Stable refs for high-frequency updates without React renders
    public pitchRef = { current: null as PitchResult | null };
    public segmentsRef = { current: {} as Record<number, SungSegment[]> };

    // Helper to track active segment for optimization
    public activeSegment: SungSegment | null = null;

    public config: UserProfile & { deviceId: string; volume?: number; muted?: boolean; latency?: number };

    constructor(config: UserProfile & { deviceId: string; volume?: number; muted?: boolean; latency?: number }) {
        this.mic = new MicrophoneManager();
        this.config = config;
    }
}

export const MelodiqSession: React.FC<MelodiqSessionProps> = ({ song, onExit }) => {
    // Session State
    // Read Settings from LocalStorage
    const [showDebugOverlay] = useState(localStorage.getItem('melodiq_show_overlay') === 'true');
    const [showDevSlider] = useState(localStorage.getItem('melodiq_show_slider') === 'true');
    const [showMicStatus] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_mic_status');
        return stored === null ? true : stored === 'true';
    });
    const [showNoteLabels] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_note_labels');
        return stored === null ? true : stored === 'true';
    });
    // Layout State
    const [layoutOverride] = useState(localStorage.getItem('melodiq_layout_override') || '');

    // Volume State
    const [songVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_song_volume');
        return stored ? parseFloat(stored) : 0.7;
    });
    const [masterVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_master_volume');
        return stored ? parseFloat(stored) : 1.0;
    });

    // Dynamic Player State
    const [players, setPlayers] = useState<PlayerRuntime[]>([]);
    const [ready, setReady] = useState(false);

    // We use a ref to hold the runtime objects to avoid re-renders on every pitch update
    // But we also need state to trigger initial render.
    // The `players` state above holds the initial list. The Refs inside PlayerRuntime are mutable.
    // However, to force React to re-render scores, we need a separate state or forceUpdate.
    const [scores, setScores] = useState<Record<string, number>>({});

    // Audio/Video logic
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpmMultiplier] = useState(4);
    const [isFinished, setIsFinished] = useState(false);



    // UI State
    const [_duration, setDuration] = useState(0);
    const [devPitchOverride, setDevPitchOverride] = useState<number | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
    const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);

    const requestRef = useRef<number>(0);
    const lastScoreUpdateRef = useRef<number>(0);

    // Parse song on mount
    const parsedSong: React.MemoExoticComponent<any> | SongWithNotes = React.useMemo(() => {
        const parsed = parseUltraStarTxt(song.txtContent);
        return { ...song, notes: parsed.notes, headers: parsed.headers, bpm: parsed.bpm, gap: parsed.gap };
    }, [song]);

    // Calculate Grid Layout
    const gridLayout = React.useMemo(() => {
        const count = players.length;
        if (count === 0) return { rows: [], columnWidthPercent: 100 };

        let rowConfig: number[] = [];

        // 1. Check Override
        if (layoutOverride) {
            const parts = layoutOverride.split('.').map(p => parseInt(p.trim())).filter(n => !isNaN(n) && n > 0);
            const sum = parts.reduce((a, b) => a + b, 0);
            if (sum === count) {
                rowConfig = parts;
            }
        }

        // 2. Default Balanced Logic if no valid override
        if (rowConfig.length === 0) {
            // Heuristic:
            // 1-3 Players: Vertical Stack (1 col per row) to maximize timeline width
            if (count <= 3) {
                rowConfig = new Array(count).fill(1);
            } else {
                // 4+ Players: Balanced Grid (Max 3 columns)
                const maxCols = 3;
                const numRows = Math.ceil(count / maxCols);
                const baseCols = Math.floor(count / numRows);
                const remainder = count % numRows;

                rowConfig = [];
                for (let i = 0; i < numRows; i++) {
                    // Distribute remainder to first rows
                    rowConfig.push(baseCols + (i < remainder ? 1 : 0));
                }
            }
        }

        // Calculate Max Columns for Uniform Width
        const maxColumnsInGrid = Math.max(...rowConfig);

        return {
            rows: rowConfig,
            columnWidthPercent: 100 / maxColumnsInGrid
        };
    }, [players.length, layoutOverride]);

    // Initialization Effect
    useEffect(() => {
        const storedProfiles = localStorage.getItem('melodiq_profiles');
        const storedActive = localStorage.getItem('melodiq_active_session');

        if (storedProfiles && storedActive) {
            const allProfiles: UserProfile[] = JSON.parse(storedProfiles);
            const activeSession: ActivePlayer[] = JSON.parse(storedActive);

            const newPlayers: PlayerRuntime[] = [];

            activeSession.forEach(p => {
                const profile = allProfiles.find(prof => prof.id === p.profileId);
                if (profile) {
                    newPlayers.push(new PlayerRuntime({
                        ...profile,
                        deviceId: p.deviceId,
                        volume: p.volume,
                        muted: p.muted,
                        latency: p.latency
                    }));
                }
            });

            setPlayers(newPlayers);
        } else {
            // Fallback for immediate migration issues or first run without settings
            console.warn("No dynamic settings found, falling back to empty session.");
        }
        setReady(true);
    }, []);

    const togglePlay = useCallback(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                if (videoRef.current) videoRef.current.pause();
            } else {
                audioRef.current.volume = songVolume * masterVolume;
                audioRef.current.play();
                if (videoRef.current) videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying, songVolume, masterVolume]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay]);

    const processPlayer = (
        player: PlayerRuntime,
        devOverride: number | null
    ) => {
        let pitch: PitchResult | null = null;
        if (devOverride !== null) {
            pitch = {
                frequency: 440 * Math.pow(2, (devOverride - 69) / 12),
                note: devOverride,
                volume: 1.0
            };
        } else {
            pitch = player.mic.getPitch();
        }
        player.pitchRef.current = pitch;

        if (pitch && pitch.note > 0 && isPlaying && parsedSong.notes && audioRef.current) {
            const beatDuration = 60000 / ((parsedSong.bpm || 120) * bpmMultiplier);
            const latency = player.config.latency || 0;
            const currentBeat = ((audioRef.current.currentTime * 1000) - latency - (parsedSong.gap || 0)) / beatDuration;

            const activeNoteIndex = parsedSong.notes.findIndex((n) =>
                n.type !== '-' &&
                currentBeat >= n.start &&
                currentBeat <= n.start + n.duration
            );

            if (activeNoteIndex !== -1) {
                const note = parsedSong.notes[activeNoteIndex];
                const targetPitch = note.pitch;
                const sungPitch = pitch.note;

                const diff = Math.abs((sungPitch % 12) - (targetPitch % 12));
                const semitoneDiff = Math.min(diff, 12 - diff);

                if (semitoneDiff < 1.0) {
                    player.score += 10;

                    const record = player.segmentsRef.current;

                    // Check if we can continue the active segment
                    // We need to check if activeSegment exists AND matches the current activeNoteIndex
                    const activeSeg = player.activeSegment;

                    if (activeSeg && activeSeg.noteIndex === activeNoteIndex) {
                        activeSeg.endBeat = currentBeat;
                    } else {
                        const newSegment = { noteIndex: activeNoteIndex, startBeat: currentBeat, endBeat: currentBeat };
                        player.activeSegment = newSegment;

                        if (!record[activeNoteIndex]) record[activeNoteIndex] = [];
                        record[activeNoteIndex].push(newSegment);
                    }
                }
            }
        }
    };

    const updateLoop = useCallback(() => {
        const now = performance.now();

        if (audioRef.current && isPlaying) {
            if (videoRef.current && Math.abs(videoRef.current.currentTime - audioRef.current.currentTime) > 0.2) {
                videoRef.current.currentTime = audioRef.current.currentTime;
            }
        }

        // Process All Players
        players.forEach((player, index) => {
            // Apply Dev Override only to the first player for simplicity
            const override = (index === 0) ? devPitchOverride : null;
            processPlayer(player, override);
        });

        // Update React State (Throttled)
        if (now - lastScoreUpdateRef.current > 200) {
            const newScores: Record<string, number> = {};
            players.forEach(p => {
                newScores[p.config.id] = p.score;
            });
            setScores(newScores); // Always set new object to trigger render
            lastScoreUpdateRef.current = now;
        }

        requestRef.current = requestAnimationFrame(updateLoop);
    }, [isPlaying, devPitchOverride, parsedSong, bpmMultiplier, players]);

    // Start/Stop Mics
    useEffect(() => {
        if (!ready || players.length === 0) return;

        players.forEach(p => {
            if (p.config.deviceId) {
                const vol = (p.config.volume ?? 0.8) * masterVolume;
                const muted = p.config.muted ?? false;
                p.mic.start(p.config.deviceId, vol, muted).catch(e => console.error(`Failed to start mic for ${p.config.name}`, e));
            }
        });

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            cancelAnimationFrame(requestRef.current);
            players.forEach(p => p.mic.stop());
        };
    }, [ready, players, updateLoop]);

    // Audio event handlers - set after audio source is loaded
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && audioSrc) {
            audio.onloadedmetadata = () => setDuration(audio.duration);
            audio.onended = () => {
                console.log('Song ended, showing scoreboard');
                setIsFinished(true);
                setIsPlaying(false);
                if (videoRef.current) videoRef.current.pause();
            };
        }
    }, [audioSrc]);

    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadAudio = async () => {
            if (!song.audio) return;
            try {
                if (song.audio instanceof Blob) {
                    activeUrl = URL.createObjectURL(song.audio);
                } else if (typeof song.audio === 'string') {
                    activeUrl = song.audio;
                } else {
                    // FileSystemFileHandle
                    // @ts-ignore
                    const file = await song.audio.getFile();
                    activeUrl = URL.createObjectURL(file);
                }
            } catch (e) {
                console.error("Failed to load audio", e);
            }
            if (mounted) setAudioSrc(activeUrl);
        };
        loadAudio();

        return () => {
            mounted = false;
            // Revoke if it was created from a blob or handle (which creates a blob url)
            if (activeUrl && typeof song.audio !== 'string') URL.revokeObjectURL(activeUrl);
        };
    }, [song.audio]);

    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadVideo = async () => {
            if (!song.video) return;
            try {
                if (song.video instanceof Blob) {
                    activeUrl = URL.createObjectURL(song.video);
                } else if (typeof song.video === 'string') {
                    activeUrl = song.video;
                } else {
                    // FileSystemFileHandle
                    // @ts-ignore
                    const file = await song.video.getFile();
                    activeUrl = URL.createObjectURL(file);
                }
            } catch (e) {
                console.error("Failed to load video", e);
            }
            if (mounted) setVideoSrc(activeUrl);
        };
        loadVideo();

        return () => {
            mounted = false;
            if (activeUrl && typeof song.video !== 'string') URL.revokeObjectURL(activeUrl);
        };
    }, [song.video]);

    // Auto-start logic
    const hasStartedRef = useRef(false);
    useEffect(() => {
        if (!hasStartedRef.current && ready && audioSrc && audioRef.current) {
            hasStartedRef.current = true;
            const audio = audioRef.current;

            // Set volume ensuring it's not overridden later by some other default
            audio.volume = songVolume * masterVolume;

            const startPlay = async () => {
                try {
                    await audio.play();
                    if (videoRef.current) {
                        // Sync video time just in case
                        videoRef.current.currentTime = audio.currentTime;
                        await videoRef.current.play();
                    }
                    setIsPlaying(true);
                } catch (e) {
                    console.error("Auto-start failed (likely browser policy):", e);
                    // Reset so user can try manually
                    hasStartedRef.current = false;
                }
            };
            startPlay();
        }
    }, [ready, audioSrc, songVolume, masterVolume]);

    if (!ready) return <Box sx={{ bgcolor: 'black', height: '100vh' }} />; // Loading black screen

    if (isFinished) {
        // Prepare props for ScoreBoard from valid players state
        const scoreBoardPlayers = players.map(p => ({
            config: p.config,
            score: p.score // Note: p.score is updated in real-time in the mutable object
        }));

        return <ScoreBoard players={scoreBoardPlayers} onExit={onExit} />;
    }

    return (
        <Box sx={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'black',
            color: 'white',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Background Video */}
            {videoSrc && (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    muted
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        objectFit: 'cover', zIndex: 0, opacity: 0.6
                    }}
                />
            )}
            {videoSrc && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
            )}

            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: 'none' }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
                    <IconButton onClick={onExit} color="inherit"><ArrowBackIcon /></IconButton>
                    <Typography variant="h6">{song.artist} - {song.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        {players.map(p => (
                            <Typography key={p.config.id} sx={{ color: `hsl(${p.config.hue}, 100%, 70%)` }} fontWeight="bold">
                                {p.config.name}: {scores[p.config.id] || 0}
                            </Typography>
                        ))}
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* Dynamic Split Screen Container */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {players.length === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography>No Active Players. Go to Settings.</Typography>
                            </Box>
                        )}

                        {/* Grid Rendering */}
                        {(() => {
                            let playerIndex = 0;
                            return gridLayout.rows.map((colsInRow, rowIndex) => (
                                <Box key={rowIndex} sx={{ flex: 1, display: 'flex', borderBottom: rowIndex < gridLayout.rows.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                                    {Array.from({ length: colsInRow }).map((_, colIndex) => {
                                        const player = players[playerIndex++];
                                        if (!player) return null; // Should not happen if logic is correct

                                        return (
                                            <Box
                                                key={player.config.id}
                                                sx={{
                                                    width: `${gridLayout.columnWidthPercent}%`,
                                                    height: '100%',
                                                    position: 'relative',
                                                    borderRight: colIndex < colsInRow - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                                }}
                                            >
                                                <PitchVisualizer
                                                    song={parsedSong}
                                                    audioRef={audioRef}
                                                    currentPitchRef={player.pitchRef}
                                                    sungSegmentsRef={player.segmentsRef}
                                                    showDebugOverlay={showDebugOverlay}
                                                    label={player.config.name}
                                                    hue={player.config.hue}
                                                    showNoteLabels={showNoteLabels}
                                                    latency={player.config.latency}
                                                />
                                            </Box>
                                        );
                                    })}
                                    {/* Empty filler if needed for row alignment? No, user wants left aligned, empty space empty. Flex row does this naturally if we set widths. */}
                                </Box>
                            ));
                        })()}

                        {/* Lyrics Overlay (Bottom - Flex Flow) */}
                        <Box sx={{
                            width: '100%',
                            pointerEvents: 'none',
                            zIndex: 10,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            bgcolor: 'rgba(0,0,0,0.2)'
                        }}>
                            <LyricsDisplay song={parsedSong} audioRef={audioRef} />
                        </Box>
                    </Box>
                </Box>

                {/* Controls */}
                {showDevSlider && (
                    <Box sx={{ width: 400, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)', p: 2, borderRadius: 2, pointerEvents: 'auto', mt: 2 }}>
                        <Typography width={140}>P1 Dev Pitch: {Math.round(devPitchOverride || 0)}</Typography>
                        <Slider value={devPitchOverride || 60} min={36} max={84} onChange={(_, v) => setDevPitchOverride(v as number)} />
                        <Button onClick={() => setDevPitchOverride(null)} variant="outlined" size="small">Reset</Button>
                    </Box>
                )}

                {showMicStatus && (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center', pointerEvents: 'auto' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {players.map(p => (
                                <Typography key={p.config.id} variant="caption" sx={{ color: `hsl(${p.config.hue}, 100%, 70%)` }}>
                                    {p.config.name} Mic: {p.mic.isActive ? 'On' : 'Off'}
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>

            {audioSrc && <audio ref={audioRef} src={audioSrc} style={{ display: 'none' }} />}
            {!audioSrc && <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>No Audio Source Found</Typography>}
        </Box>
    );
};
