import React from 'react';
import { Box, Typography } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

interface LyricsDisplayProps {
    song: SongWithNotes;
    currentTime: number;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ song, currentTime }) => {
    // Determine current line based on note timestamps
    // Simplified: Find note at current time, display surrounding notes as line?
    // UltraStar files use line breaks within the note stream usually? 
    // Or we just find the active note.

    // For this prototype, we'll just show the active note heavily emphasized
    const notes = (song.notes || []) as Note[];
    const activeNote = notes.find((n: Note) => {
        // Assume BPM calc for now... will refine in Session
        const start = n.start; // raw beats
        const end = n.start + n.duration;
        const currentBeat = currentTime * 4; // Approx conversion
        return currentBeat >= start && currentBeat <= end;
    });

    return (
        <Box sx={{ textAlign: 'center', py: 4, height: 100 }}>
            {/* Previous Line */}
            {/* Current Line */}
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white', textShadow: '0 0 10px rgba(0,0,255,0.8)' }}>
                {activeNote ? activeNote.text : '...'}
            </Typography>
        </Box>
    );
};
