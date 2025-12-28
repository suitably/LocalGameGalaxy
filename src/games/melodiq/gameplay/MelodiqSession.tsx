import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import type { Song } from '../db';
import { parseUltraStarTxt } from '../parser';
import { PitchVisualizer, type SongWithNotes } from './PitchVisualizer';
import { LyricsDisplay } from './LyricsDisplay';

interface MelodiqSessionProps {
    song: Song;
    onExit: () => void;
}

export const MelodiqSession: React.FC<MelodiqSessionProps> = ({ song, onExit }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpmMultiplier, setBpmMultiplier] = useState(4);
    const [currentTime, setCurrentTime] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_duration, setDuration] = useState(0);

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
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const updateLoop = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateLoop);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateLoop);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, updateLoop]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.onloadedmetadata = () => {
                const duration = audio.duration;
                setDuration(duration);
            };
            audio.onended = () => {
                setIsPlaying(false);
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

    return (
        <Box sx={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'black',
            color: 'white',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header / HUD */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)' }}>
                <IconButton onClick={onExit} color="inherit">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6">{song.artist} - {song.title}</Typography>
                <Box>Score: 0</Box>
            </Box>

            {/* Visualizer Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <PitchVisualizer
                    song={parsedSong}
                    currentBeat={(currentTime * 1000 - (parsedSong.gap || 0)) / (60000 / ((parsedSong.bpm || 120) * bpmMultiplier))}
                    height={400}
                />
                <LyricsDisplay
                    song={parsedSong}
                    currentBeat={(currentTime * 1000 - (parsedSong.gap || 0)) / (60000 / ((parsedSong.bpm || 120) * bpmMultiplier))}
                />
            </Box>

            {/* Controls (Dev only, usually hidden in gameplay) */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                    variant="contained"
                    color={isPlaying ? "warning" : "success"}
                    onClick={togglePlay}
                    startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                >
                    {isPlaying ? "Pause" : "Play"}
                </Button>

            </Box>


            {/* Audio Element (Hidden or visible for debug) */}
            {
                audioSrc && (
                    <audio
                        ref={audioRef}
                        src={audioSrc}
                        style={{ display: 'none' }} // Hide native player
                    />
                )
            }
            {
                !audioSrc && (
                    <Typography color="error" sx={{ textAlign: 'center' }}>No Audio Source Found</Typography>
                )
            }
        </Box >
    );
};
