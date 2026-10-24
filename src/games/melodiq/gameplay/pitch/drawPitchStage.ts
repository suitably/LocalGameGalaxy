import type { Note } from '../../parser';
import type { SungSegment } from '../PitchVisualizer';
import { getNoteName, isMelodyNote } from '../logic/pitchLayout';
import { noteColor, type PitchColors } from './pitchColors';

/** Geometry shared by all draw calls of one frame. */
export interface StageMetrics {
  width: number;
  height: number;
  currentBeat: number;
  pixelsPerBeat: number;
  playheadX: number;
  centerPitch: number;
  noteHeight: number;
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Opacity multiplier, decays every frame. */
  life: number;
  color: string;
  size: number;
}

const MAX_PARTICLES = 50;

const pathRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) => {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
};

const pitchToY = (m: StageMetrics, pitch: number): number =>
  m.height / 2 - (pitch - m.centerPitch) * m.noteHeight - m.noteHeight / 2;

const beatToX = (m: StageMetrics, beat: number): number =>
  (beat - m.currentBeat) * m.pixelsPerBeat + m.playheadX;

export const drawGrid = (ctx: CanvasRenderingContext2D, m: StageMetrics, colors: PitchColors) => {
  const startBeat = m.currentBeat - m.playheadX / m.pixelsPerBeat;
  const endBeat = startBeat + m.width / m.pixelsPerBeat;

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = colors.beatLine;
  ctx.lineWidth = 1;
  for (let b = Math.floor(startBeat); b <= Math.ceil(endBeat + 1); b++) {
    const x = beatToX(m, b);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, m.height);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = colors.pitchLine;
  const rows = Math.ceil(m.height / m.noteHeight);
  for (let i = 0; i < rows; i += 2) {
    const y = i * m.noteHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(m.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

interface NotesInput {
  notes: readonly Note[];
  segments: Record<number, SungSegment[]>;
  trackIndex: number;
  particles: Particle[];
}

/** Draws target notes (outline), the sung fill, and spawns sparks on the playhead. Only visible notes are drawn. */
export const drawNotes = (
  ctx: CanvasRenderingContext2D,
  m: StageMetrics,
  colors: PitchColors,
  { notes, segments, trackIndex, particles }: NotesInput,
) => {
  const startBeat = m.currentBeat - m.playheadX / m.pixelsPerBeat;
  const endBeat = startBeat + m.width / m.pixelsPerBeat;

  notes.forEach((note, index) => {
    if (!isMelodyNote(note)) return;
    if (note.start + note.duration < startBeat || note.start > endBeat) return;

    const x = beatToX(m, note.start);
    const w = note.duration * m.pixelsPerBeat;
    const y = pitchToY(m, note.pitch);
    const color = noteColor(note.type, colors);
    // The note under the playhead gets a thicker outline instead of a glow.
    const isActive = m.playheadX >= x && m.playheadX <= x + w;

    ctx.strokeStyle = color;
    ctx.lineWidth = isActive ? 4 : 2;
    pathRect(ctx, x, y + 2, w, m.noteHeight - 4, 6);
    ctx.stroke();

    const noteSegments = segments[index] || [];
    for (const seg of noteSegments) {
      if (seg.trackIndex !== undefined && seg.trackIndex !== trackIndex) continue;
      const from = Math.max(seg.startBeat, note.start);
      const to = Math.min(seg.endBeat, note.start + note.duration);
      if (to <= from) continue;
      ctx.fillStyle = color;
      pathRect(ctx, beatToX(m, from), y + 2, (to - from) * m.pixelsPerBeat, m.noteHeight - 4, 4);
      ctx.fill();
    }

    if (isActive && particles.length < MAX_PARTICLES) {
      const singingCorrectly = noteSegments.some(
        (s) => m.currentBeat >= s.startBeat && m.currentBeat <= s.endBeat + 0.1,
      );
      if (singingCorrectly && Math.random() < 0.3) {
        particles.push({
          x: m.playheadX,
          y: y + m.noteHeight / 2 + (Math.random() - 0.5) * m.noteHeight,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 0.8,
          color,
          size: Math.random() * 2 + 1,
        });
      }
    }
  });
};

/** Advances and draws the sparks; returns the survivors. */
export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]): Particle[] => {
  for (const p of particles) {
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
  ctx.globalAlpha = 1;
  return particles.filter((p) => p.life > 0);
};

/** Singer's live pitch: a solid dot with an outline, plus the note name (TV-sized via `scale`). */
export const drawCursor = (
  ctx: CanvasRenderingContext2D,
  m: StageMetrics,
  colors: PitchColors,
  pitch: number,
  alpha: number,
  showLabel: boolean,
) => {
  const cy = pitchToY(m, pitch) + m.noteHeight / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colors.singer;
  ctx.strokeStyle = colors.textOutline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(m.playheadX, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (showLabel) {
    ctx.font = `bold ${24 * m.scale}px ${colors.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelX = m.playheadX + 20 * m.scale;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeText(getNoteName(pitch), labelX, cy);
    ctx.fillStyle = colors.cursorLabel;
    ctx.fillText(getNoteName(pitch), labelX, cy);
  }
  ctx.restore();
};

export const drawOverlays = (
  ctx: CanvasRenderingContext2D,
  colors: PitchColors,
  debug: { enabled: boolean; beat: number; centerPitch: number },
  label?: string,
) => {
  if (debug.enabled) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colors.debugBackground;
    ctx.fillRect(0, 0, 250, 60);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.debugText;
    ctx.font = `12px ${colors.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Beat: ${debug.beat.toFixed(2)}`, 10, 10);
    ctx.fillText(`FPS: Optimized`, 10, 25);
    ctx.fillText(`C Pitch: ${debug.centerPitch}`, 10, 40);
  }
  if (label) {
    ctx.fillStyle = colors.label;
    ctx.font = `20px ${colors.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, 20, 40);
  }
};
