import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, IconButton, Slider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Song } from '../db';
import { parseUltraStarTxt } from '../parser';
import { PitchVisualizer, type SongWithNotes } from './PitchVisualizer';
import { LyricsDisplay } from './LyricsDisplay';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';

interface MelodiqSessionProps {
    song: SongWithNotes;
    onExit: () => void;
    showDebugOverlay?: boolean;
    showDevSlider?: boolean;
    showMicStatus?: boolean;
}

export const MelodiqSession: React.FC<MelodiqSessionProps> = ({ song, onExit, showDebugOverlay = false, showDevSlider = false, showMicStatus = true }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpmMultiplier, setBpmMultiplier] = useState(4);
    const [currentTime, setCurrentTime] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_duration, setDuration] = useState(0);
    const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
    const [devPitchOverride, setDevPitchOverride] = useState<number | null>(null);
    const micRef = useRef<MicrophoneManager>(new MicrophoneManager());

    // Parse song on mount
    const parsedSong: SongWithNotes = React.useMemo(() => {
        const parsed = parseUltraStarTxt(song.txtContent);
        return { ...song, notes: parsed.notes, headers: parsed.headers, bpm: parsed.bpm, gap: parsed.gap };
    }, [song]);
    const requestRef = useRef<number>(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                if (videoRef.current) videoRef.current.pause();
            } else {
                audioRef.current.play();
                if (videoRef.current) videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const updateLoop = useCallback(() => {
        if (audioRef.current && isPlaying) {
            setCurrentTime(audioRef.current.currentTime);
            // Sync video if needed (simple check)
            if (videoRef.current && Math.abs(videoRef.current.currentTime - audioRef.current.currentTime) > 0.2) {
                videoRef.current.currentTime = audioRef.current.currentTime;
            }
        }

        if (devPitchOverride !== null) {
            // Emulate pitch
            setCurrentPitch({
                frequency: 440 * Math.pow(2, (devPitchOverride - 69) / 12),
                note: devPitchOverride,
                volume: 1.0
            });
        } else {
            // Use real mic
            const pitch = micRef.current.getPitch();
            setCurrentPitch(pitch);
        }

        requestRef.current = requestAnimationFrame(updateLoop);
    }, [isPlaying, devPitchOverride]);

    useEffect(() => {
        // Start microphone
        micRef.current.start().catch(err => console.error("Mic start failed", err));

        // Start loop
        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            cancelAnimationFrame(requestRef.current);
            micRef.current.stop();
        };
    }, [updateLoop]); // updateLoop changes when isPlaying changes

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.onloadedmetadata = () => {
                const duration = audio.duration;
                setDuration(duration);
            };
            audio.onended = () => {
                setIsPlaying(false);
                if (videoRef.current) {
                    videoRef.current.pause();
                }
            };
        }
    }, [parsedSong]);

    // Manage audio source URL
    const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        let url: string | undefined;
        if (song.audio) {
            if (song.audio instanceof Blob) {
                url = URL.createObjectURL(song.audio);
            } else if (typeof song.audio === 'string') {
                url = song.audio;
            }
        }
        setAudioSrc(url);

        return () => {
            if (url && song.audio instanceof Blob) {
                URL.revokeObjectURL(url);
            }
        };
    }, [song.audio]);

    // Manage video source URL
    const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
    useEffect(() => {
        let url: string | undefined;
        if (song.video) {
            if (song.video instanceof Blob) {
                url = URL.createObjectURL(song.video);
            } else if (typeof song.video === 'string') {
                url = song.video;
            }
        }
        setVideoSrc(url);

        return () => {
            if (url && song.video instanceof Blob) {
                URL.revokeObjectURL(url);
            }
        };
    }, [song.video]);

    return (
        <Box sx={{
            // ... (keep existing styles) ...
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'black',
            color: 'white',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* ... (keep video and overlay) ... */}
            {videoSrc && (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    muted
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 0,
                        opacity: 0.6
                    }}
                />
            )}
            {videoSrc && (
                <Box sx={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    bgcolor: 'rgba(0,0,0,0.4)',
                    zIndex: 1
                }} />
            )}

            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: 'none' }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
                    <IconButton onClick={onExit} color="inherit">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">{song.artist} - {song.title}</Typography>
                    <Box>Score: 0</Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'auto' }}>
                    <PitchVisualizer
                        song={parsedSong}
                        currentBeat={(currentTime * 1000 - (parsedSong.gap || 0)) / (60000 / ((parsedSong.bpm || 120) * bpmMultiplier))}
                        height={400}
                        currentPitch={currentPitch}
                        showDebugOverlay={showDebugOverlay}
                    />
                    <LyricsDisplay
                        song={parsedSong}
                        currentBeat={(currentTime * 1000 - (parsedSong.gap || 0)) / (60000 / ((parsedSong.bpm || 120) * bpmMultiplier))}
                    />
                </Box>

                {/* Controls (Dev only, usually hidden in gameplay) */}
                {showDevSlider && (
                    <Box sx={{ width: 400, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)', p: 2, borderRadius: 2, pointerEvents: 'auto' }}>
                        <Typography width={140}>Dev Pitch: {Math.round(devPitchOverride || 0)}</Typography>
                        <Slider
                            value={devPitchOverride || 60}
                            min={36}
                            max={84}
                            onChange={(_, v) => setDevPitchOverride(v as number)}
                        />
                        <Button onClick={() => setDevPitchOverride(null)} variant="outlined" size="small">
                            Reset
                        </Button>
                    </Box>
                )}

                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center', pointerEvents: 'auto' }}>
                    <Button
                        variant="contained"
                        color={isPlaying ? 'warning' : 'success'}
                        onClick={togglePlay}
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </Button>
                    <Button variant="outlined" color="error" onClick={onExit}>
                        Exit
                    </Button>
                    {showMicStatus && (
                        <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                            Microphone: {micRef.current?.isActive ? 'Active' : 'Tracking...'} | Pitch: {currentPitch?.note.toFixed(1) || '--'}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Audio Element */}
            {audioSrc && (
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    style={{ display: 'none' }}
                />
            )}
            {!audioSrc && (
                <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>No Audio Source Found</Typography>
            )}
        </Box>
    );
};
