import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note } from '../parser';

export type SongWithNotes = Song & { notes?: Note[], bpm?: number, gap?: number };

interface PitchVisualizerProps {
    song: SongWithNotes;
    currentBeat: number;
    height?: number;
}

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ song, currentBeat, height = 300 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Constants for rendering
    const PIXELS_PER_BEAT = 20; // Adjust zoom level here
    const NOTE_HEIGHT = 10;
    // const MIDDLE_PITCH = 0; // Relative center

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const playheadX = 100; // Fixed x position
        const notes = song.notes || [];

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

        // Calculate dynamic center pitch based on visible notes
        let visiblePitchSum = 0;
        let visibleNoteCount = 0;

        // Iterate once to find visible notes for centering
        notes.forEach((note: Note) => {
            const x = (note.start - currentBeat) * PIXELS_PER_BEAT + playheadX;
            const w = note.duration * PIXELS_PER_BEAT;
            // Check if potentially on screen
            if (x + w > 0 && x < canvas.width) {
                if (note.type !== '-') {
                    visiblePitchSum += note.pitch;
                    visibleNoteCount++;
                }
            }
        });

        // Default to a sane mid-point if no notes visible (e.g. 0 or previous average)
        // For stability, maybe use the average of the whole song? Or just the current window.
        // Current window is better for songs with key changes.
        const centerPitch = visibleNoteCount > 0 ? visiblePitchSum / visibleNoteCount : 0;

        // Draw playhead line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, canvas.height);
        ctx.stroke();

        notes.forEach((note: Note) => {
            if (note.type === '-') return;

            // Calculate position based on BEATS now
            const x = (note.start - currentBeat) * PIXELS_PER_BEAT + playheadX;
            const w = note.duration * PIXELS_PER_BEAT;

            // Pitch 0 is C4? relative.
            // Invert y: higher pitch = lower y
            // Center around centerPitch
            // y = (canvas.height / 2) - ((note.pitch - centerPitch) * NOTE_HEIGHT)

            const relPitch = note.pitch - centerPitch;
            const y = (canvas.height / 2) - (relPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2);

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

    }, [song, currentBeat, height]);

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
