import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

interface LyricsDisplayProps {
    song: SongWithNotes;
    audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(({ song, audioRef }) => {
    // We use a state only for the active line index to trigger a re-render when the line changes.
    // This happens infrequently (every few seconds), so it's fine.
    const [activeLineIndex, setActiveLineIndex] = useState(0);
    const [currentBeat, setCurrentBeat] = useState(0); // Only update this when we need to visually update progress?
    // Actually, if we want karaoke highlighting (color change), we need frequent updates.
    // But text color transition is CSS. We just need to know if a note is active.
    // If we update `currentBeat` in state every frame, we defeat the purpose.
    // However, this component is much smaller than the PitchVisualizer. 
    // Maybe we can just update `currentBeat` every frame here? 
    // It's isolated to this component. 
    // Better: Use a ref for currentBeat and forceUpdate manually active styled elements?
    // Or just let it re-render? Re-rendering just this component 60fps is 100x better than re-rendering the whole app.
    // Let's implement 30fps throttle for lyrics or just 60fps local state. 
    // The previous issue was the PARENT re-rendering everything.

    // Let's try internal RAF loop updating local state.

    // Group notes into lines
    const lines = React.useMemo(() => {
        const rawNotes = (song.notes || []) as Note[];
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
    }, [song.notes]);

    useEffect(() => {
        let frameId: number;

        const loop = () => {
            if (audioRef.current) {
                const currentTime = audioRef.current.currentTime;
                const bpm = song.bpm || 120;
                const gap = song.gap || 0;
                const bpmMultiplier = 4; // Hardcoded in parent
                const beatDuration = 60000 / (bpm * bpmMultiplier);
                const beat = (currentTime * 1000 - gap) / beatDuration;

                setCurrentBeat(beat);

                // Update active line index check
                // This logic is cheap enough
                // Find valid line
                // Optimize: check current active line first
                // For now, let's just do the search, it's < 50 items usually.

                const newActiveIndex = lines.findIndex((line, index) => {
                    if (line.length === 0) return false;
                    const firstStart = line[0].start;
                    const nextLine = lines[index + 1];
                    const nextStart = nextLine ? nextLine[0].start : Infinity;
                    return beat >= (firstStart - 50) && beat < nextStart;
                });

                if (newActiveIndex !== -1) {
                    setActiveLineIndex(newActiveIndex);
                }
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [song, audioRef, lines]);

    const activeLine = lines[activeLineIndex !== -1 ? activeLineIndex : 0];

    return (
        <Box sx={{ textAlign: 'center', py: 4, height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {/* Active Line */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', minHeight: '40px' }}>
                {activeLine ? activeLine.map((note, idx) => {
                    const isPast = currentBeat >= (note.start + note.duration);
                    const isActive = currentBeat >= note.start && currentBeat < (note.start + note.duration);

                    let color = 'rgba(255,255,255,0.5)'; // Pending
                    if (isActive) color = '#00ffff'; // Active
                    if (isPast) color = '#ffffff'; // Done

                    return (
                        <Typography
                            key={idx}
                            variant="h5"
                            sx={{
                                fontWeight: isActive ? 'bold' : 'normal',
                                color: color,
                                textShadow: isActive ? '0 0 10px rgba(0,255,255,0.8)' : 'none',
                                transition: 'color 0.1s',
                                // Optimization: use WillChange if needed, but text is cheap
                            }}
                        >
                            {note.text}
                        </Typography>
                    );
                }) : (
                    <Typography variant="h6" color="gray">...</Typography>
                )}
            </Box>

            {/* Next Line */}
            {lines[activeLineIndex + 1] && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {lines[activeLineIndex + 1].map((note, idx) => (
                        <Typography
                            key={idx}
                            variant="h6"
                            sx={{
                                color: 'rgba(255,255,255,0.3)',
                                fontWeight: 'light'
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
