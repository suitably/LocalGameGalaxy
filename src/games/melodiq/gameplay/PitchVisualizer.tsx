import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note } from '../parser';

export type SongWithNotes = Song & { notes?: Note[] };

interface PitchVisualizerProps {
    song: SongWithNotes;
    currentTime: number;
    height?: number;
}

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ song, currentTime, height = 300 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Constants for rendering
    const PIXELS_PER_SECOND = 100;
    const NOTE_HEIGHT = 10;
    // const MIDDLE_PITCH = 0; // Relative center

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background grid (semitones)
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.height / NOTE_HEIGHT; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * NOTE_HEIGHT);
            ctx.lineTo(canvas.width, i * NOTE_HEIGHT);
            ctx.stroke();
        }

        // Draw playhead line
        const playheadX = 100; // Fixed x position
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, canvas.height);
        ctx.stroke();

        // Check if notes exist (parsed) behavior
        const notes = song.notes || [];

        notes.forEach((note: Note) => {
            // Calculate position
            // Assuming beat-to-pixel map for now sans BPM for simplicity
            // In real UltraStar: seconds = (beat * 60) / (BPM * 4) + gap
            const noteTime = note.start * 0.2; // Temp scaling

            const x = (noteTime - currentTime) * PIXELS_PER_SECOND + playheadX;
            const w = note.duration * 0.2 * PIXELS_PER_SECOND; // Duration scaling to match

            // Pitch 0 is C4? relative.
            // Invert y: higher pitch = lower y
            const y = canvas.height / 2 - (note.pitch * NOTE_HEIGHT);

            if (x + w > 0 && x < canvas.width) {
                switch (note.type) {
                    case ':': ctx.fillStyle = '#00f'; break; // Normal
                    case '*': ctx.fillStyle = '#fd0'; break; // Golden
                    case 'F': ctx.fillStyle = '#f00'; break; // Freestyle
                    default: ctx.fillStyle = '#888';
                }

                // Draw rounded rect
                ctx.fillRect(x, y, w, NOTE_HEIGHT - 2);

                // Draw text
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.fillText(note.text, x, y - 2);
            }
        });

    }, [song, currentTime, height]);

    return (
        <Box sx={{ width: '100%', overflow: 'hidden', bgcolor: 'black' }}>
            <canvas
                ref={canvasRef}
                width={800}
                height={height}
                style={{ width: '100%', height: `${height}px` }}
            />
        </Box>
    );
};
