import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

interface LyricsDisplayProps {
    song: SongWithNotes;
    audioRef: React.RefObject<HTMLAudioElement | null>;
}

interface LyricsLaneProps {
    notes: Note[];
    currentBeat: number;
    align?: 'left' | 'center' | 'right';
    color?: string;
    secondary?: boolean;
}

const LyricsLane: React.FC<LyricsLaneProps> = React.memo(({ notes, currentBeat, align = 'center', color, secondary }) => {
    // Group notes into lines
    const lines = useMemo(() => {
        const rawNotes = (notes || []) as Note[];
        const groups: Note[][] = [];
        let currentGroup: Note[] = [];

        for (const note of rawNotes) {
            if (note.type === '-') {
                if (currentGroup.length > 0) groups.push(currentGroup);
                currentGroup = [];
            } else {
                currentGroup.push(note);
            }
        }
        if (currentGroup.length > 0) groups.push(currentGroup);
        return groups;
    }, [notes]);

    // Find active line
    // Optimization: This runs every frame. Keeping it simple as N is small.
    const activeLineIndex = lines.findIndex((line, index) => {
        if (line.length === 0) return false;
        const firstStart = line[0].start;
        const nextLine = lines[index + 1];
        const nextStart = nextLine ? nextLine[0].start : Infinity;
        // Show line slightly before it starts (50 beats? maybe too much, let's keep logic)
        return currentBeat >= (firstStart - 20) && currentBeat < nextStart;
    });

    const activeLine = lines[activeLineIndex !== -1 ? activeLineIndex : 0];
    const nextLine = lines[activeLineIndex !== -1 ? activeLineIndex + 1 : 1];

    const primaryColor = color || (secondary ? '#ff80ab' : '#00ffff'); // Pink for P2, Cyan for P1/Solo override

    return (
        <Box sx={{
            textAlign: align,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            width: '100%',
            alignItems: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
            opacity: (!activeLine && !nextLine) ? 0.5 : 1
        }}>
            {/* Active Line */}
            <Box sx={{ display: 'flex', justifyContent: align, gap: '4px', flexWrap: 'wrap', minHeight: '40px', px: 2 }}>
                {activeLine ? activeLine.map((note, idx) => {
                    const isPast = currentBeat >= (note.start + note.duration);
                    const isActive = currentBeat >= note.start && currentBeat < (note.start + note.duration);

                    const noteColor = isActive ? primaryColor : (isPast ? '#ffffff' : 'rgba(255,255,255,0.6)');

                    return (
                        <Typography
                            key={idx}
                            variant="h5"
                            sx={{
                                fontWeight: isActive ? 'bold' : 'normal',
                                color: noteColor,
                                textShadow: isActive ? `0 0 10px ${primaryColor}` : 'none',
                                transition: 'color 0.05s',
                                whiteSpace: 'pre'
                            }}
                        >
                            {note.text}
                        </Typography>
                    );
                }) : (
                    <Typography variant="h6" color="gray">...</Typography>
                )}
            </Box>

            {/* Next Line Preview */}
            {nextLine && (
                <Box sx={{ display: 'flex', justifyContent: align, gap: '4px', flexWrap: 'wrap', px: 2, opacity: 0.6 }}>
                    {nextLine.map((note, idx) => (
                        <Typography
                            key={idx}
                            variant="body1"
                            sx={{
                                color: 'rgba(255,255,255,0.4)',
                                fontWeight: 'light',
                                whiteSpace: 'pre'
                            }}
                        >
                            {note.text}
                        </Typography>
                    ))}
                </Box>
            )}
        </Box>
    );
});

export const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(({ song, audioRef }) => {
    const [currentBeat, setCurrentBeat] = useState(0);

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            if (audioRef.current) {
                const currentTime = audioRef.current.currentTime;
                const bpm = song.bpm || 120;
                const gap = song.gap || 0;
                const bpmMultiplier = 4;
                const beatDuration = 60000 / (bpm * bpmMultiplier);
                const beat = (currentTime * 1000 - gap) / beatDuration;
                setCurrentBeat(beat);
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [song, audioRef]);

    const isDuet = song.tracks && song.tracks.length > 1;

    return (
        <Box sx={{ py: 2, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {isDuet ? (
                // Duet View: Split 50/50
                <>
                    <Box sx={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                        <LyricsLane
                            notes={song.tracks![0].notes}
                            currentBeat={currentBeat}
                            align="right"
                            color="#40c4ff" // Blue
                        />
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', pr: 2, mt: 1, color: '#40c4ff', opacity: 0.5 }}>
                            {song.tracks![0].name || "Player 1"}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <LyricsLane
                            notes={song.tracks![1].notes}
                            currentBeat={currentBeat}
                            align="left"
                            color="#ff4081" // Pink
                            secondary
                        />
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'left', pl: 2, mt: 1, color: '#ff4081', opacity: 0.5 }}>
                            {song.tracks![1].name || "Player 2"}
                        </Typography>
                    </Box>
                </>
            ) : (
                // Solo View
                <LyricsLane
                    notes={(song.tracks && song.tracks.length > 0) ? song.tracks[0].notes : (song.notes || [])}
                    currentBeat={currentBeat}
                    align="center"
                />
            )}
        </Box>
    );
});
