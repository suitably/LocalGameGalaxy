import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import type { Song } from '../db';
import type { Note, SongTrack } from '../parser';
import type { PitchResult } from '../audio/MicrophoneManager';

export type SongWithNotes = Song & { notes?: Note[], tracks?: SongTrack[], bpm?: number, gap?: number, headers?: any };

/**
 * Represents a historical segment of successfully sung notes by a user.
 * Used to draw the filled progress inside target note rectangles.
 */
export interface SungSegment {
    /** Index of the note in the track's notes list. */
    noteIndex: number;
    /** The start beat of the successful pitch match. */
    startBeat: number;
    /** The end beat of the successful pitch match. */
    endBeat: number;
    /** The index of the track this segment was sung on. */
    trackIndex?: number;
}

/**
 * Props for the PitchVisualizer component.
 */
interface PitchVisualizerProps {
    /** The song metadata containing the note tracks. */
    song: SongWithNotes;
    /** Ref to the audio element acting as the master timing clock. */
    audioRef: React.RefObject<HTMLAudioElement | null>;
    /** Optional custom canvas height (falls back to container auto-resize). */
    height?: number;
    /** React Ref containing the player's latest real-time pitch result. */
    currentPitchRef: React.RefObject<PitchResult | null>;
    /** React Ref recording all matching segments sung by the player. */
    sungSegmentsRef: React.MutableRefObject<Record<number, SungSegment[]>>;
    /** Show debugging info (current beat, culling stats, center pitch). */
    showDebugOverlay?: boolean;
    /** Label to overlay on the top left (e.g., player name). */
    label?: string;
    /** Hue rotation (0-360) for player-specific color styling. */
    hue?: number;
    /** Toggle displaying note name labels (e.g., C4, D#5). */
    showNoteLabels?: boolean;
    /** Calibrated microphone input latency offset in milliseconds. */
    latency?: number;
    /** Which duet/instrument track index to visualize. */
    trackIndex?: number;
    /** Horizontal zoom multiplier scale. */
    scale?: number;
}

/**
 * Emitter particle for correct pitch visualization sparks.
 */
interface Particle {
    /** Horizontal canvas coordinate in pixels. */
    x: number;
    /** Vertical canvas coordinate in pixels. */
    y: number;
    /** Horizontal velocity in pixels per frame. */
    vx: number;
    /** Vertical velocity in pixels per frame. */
    vy: number;
    /** Particle opacity/life multiplier (decayed over time). */
    life: number;
    /** HSL color string. */
    color: string;
    /** Visual radius in pixels. */
    size: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Translates a MIDI note number into a standard notation label (e.g. C4).
 */
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
    const animateRef = useRef<(() => void) | undefined>(undefined);

    // Interpolation state for smooth rendering
    const lastAudioTimeRef = useRef<number>(0);
    const lastRealTimeRef = useRef<number>(0);

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
            if (n.type !== '-' && n.type !== 'R' && n.type !== 'G') {
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

    /**
     * High-Frequency canvas rendering loop (requestAnimationFrame).
     * 
     * Orchestrates:
     * 1. Dynamic audio timeline interpolation (compensates for low frequency HTMLAudioElement currentTime updates).
     * 2. Coordinate conversions: mapping song beats to horizontal pixel coordinates and MIDI pitches to vertical positions.
     * 3. Frustum/viewport culling: filtering and rendering only the notes currently visible on screen.
     * 4. Filled sung segments: overlays progress indicators over matching notes.
     * 5. Particle physics updates: simulates floating sparkles when singing pitch matches note target.
     * 6. Smart Octave Folding: dynamically matches octave shifts of the singer's pitch to target notes to avoid wrapping.
     */
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
            const now = performance.now();
            if (audioRef.current) {
                const rawTime = audioRef.current.currentTime;
                
                // If paused or ended, use raw time and reset interpolation
                if (audioRef.current.paused || audioRef.current.ended) {
                    currentTime = rawTime;
                    lastAudioTimeRef.current = rawTime;
                    lastRealTimeRef.current = now;
                } else {
                    // Audio is playing. If raw time changed from last frame, resync interpolation.
                    if (rawTime !== lastAudioTimeRef.current) {
                        lastAudioTimeRef.current = rawTime;
                        lastRealTimeRef.current = now;
                        currentTime = rawTime;
                    } else {
                        // Interpolate between audio time updates for 60fps smoothness (clamped to prevent runaway)
                        currentTime = Math.min(rawTime + 0.3, lastAudioTimeRef.current + (now - lastRealTimeRef.current) / 1000);
                    }
                }
            }

            // Assuming 4x multiplier as in original code
            const bpm = song.bpm || 120;
            const gap = song.gap || 0;
            const noteDivisor = 4; // bpmMultiplier
            const beatDuration = 60000 / (bpm * noteDivisor);
            // Master song beat: aligns visual melody notes precisely with the song audio and LyricsDisplay.
            // Microphone input latency is handled in the scoring engine when evaluating singer pitch.
            const currentBeat = ((currentTime * 1000) - gap) / beatDuration;

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
                if (note.type === '-' || note.type === 'R' || note.type === 'G') return;
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
                const sat = '100%';
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
            let activePitchNote = -1;
            
            const isPaused = audioRef.current?.paused || false;

            if (!isPaused && currentPitch && currentPitch.note > 0) {
                activePitchNote = currentPitch.note;
                lastValidPitchRef.current = activePitchNote;
                lastValidTimeRef.current = now;
            }

            // Determine what to show with responsive 300ms fade-out
            let displayedPitch: number | null = null;
            let cursorAlpha = 1.0;
            const timeSinceValid = now - lastValidTimeRef.current;

            if (activePitchNote > 0) {
                displayedPitch = activePitchNote;
                cursorAlpha = 1.0;
            } else if (!isPaused && timeSinceValid < 300 && lastValidPitchRef.current > 0) {
                // Smooth fade-out instead of remaining frozen at one spot
                displayedPitch = lastValidPitchRef.current;
                cursorAlpha = Math.max(0, 1 - (timeSinceValid / 300));
            }

            if (displayedPitch !== null && cursorAlpha > 0.01) {
                // --- Smart Octave Folding ---
                // Dynamic Target: Prefer the pitch of the active (or nearest future) note.
                // This ensures that if the song goes high, our "center" goes high, preventing wrapping.
                let targetOctaveCenter = centerPitch;

                // Find active note or nearest future note
                const notes = trackNotesSource || [];
                const activeNote = notes.find(n => n.type !== '-' && n.type !== 'R' && n.type !== 'G' && n.start <= currentBeat && (n.start + n.duration) >= currentBeat);

                if (activeNote) {
                    targetOctaveCenter = activeNote.pitch;
                } else {
                    const futureNote = notes.find(n => n.type !== '-' && n.type !== 'R' && n.type !== 'G' && n.start > currentBeat && n.start < currentBeat + 4);
                    if (futureNote) {
                        targetOctaveCenter = futureNote.pitch;
                    }
                }

                const diff = targetOctaveCenter - displayedPitch;
                const idealShift = Math.round(diff / 12) * 12;

                const currentShift = lastOctaveShiftRef.current;
                let finalShift = currentShift;

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

                // Draw Cursor with smooth alpha
                ctx.save();
                ctx.globalAlpha = cursorAlpha;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
                ctx.beginPath();
                ctx.arc(PLAYHEAD_X, y + noteHeight / 2, 8, 0, Math.PI * 2);
                ctx.fill();

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
                ctx.restore();
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

        requestRef.current = requestAnimationFrame(() => animateRef.current?.());
    }, [song, audioRef, showDebugOverlay, label, dimensions, centerPitch, showNoteLabels, trackIndex, hue, latency]); // Deps for loop recreation

    useEffect(() => {
        animateRef.current = animate;
    }, [animate]);

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
