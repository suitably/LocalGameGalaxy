import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note, SongTrack } from '../parser';
import type { PitchResult } from '../audio/MicrophoneManager';

export type SongWithNotes = Song & { notes?: Note[], tracks?: SongTrack[], bpm?: number, gap?: number, headers?: any };

export interface SungSegment {
    noteIndex: number; // Index of the note in song.notes
    startBeat: number; // Relative to song start
    endBeat: number;
    trackIndex?: number; // Which track this segment belongs to
}

interface PitchVisualizerProps {
    song: SongWithNotes;
    // Removed currentBeat prop, using audioRef instead
    audioRef: React.RefObject<HTMLAudioElement | null>;
    height?: number;
    // Using refs for high-frequency data to avoid re-renders
    currentPitchRef: React.RefObject<PitchResult | null>;
    sungSegmentsRef: React.MutableRefObject<Record<number, SungSegment[]>>;
    showDebugOverlay?: boolean;
    label?: string;
    hue?: number;
    showNoteLabels?: boolean;
    latency?: number;
    trackIndex?: number;
    scale?: number;
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



const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getNoteName = (midiNote: number): string => {
    const note = Math.round(midiNote);
    const octave = Math.floor(note / 12) - 1;
    const name = NOTE_NAMES[note % 12];
    return `${name}${octave}`;
};


import { ErrorBoundary } from '../../../components/ErrorBoundary';

// ... (keep existing types)

const PitchVisualizerContent = React.memo<PitchVisualizerProps>(({
    song,
    audioRef,
    height,
    currentPitchRef,
    sungSegmentsRef,
    showDebugOverlay = false,
    label,
    hue = 190,
    showNoteLabels = true,
    latency,
    trackIndex = 0,
    scale = 1.0
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);

    const lastOctaveShiftRef = useRef<number>(0);
    const lastValidPitchRef = useRef<number>(-1);
    const lastValidTimeRef = useRef<number>(0);
    const requestRef = useRef<number>(0);

    // FIX: Track the LATEST ref from props, because parent might pass a new object literal every render
    const latestPitchRef = useRef(currentPitchRef);
    const latestSungSegmentsRef = useRef(sungSegmentsRef);

    useEffect(() => {
        latestPitchRef.current = currentPitchRef;
        latestSungSegmentsRef.current = sungSegmentsRef;
    }, [currentPitchRef, sungSegmentsRef]);

    // We track dimensions to support High DPI and auto-resizing
    // Initialize with height prop or 300 as fallback until container measures
    const [dimensions, setDimensions] = useState({ width: 800, height: height ?? 300 });

    // Constants for rendering
    const PIXELS_PER_BEAT = 40 * scale; // Wider spacing for cleaner look
    const PLAYHEAD_X = 150 * scale; // More anticipation time

    // Handle Resize & DPI
    useLayoutEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current;
                // Use container height when no explicit height prop is passed
                // This allows the visualizer to fill its parent container
                setDimensions({ width: offsetWidth, height: height ?? offsetHeight ?? 300 });
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [height]);

    // Pre-calculate pitch range and center
    const { centerPitch, noteHeight } = React.useMemo(() => {
        const trackNotes = (song.tracks && song.tracks[trackIndex]) ? song.tracks[trackIndex].notes : song.notes;
        const notes = trackNotes || [];

        if (notes.length === 0) return { centerPitch: 60, noteHeight: 18 };

        let min = Infinity, max = -Infinity;
        notes.forEach(n => {
            if (n.type !== '-') {
                if (n.pitch < min) min = n.pitch;
                if (n.pitch > max) max = n.pitch;
            }
        });

        if (min === Infinity) return { centerPitch: 60, noteHeight: 18 };

        const center = (min + max) / 2;
        const range = max - min + 4; // Add padding (2 semitones each side)

        // Calculate optional note height to fit range
        // Clamp between 10 (very dense) and 30 (very spacious)
        // Default was 18
        const availableHeight = dimensions.height;
        let calculatedHeight = availableHeight / range;

        // Clamp
        calculatedHeight = Math.min(30 * scale, calculatedHeight);

        return { centerPitch: center, noteHeight: calculatedHeight };
    }, [song.tracks, song.notes, trackIndex, dimensions.height, scale]);

    // Main Animate Loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        try {
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
            const currentBeat = ((currentTime * 1000) - (latency || 0) - gap) / beatDuration;

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
            const visibleNotes = Math.ceil(dimensions.height / noteHeight);
            // Center the grid vertically based on centerPitch
            // But drawing purely horizontal lines relative to calculated y

            for (let i = 0; i < visibleNotes; i++) {
                if (i % 2 === 0) {
                    const y = i * noteHeight;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(dimensions.width, y);
                    ctx.stroke();
                }
            }

            // --- Notes (Culling Enforced) ---
            // Use track notes if available
            const trackNotesSource = (song.tracks && song.tracks[trackIndex]) ? song.tracks[trackIndex].notes : song.notes;
            const notes = trackNotesSource || [];
            // Use latestSungSegmentsRef to get the active segments record
            const sungSegmentsRecord = latestSungSegmentsRef.current.current || {};

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
                const y = (dimensions.height / 2) - (relPitch * noteHeight) - (noteHeight / 2);

                // Palette
                let noteHue = hue; // Use prop hue by default
                let sat = '100%';
                let lit = '50%';
                if (note.type === '*') { noteHue = 40; lit = '60%'; } // Gold
                if (note.type === 'F') { noteHue = 320; lit = '60%'; } // Freestyle

                const colorMain = `hsl(${noteHue}, ${sat}, ${lit})`;
                const colorGlow = `hsla(${noteHue}, ${sat}, 70%, 0.8)`;

                // Outline (no shadowBlur for perf - only apply to active notes)
                const isActiveNote = PLAYHEAD_X >= x && PLAYHEAD_X <= x + w;
                if (isActiveNote) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = colorGlow;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.strokeStyle = colorMain;
                ctx.lineWidth = 2;

                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y + 2, w, noteHeight - 4, 6);
                else ctx.rect(x, y + 2, w, noteHeight - 4);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Inner Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x + 2, y + 4, w - 4, (noteHeight - 8) / 2, 4);
                else ctx.rect(x + 2, y + 4, w - 4, (noteHeight - 8) / 2);
                ctx.fill();

                // --- Sung Segments (Fill) ---
                // OPTIMIZATION: O(1) lookup from Record instead of O(N) filter
                const segments = sungSegmentsRecord[index] || [];

                segments.forEach(seg => {
                    // Global Scoring: Only visualize segments that belong to this track
                    // If seg.trackIndex is undefined (legacy), assume it belongs to track 0 or whatever.
                    // But new logic always sets it.
                    if (seg.trackIndex !== undefined && seg.trackIndex !== trackIndex) {
                        return;
                    }

                    const startB = Math.max(seg.startBeat, note.start);
                    const endB = Math.min(seg.endBeat, note.start + note.duration);
                    if (endB > startB) {
                        const fillX = (startB - currentBeat) * PIXELS_PER_BEAT + PLAYHEAD_X;
                        const fillW = (endB - startB) * PIXELS_PER_BEAT;

                        ctx.fillStyle = colorMain;
                        ctx.shadowBlur = 0; // No glow for fill to save perf?
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(fillX, y + 2, fillW, noteHeight - 4, 4);
                        else ctx.rect(fillX, y + 2, fillW, noteHeight - 4);
                        ctx.fill();
                    }
                });

                // Particles Trigger - only check if we're at the active note and limit particle count
                if (isActiveNote && particlesRef.current.length < 50) {
                    // Check if currently singing strictly correctly (covered by a segment)
                    const isSingingCorrectly = segments.some(s => currentBeat >= s.startBeat && currentBeat <= s.endBeat + 0.1);

                    if (isSingingCorrectly && Math.random() < 0.3) {
                        particlesRef.current.push({
                            x: PLAYHEAD_X,
                            y: y + noteHeight / 2 + (Math.random() - 0.5) * noteHeight,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            life: 0.8,
                            color: `hsl(${noteHue}, 100%, 80%)`,
                            size: Math.random() * 2 + 1
                        });
                    }
                }
            });

            // --- Particles (optimized: filter instead of splice) ---
            ctx.globalCompositeOperation = 'lighter';
            const particles = particlesRef.current;
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.06;
                if (p.life > 0) {
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Batch cleanup (O(n) filter instead of O(n²) splice)
            particlesRef.current = particles.filter(p => p.life > 0);
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';



            // --- persistent cursor logic ---
            // Access via `.current.current` because latestPitchRef holds the ref object from props
            const currentPitch = latestPitchRef.current.current;
            const now = performance.now();
            let activePitchNote = -1;

            if (currentPitch && currentPitch.note > 0) {
                activePitchNote = currentPitch.note;
                lastValidPitchRef.current = activePitchNote;
                lastValidTimeRef.current = now;
            }

            // Determine what to show
            let displayedPitch: number | null = null;
            if (activePitchNote > 0) {
                displayedPitch = activePitchNote;
            } else if (now - lastValidTimeRef.current < 2000 && lastValidPitchRef.current > 0) {
                // Show sticky pitch
                displayedPitch = lastValidPitchRef.current;
            }

            if (displayedPitch !== null) {
                // --- Smart Octave Folding ---
                // Dynamic Target: Prefer the pitch of the active (or nearest future) note.
                // This ensures that if the song goes high, our "center" goes high, preventing wrapping.
                let targetOctaveCenter = centerPitch;

                // Find active note or nearest future note
                // Optimization: We could binary search, but basic find is okay for small N.
                // Search for note covering current beat, or first note after current beat.
                const notes = trackNotesSource || [];
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

                // Hysteresis calculation (Only update shift if actively singing to avoid jumping around when silent?)
                // Actually allow shift update even if sticky, so it stays near the notes if the song moves.

                const pitchWithCurrent = displayedPitch + currentShift;
                const pitchWithIdeal = displayedPitch + idealShift;

                const errorCurrent = Math.abs(targetOctaveCenter - pitchWithCurrent);
                const errorIdeal = Math.abs(targetOctaveCenter - pitchWithIdeal);

                if (errorCurrent - errorIdeal > 3) {
                    finalShift = idealShift;
                    lastOctaveShiftRef.current = finalShift;
                }
                displayedPitch += finalShift;

                const relPitch = displayedPitch - centerPitch;
                const y = (dimensions.height / 2) - (relPitch * noteHeight) - (noteHeight / 2);

                // Draw Cursor
                // Glow (reduced for perf)
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
                ctx.beginPath();
                ctx.arc(PLAYHEAD_X, y + noteHeight / 2, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Label
                if (showNoteLabels) {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.fillStyle = '#00ffcc';
                    ctx.font = `bold ${24 * scale}px monospace`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(getNoteName(displayedPitch), PLAYHEAD_X + (20 * scale), y + noteHeight / 2);
                }
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

            // Draw label if provided
            if (label) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = '20px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(label, 20, 40);
            }
        } catch (e) {
            console.error("Error in PitchVisualizer animate loop:", e);
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [song, audioRef, showDebugOverlay, label, dimensions, centerPitch, showNoteLabels, trackIndex, hue, latency]); // Deps for loop recreation

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
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'transparent',
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

export const PitchVisualizer = (props: PitchVisualizerProps) => (
    <ErrorBoundary fallback={<Box sx={{ color: 'red', p: 1 }}>Visualizer Error</Box>}>
        <PitchVisualizerContent {...props} />
    </ErrorBoundary>
);
