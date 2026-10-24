import React, { useEffect, useRef, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import type { Song } from '../db';
import type { Note, SongTrack } from '../parser';
import type { PitchResult } from '../audio/MicrophoneManager';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import {
  computePitchLayout,
  interpolateAudioTime,
  nextOctaveShift,
  octaveTargetPitch,
  resolveDisplayedPitch,
  type AudioClock,
} from './logic/pitchLayout';
import { resolvePitchColors } from './pitch/pitchColors';
import { useContainerSize } from './pitch/useContainerSize';
import {
  drawCursor,
  drawGrid,
  drawNotes,
  drawOverlays,
  drawParticles,
  type Particle,
  type StageMetrics,
} from './pitch/drawPitchStage';

export type SongWithNotes = Song & {
  notes?: Note[];
  tracks?: SongTrack[];
  bpm?: number;
  gap?: number;
  headers?: any;
};

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
  /** Show debugging info (current beat, center pitch). */
  showDebugOverlay?: boolean;
  /** Label to overlay on the top left (e.g., player name). */
  label?: string;
  /** Profile hue (0-360); drawn as the nearest piece colour (DESIGN.md §2.3). */
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

const PitchVisualizerContent = React.memo<PitchVisualizerProps>(
  ({
    song,
    audioRef,
    height,
    currentPitchRef,
    sungSegmentsRef,
    showDebugOverlay = false,
    label,
    hue = 190,
    showNoteLabels = true,
    trackIndex = 0,
    scale = 1.0,
  }) => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const clockRef = useRef<AudioClock>({ lastAudioTime: 0, lastRealTime: 0 });
    const octaveShiftRef = useRef(0);
    const lastValidPitchRef = useRef(-1);
    const lastValidTimeRef = useRef(0);

    // The parent may pass a new ref object literal every render; the loop reads the latest.
    const latestRef = useRef({ currentPitchRef, sungSegmentsRef });
    useEffect(() => {
      latestRef.current = { currentPitchRef, sungSegmentsRef };
    }, [currentPitchRef, sungSegmentsRef]);

    const dimensions = useContainerSize(containerRef, height);
    const colors = useMemo(() => resolvePitchColors(theme, hue), [theme, hue]);
    const notes = useMemo(
      () =>
        (song.tracks && song.tracks[trackIndex] ? song.tracks[trackIndex].notes : song.notes) || [],
      [song.tracks, song.notes, trackIndex],
    );
    const { centerPitch, noteHeight } = useMemo(
      () => computePitchLayout(notes, dimensions.height, scale),
      [notes, dimensions.height, scale],
    );

    // High-DPI backing store, then the requestAnimationFrame render loop.
    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: true });
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== dimensions.width * dpr || canvas.height !== dimensions.height * dpr) {
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
      }

      const bpm = song.bpm || 120;
      const gap = song.gap || 0;
      const beatDuration = 60000 / (bpm * 4);
      let frameId = 0;

      const frame = () => {
        try {
          const now = performance.now();
          const audio = audioRef.current;
          let currentTime = 0;
          if (audio) {
            const step = interpolateAudioTime(
              clockRef.current,
              audio.currentTime,
              audio.paused || audio.ended,
              now,
            );
            clockRef.current = step.clock;
            currentTime = step.time;
          }
          // Master song beat; mic latency is compensated in the scoring engine, not here.
          const currentBeat = (currentTime * 1000 - gap) / beatDuration;
          const metrics: StageMetrics = {
            width: dimensions.width,
            height: dimensions.height,
            currentBeat,
            pixelsPerBeat: 40 * scale,
            playheadX: 150 * scale,
            centerPitch,
            noteHeight,
            scale,
          };

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, dimensions.width, dimensions.height);
          drawGrid(ctx, metrics, colors);
          drawNotes(ctx, metrics, colors, {
            notes,
            segments: latestRef.current.sungSegmentsRef.current || {},
            trackIndex,
            particles: particlesRef.current,
          });
          particlesRef.current = drawParticles(ctx, particlesRef.current);

          const isPaused = audio?.paused || false;
          const livePitch = latestRef.current.currentPitchRef.current?.note ?? -1;
          if (!isPaused && livePitch > 0) {
            lastValidPitchRef.current = livePitch;
            lastValidTimeRef.current = now;
          }
          const shown = resolveDisplayedPitch(
            livePitch,
            lastValidPitchRef.current,
            now - lastValidTimeRef.current,
            isPaused,
          );
          if (shown.pitch !== null && shown.alpha > 0.01) {
            const target = octaveTargetPitch(notes, currentBeat, centerPitch);
            octaveShiftRef.current = nextOctaveShift(shown.pitch, target, octaveShiftRef.current);
            drawCursor(
              ctx,
              metrics,
              colors,
              shown.pitch + octaveShiftRef.current,
              shown.alpha,
              showNoteLabels,
            );
          }

          drawOverlays(
            ctx,
            colors,
            { enabled: showDebugOverlay, beat: currentBeat, centerPitch },
            label,
          );
        } catch (e) {
          console.error('Error in PitchVisualizer animate loop:', e);
        }
        frameId = requestAnimationFrame(frame);
      };

      frameId = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(frameId);
    }, [
      song.bpm,
      song.gap,
      audioRef,
      notes,
      dimensions,
      centerPitch,
      noteHeight,
      scale,
      trackIndex,
      colors,
      showNoteLabels,
      showDebugOverlay,
      label,
    ]);

    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'transparent',
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </Box>
    );
  },
);

export const PitchVisualizer = (props: PitchVisualizerProps) => (
  <ErrorBoundary fallback={<Box sx={{ color: 'error.main', p: 1 }}>Visualizer Error</Box>}>
    <PitchVisualizerContent {...props} />
  </ErrorBoundary>
);
