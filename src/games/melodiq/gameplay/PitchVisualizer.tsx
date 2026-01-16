import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note } from '../parser';
import type { PitchResult } from '../audio/MicrophoneManager';

export type SongWithNotes = Song & { notes?: Note[], bpm?: number, gap?: number };

interface PitchVisualizerProps {
    song: SongWithNotes;
    currentBeat: number;
    height?: number;
    currentPitch?: PitchResult | null;
    showDebugOverlay?: boolean;
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

interface PitchPoint {
    beat: number;
    pitch: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getNoteName = (midiNote: number): string => {
    const note = Math.round(midiNote);
    const octave = Math.floor(note / 12) - 1;
    const name = NOTE_NAMES[note % 12];
    return `${name}${octave}`;
};

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ song, currentBeat, height = 300, currentPitch, showDebugOverlay = false }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const pitchHistoryRef = useRef<PitchPoint[]>([]);
    const lastOctaveShiftRef = useRef<number>(0);

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

        // --- 1. Background (Transparent for video) ---
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);

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
        if (notes.length > 0) {
            notes.forEach(n => {
                if (n.type !== '-') {
                    if (n.pitch < minPitch) minPitch = n.pitch;
                    if (n.pitch > maxPitch) maxPitch = n.pitch;
                    hasNotes = true;
                }
            });
        }

        // Safety for empty songs
        if (!hasNotes) {
            minPitch = 0;
            maxPitch = 0;
        }

        const centerPitch = hasNotes ? (minPitch + maxPitch) / 2 : 60; // Default to Middle C (60) if no notes

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

        // --- 6. Pitch Indicator (Microphone Input) ---
        if (currentPitch && currentPitch.note > 0) {
            let displayedPitch = currentPitch.note;

            // --- Smart Octave Folding ---
            // Use the Song's global Center Pitch as the target.
            // This prevents the target from moving up/down with the melody, which causes flickering
            // when the user holds a constant note but the melody moves across a rounding boundary.
            const targetOctaveCenter = centerPitch;

            // Shift displayedPitch to be closest to targetOctaveCenter
            const diff = targetOctaveCenter - displayedPitch;
            const idealShift = Math.round(diff / 12) * 12;

            // Hysteresis: prevent rapid switching
            const currentShift = lastOctaveShiftRef.current;
            let finalShift = currentShift;

            if (idealShift !== currentShift) {
                // Calculate distances
                const pitchWithCurrent = displayedPitch + currentShift;
                const pitchWithIdeal = displayedPitch + idealShift;

                const errorCurrent = Math.abs(targetOctaveCenter - pitchWithCurrent);
                const errorIdeal = Math.abs(targetOctaveCenter - pitchWithIdeal);

                // Switch only if substantial improvement ( > 3 semitones)
                if (errorCurrent - errorIdeal > 3) {
                    finalShift = idealShift;
                    lastOctaveShiftRef.current = finalShift;
                }
            }

            displayedPitch += finalShift;


            // Update History
            pitchHistoryRef.current.push({ beat: currentBeat, pitch: displayedPitch });

            // Prune history (keep last 100 beats approx? or based on screen width?)
            // If beats are passing, x goes negative.
            // visual width ~ 800px. PIXELS_PER_BEAT = 40. ~20 beats visible.
            // Let's keep 20 beats of history.
            if (pitchHistoryRef.current.length > 0) {
                const first = pitchHistoryRef.current[0];
                if (currentBeat - first.beat > 20) {
                    pitchHistoryRef.current.shift();
                }
            }

            const relPitch = displayedPitch - centerPitch;
            const y = (dimensions.height / 2) - (relPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2);

            // Draw indicator
            if (y > -50 && y < dimensions.height + 50) {
                // Glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00ffcc';
                ctx.fillStyle = '#ffffff';

                ctx.beginPath();
                ctx.arc(PLAYHEAD_X, y + NOTE_HEIGHT / 2, 8, 0, Math.PI * 2); // Larger cursor
                ctx.fill();

                // Trail
                ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)'; // More opaque
                ctx.lineWidth = 4; // Thicker
                ctx.beginPath();
                // Draw connected lines for history
                let started = false;

                // We just need to draw the history points relative to currentBeat
                for (let i = 0; i < pitchHistoryRef.current.length; i++) {
                    const point = pitchHistoryRef.current[i];
                    const hX = (point.beat - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;

                    // Optimization: Skip off-screen left
                    if (hX < -10) continue;

                    const hRelPitch = point.pitch - centerPitch;
                    const hY = (dimensions.height / 2) - (hRelPitch * NOTE_HEIGHT); // Center of line (reusing logic)

                    // Adjust to match the cursor center logic (y + NOTE_HEIGHT/2 is the center)
                    // y = H/2 - relPitch*NH - NH/2
                    // center = y + NH/2 = H/2 - relPitch*NH
                    // So hY = H/2 - hRelPitch*NH is correct for the center.

                    if (!started) {
                        ctx.moveTo(hX, hY);
                        started = true;
                    } else {
                        ctx.lineTo(hX, hY);
                    }
                }
                // Connect to current cursor position (which is y + NOTE_HEIGHT/2)
                ctx.lineTo(PLAYHEAD_X, y + NOTE_HEIGHT / 2);

                ctx.stroke();

                // Note Name Label
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.fillStyle = '#00ffcc';
                ctx.font = 'bold 24px monospace'; // Larger, safer font
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(getNoteName(displayedPitch), PLAYHEAD_X + 20, y + NOTE_HEIGHT / 2);
            }
        } else {
            // Even if silent, prune history to avoid memory leak if it was populated
            if (pitchHistoryRef.current.length > 500) {
                pitchHistoryRef.current = pitchHistoryRef.current.slice(-500);
            }
        }

        // --- Debug Overlay ---
        if (showDebugOverlay) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, 250, 140);
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`Song Range: ${minPitch} - ${maxPitch}`, 10, 10);
            ctx.fillText(`Center Pitch: ${centerPitch.toFixed(1)}`, 10, 25);
            if (currentPitch && currentPitch.note > 0) {
                // Debug info
                let target = centerPitch;
                const diff = target - currentPitch.note;
                const idealShift = Math.round(diff / 12) * 12;

                // Use the shift actually applied (we'd need to expose it or recalculate if we want 100% accuracy in debug, 
                // but for now let's show the ideal vs current logic if possible, or just the end result)
                // Ideally we'd capture the finalShift from above, but scoped variables...
                // Let's just assume the visual logic works and show the stored ref value.
                const storedShift = lastOctaveShiftRef.current;
                const displayed = currentPitch.note + storedShift;

                const relPitch = displayed - centerPitch;
                const y = (dimensions.height / 2) - (relPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2);

                ctx.fillText(`Input Raw: ${currentPitch.note.toFixed(1)} (${getNoteName(currentPitch.note)})`, 10, 40);
                ctx.fillText(`Target Octave Center: ${target.toFixed(1)}`, 10, 55);
                ctx.fillText(`Ideal Shift: ${idealShift}`, 10, 70);
                ctx.fillText(`Active Shift: ${storedShift} (Sticky)`, 10, 85);
                ctx.fillText(`Displayed: ${displayed.toFixed(1)} (${getNoteName(displayed)})`, 10, 100);
                ctx.fillText(`Calc Y: ${y.toFixed(1)}`, 10, 115);
            } else {
                ctx.fillText(`Input: None`, 10, 40);
            }
            ctx.fillText(`Has Notes: ${hasNotes}`, 10, 115);
        }

    }, [song, currentBeat, dimensions, currentPitch]);

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                height: height,
                bgcolor: 'transparent',
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
