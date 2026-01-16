import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note } from '../parser';
import type { PitchResult } from '../audio/MicrophoneManager';

export type SongWithNotes = Song & { notes?: Note[], bpm?: number, gap?: number };

export interface SungSegment {
    noteIndex: number; // Index of the note in song.notes
    startBeat: number; // Relative to song start
    endBeat: number;
}

interface PitchVisualizerProps {
    song: SongWithNotes;
    // Removed currentBeat prop, using audioRef instead
    audioRef: React.RefObject<HTMLAudioElement | null>;
    height?: number;
    // Using refs for high-frequency data to avoid re-renders
    currentPitchRef: React.RefObject<PitchResult | null>;
    sungSegmentsRef: React.MutableRefObject<SungSegment[]>;
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

export const PitchVisualizer: React.FC<PitchVisualizerProps> = React.memo(({
    song,
    audioRef,
    height = 300,
    currentPitchRef,
    sungSegmentsRef,
    showDebugOverlay = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const pitchHistoryRef = useRef<PitchPoint[]>([]);
    const lastOctaveShiftRef = useRef<number>(0);
    const requestRef = useRef<number>(0);

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

    // Pre-calculate center pitch
    const centerPitch = React.useMemo(() => {
        const notes = song.notes || [];
        if (notes.length === 0) return 60;
        let min = Infinity, max = -Infinity;
        notes.forEach(n => {
            if (n.type !== '-') {
                if (n.pitch < min) min = n.pitch;
                if (n.pitch > max) max = n.pitch;
            }
        });
        if (min === Infinity) return 60;
        return (min + max) / 2;
    }, [song.notes]); // Only depend on notes

    // Main Animate Loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Stats
        const dpr = window.devicePixelRatio || 1;

        // 1. Time
        let currentTime = 0;
        if (audioRef.current) {
            currentTime = audioRef.current.currentTime;
        }

        // Assuming 4x multiplier as in original code
        const bpm = song.bpm || 120;
        const gap = song.gap || 0;
        const noteDivisor = 4; // bpmMultiplier
        const beatDuration = 60000 / (bpm * noteDivisor);
        const currentBeat = (currentTime * 1000 - gap) / beatDuration;

        // Reset Transform to Identity then Scale
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);

        // --- Grid ---
        const beatsOnScreen = dimensions.width / PIXELS_PER_BEAT;
        const startBeat = currentBeat - (PLAYHEAD_X / PIXELS_PER_BEAT);
        const endBeat = startBeat + beatsOnScreen;

        // Grid lines (Vertical Beats)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let b = Math.floor(startBeat); b <= Math.ceil(endBeat + 1); b++) {
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

        // --- Notes (Culling Enforced) ---
        const notes = song.notes || [];
        const sungSegments = sungSegmentsRef.current || [];

        notes.forEach((note, index) => {
            if (note.type === '-') return;
            // Visible check
            // Note end > startBeat AND Note start < endBeat
            const noteEnd = note.start + note.duration;
            if (noteEnd < startBeat || note.start > endBeat) {
                return;
            }

            const x = (note.start - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;
            const w = note.duration * PIXELS_PER_BEAT;
            const relPitch = note.pitch - centerPitch;
            const y = (dimensions.height / 2) - (relPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2);

            // Palette
            let hue = 190; // Cyan
            let sat = '100%';
            let lit = '50%';
            if (note.type === '*') { hue = 40; lit = '60%'; } // Gold
            if (note.type === 'F') { hue = 320; lit = '60%'; } // Freestyle

            const colorMain = `hsl(${hue}, ${sat}, ${lit})`;
            const colorGlow = `hsla(${hue}, ${sat}, 70%, 0.8)`;

            // Glow & Outline
            ctx.shadowBlur = 12;
            ctx.shadowColor = colorGlow;
            ctx.strokeStyle = colorMain;
            ctx.lineWidth = 2;

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y + 2, w, NOTE_HEIGHT - 4, 6);
            else ctx.rect(x, y + 2, w, NOTE_HEIGHT - 4);
            ctx.stroke();

            // Inner Highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x + 2, y + 4, w - 4, (NOTE_HEIGHT - 8) / 2, 4);
            else ctx.rect(x + 2, y + 4, w - 4, (NOTE_HEIGHT - 8) / 2);
            ctx.fill();

            // --- Sung Segments (Fill) ---
            const segments = sungSegments.filter(s => s.noteIndex === index);
            segments.forEach(seg => {
                const startB = Math.max(seg.startBeat, note.start);
                const endB = Math.min(seg.endBeat, note.start + note.duration);
                if (endB > startB) {
                    const fillX = (startB - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;
                    const fillW = (endB - startB) * PIXELS_PER_BEAT;

                    ctx.fillStyle = colorMain;
                    ctx.shadowBlur = 0; // No glow for fill to save perf?
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(fillX, y + 2, fillW, NOTE_HEIGHT - 4, 4);
                    else ctx.rect(fillX, y + 2, fillW, NOTE_HEIGHT - 4);
                    ctx.fill();
                }
            });

            // Particles Trigger
            if (PLAYHEAD_X >= x && PLAYHEAD_X <= x + w) {
                if (Math.random() < 0.4) {
                    particlesRef.current.push({
                        x: PLAYHEAD_X,
                        y: y + NOTE_HEIGHT / 2 + (Math.random() - 0.5) * NOTE_HEIGHT,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 1.0,
                        color: `hsl(${hue}, 100%, 80%)`,
                        size: Math.random() * 2 + 1
                    });
                }
            }
        });

        // --- Particles ---
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

        // --- Playhead ---
        const beamGrad = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        beamGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        beamGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(PLAYHEAD_X - 1, 0, 2, dimensions.height);

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.fillRect(PLAYHEAD_X - 0.5, 0, 1, dimensions.height);
        ctx.shadowBlur = 0;

        // --- Pitch Indicator ---
        const currentPitch = currentPitchRef.current;
        if (currentPitch && currentPitch.note > 0) {
            let displayedPitch = currentPitch.note;
            // --- Smart Octave Folding ---
            // Dynamic Target: Prefer the pitch of the active (or nearest future) note.
            // This ensures that if the song goes high, our "center" goes high, preventing wrapping.
            let targetOctaveCenter = centerPitch;

            // Find active note or nearest future note
            const notes = song.notes || [];
            // Optimization: We could binary search, but basic find is okay for small N.
            // Search for note covering current beat, or first note after current beat.
            const activeNote = notes.find(n => n.type !== '-' && n.start <= currentBeat && (n.start + n.duration) >= currentBeat);

            if (activeNote) {
                targetOctaveCenter = activeNote.pitch;
            } else {
                // If no active note, look ahead slightly (e.g., 4 beats) to anticipate
                const futureNote = notes.find(n => n.type !== '-' && n.start > currentBeat && n.start < currentBeat + 4);
                if (futureNote) {
                    targetOctaveCenter = futureNote.pitch;
                }
            }

            const diff = targetOctaveCenter - displayedPitch;
            const idealShift = Math.round(diff / 12) * 12;

            const currentShift = lastOctaveShiftRef.current;
            let finalShift = currentShift;

            // Hysteresis calculation
            // If the ideal shift is DIFFERENT from current shift, check if we SHOULD switch.
            // Switch if the alignment error with Current Shift is significantly worse than with Ideal Shift.

            const pitchWithCurrent = displayedPitch + currentShift;
            const pitchWithIdeal = displayedPitch + idealShift;

            const errorCurrent = Math.abs(targetOctaveCenter - pitchWithCurrent);
            const errorIdeal = Math.abs(targetOctaveCenter - pitchWithIdeal);

            // If ideal error is significantly better (smaller) than current error (by > 3 semitones), switch.
            // This prevents flickering when error differences are marginal.
            if (errorCurrent - errorIdeal > 3) {
                finalShift = idealShift;
                lastOctaveShiftRef.current = finalShift;
            }
            displayedPitch += finalShift;

            // History
            pitchHistoryRef.current.push({ beat: currentBeat, pitch: displayedPitch });
            if (pitchHistoryRef.current.length > 0) {
                const first = pitchHistoryRef.current[0];
                if (currentBeat - first.beat > 20) pitchHistoryRef.current.shift();
            }

            const relPitch = displayedPitch - centerPitch;
            const y = (dimensions.height / 2) - (relPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2);

            // Draw Cursor
            // Glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ffcc';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(PLAYHEAD_X, y + NOTE_HEIGHT / 2, 8, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < pitchHistoryRef.current.length; i++) {
                const point = pitchHistoryRef.current[i];
                const hX = (point.beat - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;
                if (hX < -10) continue;
                const hRelPitch = point.pitch - centerPitch;
                const hY = (dimensions.height / 2) - (hRelPitch * NOTE_HEIGHT) - (NOTE_HEIGHT / 2) + (NOTE_HEIGHT / 2); // Center!

                if (!started) { ctx.moveTo(hX, hY); started = true; }
                else ctx.lineTo(hX, hY);
            }
            ctx.lineTo(PLAYHEAD_X, y + NOTE_HEIGHT / 2);
            ctx.stroke();

            // Label
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(getNoteName(displayedPitch), PLAYHEAD_X + 20, y + NOTE_HEIGHT / 2);
        } else {
            if (pitchHistoryRef.current.length > 500) pitchHistoryRef.current = pitchHistoryRef.current.slice(-500);
        }

        // --- Debug ---
        if (showDebugOverlay) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, 250, 60);
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`Beat: ${currentBeat.toFixed(2)}`, 10, 10);
            ctx.fillText(`FPS: Optimized`, 10, 25);
            ctx.fillText(`C Pitch: ${centerPitch}`, 10, 40);
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [song, dimensions, audioRef, showDebugOverlay, centerPitch]); // Deps for loop recreation

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== dimensions.width * dpr || canvas.height !== dimensions.height * dpr) {
            canvas.width = dimensions.width * dpr;
            canvas.height = dimensions.height * dpr;
        }

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate, dimensions]);

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
});
