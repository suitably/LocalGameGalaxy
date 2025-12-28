import React from 'react';
import { Box, Typography } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

interface LyricsDisplayProps {
    song: SongWithNotes;
    currentBeat: number;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ song, currentBeat }) => {
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

    // Find active line
    // A line is active if currentBeat is >= its first note start and < next line's first note start
    // Or simply, find the line that contains the active note, or acts as "upcoming"

    // Improved logic: Find the line where the *last* note ends *after* currentBeat?
    // Or just find the line closest to currentBeat.

    const activeLineIndex = lines.findIndex((line, index) => {
        if (line.length === 0) return false;
        const firstStart = line[0].start;
        // Check next line start
        const nextLine = lines[index + 1];
        const nextStart = nextLine ? nextLine[0].start : Infinity;

        return currentBeat >= (firstStart - 50) && currentBeat < nextStart; // -50 buffer to show line a bit early
    });

    const activeLine = lines[activeLineIndex !== -1 ? activeLineIndex : 0];

    // If no active line found (e.g. intro), show first line or empty?
    // If activeLineIndex is -1 and currentBeat is huge, shows last line or nothing.
    // For now, default to first or empty.

    return (
        <Box sx={{ textAlign: 'center', py: 4, height: 100, display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {activeLine && activeLine.map((note, idx) => {
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
                            transition: 'color 0.1s'
                        }}
                    >
                        {note.text}
                    </Typography>
                );
            })}
            {!activeLine && <Typography variant="h6" color="gray">...</Typography>}
        </Box>
    );
};
