import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note } from '../parser';

export type SongWithNotes = Song & { notes?: Note[], bpm?: number, gap?: number };

interface PitchVisualizerProps {
    song: SongWithNotes;
    currentBeat: number;
    height?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ song, currentBeat, height = 300 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);

    // We track dimensions to support High DPI and auto-resizing
    const [dimensions, setDimensions] = useState({ width: 800, height: height });

    // Constants for rendering
    const PIXELS_PER_BEAT = 40; // Wider spacing for cleaner look
    const NOTE_HEIGHT = 18;
    const PLAYHEAD_X = 150; // More anticipation time

    // Handle Resize & DPI
    useLayoutEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current;
                // Use props height if provided, else container height
                setDimensions({ width: offsetWidth, height: height || offsetHeight || 300 });
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        // Set actual pixel intersection size
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Scale coordinate system to match CSS pixels
        ctx.scale(dpr, dpr);

        // --- Helper: Modern Round Rect ---
        const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
            } else {
                // Fallback
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
            }
            ctx.closePath();
        };

        const notes = song.notes || [];

        // --- 1. Background (Synthwave/Neon Atmosphere) ---
        const bgGradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        bgGradient.addColorStop(0, '#050510'); // Very dark blue top
        bgGradient.addColorStop(1, '#1a0b2e'); // Deep purple bottom
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Grid lines (Vertical Beats)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const startBeat = currentBeat - (PLAYHEAD_X / PIXELS_PER_BEAT);
        const endBeat = startBeat + (dimensions.width / PIXELS_PER_BEAT);

        for (let b = Math.floor(startBeat); b <= Math.ceil(endBeat); b++) {
            const x = (b - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, dimensions.height);
            ctx.stroke();
        }

        // Horizontal Guide Lines (Pitch)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < dimensions.height / NOTE_HEIGHT; i++) {
            if (i % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(0, i * NOTE_HEIGHT);
                ctx.lineTo(dimensions.width, i * NOTE_HEIGHT);
                ctx.stroke();
            }
        }

        // --- 2. Stabilization ---
        let minPitch = Infinity;
        let maxPitch = -Infinity;
        let hasNotes = false;
        notes.forEach(n => {
            if (n.type !== '-') {
                if (n.pitch < minPitch) minPitch = n.pitch;
                if (n.pitch > maxPitch) maxPitch = n.pitch;
                hasNotes = true;
            }
        });
        const centerPitch = hasNotes ? (minPitch + maxPitch) / 2 : 0;

        // --- 3. Neon Notes ---
        notes.forEach((note: Note) => {
            if (note.type === '-') return;

            const x = (note.start - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;
            const w = note.duration * PIXELS_PER_BEAT;
            const relPitch = note.pitch - centerPitch;
            const y = (dimensions.height / 2) - (relPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2);

            if (x + w < -50 || x > dimensions.width + 50) return;

            // Neon Palette
            let hue = 190; // Cyan
            let sat = '100%';
            let lit = '50%';

            if (note.type === '*') { hue = 40; lit = '60%'; } // Gold
            if (note.type === 'F') { hue = 320; lit = '60%'; } // Hot Pink (Freestyle)

            const colorMain = `hsl(${hue}, ${sat}, ${lit})`;
            const colorGlow = `hsla(${hue}, ${sat}, 70%, 0.8)`;

            // Glow
            ctx.shadowBlur = 12;
            ctx.shadowColor = colorGlow;

            // Note Body
            ctx.fillStyle = colorMain;
            drawRoundRect(x, y + 2, w, NOTE_HEIGHT - 4, 6);
            ctx.fill();

            // Inner Highlight (Glassy look)
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            drawRoundRect(x + 2, y + 4, w - 4, (NOTE_HEIGHT - 8) / 2, 4);
            ctx.fill();

            // Text Label - Clean sans-serif, inside note but legible
            if (note.text && w > 15) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 2;
                ctx.shadowColor = 'rgba(0,0,0,0.5)'; // Text shadow for contrast
                ctx.font = '600 11px "Inter", "Roboto", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(note.text, x + w / 2, y + NOTE_HEIGHT / 2);
                ctx.shadowBlur = 0;
            }

            // Spawn Particles (Sparks)
            if (PLAYHEAD_X >= x && PLAYHEAD_X <= x + w) {
                // Higher spawn rate for "active" feeling
                if (Math.random() < 0.4) {
                    particlesRef.current.push({
                        x: PLAYHEAD_X,
                        y: y + NOTE_HEIGHT / 2 + (Math.random() - 0.5) * NOTE_HEIGHT,
                        vx: (Math.random() - 0.5) * 6, // Fast burst
                        vy: (Math.random() - 0.5) * 6,
                        life: 1.0,
                        color: `hsl(${hue}, 100%, 80%)`,
                        size: Math.random() * 2 + 1 // Smaller but more numerous sparks
                    });
                }
            }
        });

        // --- 4. Particles (Additive Blending) ---
        ctx.globalCompositeOperation = 'lighter';
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;

            if (p.life <= 0) {
                particlesRef.current.splice(i, 1);
            } else {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        // --- 5. Laser Playhead ---
        // A vertical beam
        const beamGrad = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        beamGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        beamGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = beamGrad;
        // Thin beam
        ctx.fillRect(PLAYHEAD_X - 1, 0, 2, dimensions.height);

        // Intense core
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.fillRect(PLAYHEAD_X - 0.5, 0, 1, dimensions.height);

        ctx.shadowBlur = 0;

    }, [song, currentBeat, dimensions]);

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                height: height,
                bgcolor: '#050510',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block'
                }}
            />
        </Box>
    );
};
