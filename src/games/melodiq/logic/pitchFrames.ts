/**
 * Pitch frames from a phone to the host (#882) [ID: GAME-MELODIQ-PITCH-FRAMES]
 *
 * The phone detects its pitch itself and sends only what was sung: about three detections per
 * message, each with its age `dt` (ms between its capture and the send), and a sequence number.
 * When the singer stops it sends one silence frame (`note: -1`). The host dates each frame
 * `arrival - rtt / 2 - dt` on its own clock (round trip from the heartbeat) and scores it against
 * the note that was due at that moment, so network delay and bundling do not shift the score.
 */
import type { PitchResult } from '../../../modules/audio/AudioUtils';

/** One detection; `note <= 0` is silence. */
export interface PitchFrame {
  /** Ms between the capture and the send of its message. */
  dt: number;
  note: number;
  frequency: number;
  volume: number;
}

export interface PitchMessage {
  type: 'pitch';
  seq: number;
  frames: PitchFrame[];
}

/** A pitch dated on the host clock (ms, `Date.now()`); `ageMs` is set when it is read. */
export interface TimedPitch extends PitchResult {
  capturedAt: number;
  ageMs?: number;
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const toFrame = (raw: unknown): PitchFrame | null => {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (!num(f.note) || !num(f.frequency) || !num(f.volume)) return null;
  const dt = num(f.dt) && f.dt >= 0 ? f.dt : 0;
  return { dt, note: f.note, frequency: f.frequency, volume: f.volume };
};

/**
 * The frames of a received `pitch` message, oldest first, with its sequence number (null for the
 * single-frame format of older phones). Null when it is not a valid pitch message.
 */
export function parsePitchMessage(
  msg: unknown,
): { seq: number | null; frames: PitchFrame[] } | null {
  if (!msg || typeof msg !== 'object' || (msg as { type?: unknown }).type !== 'pitch') return null;
  const m = msg as Record<string, unknown>;
  if (Array.isArray(m.frames)) {
    const frames = m.frames.map(toFrame);
    if (frames.length === 0 || frames.some((f) => f === null)) return null;
    return { seq: num(m.seq) ? m.seq : null, frames: frames as PitchFrame[] };
  }
  const single = toFrame(m);
  return single ? { seq: null, frames: [single] } : null;
}

/** When a frame was sung, on the host clock. */
export function frameCapturedAt(arrivalMs: number, rttMs: number | null, dt: number): number {
  return arrivalMs - (rttMs ?? 0) / 2 - dt;
}

/** Host side: the newest frame of a message as a dated pitch, or null for silence. */
export function newestPitch(
  frames: PitchFrame[],
  arrivalMs: number,
  rttMs: number | null,
): TimedPitch | null {
  const newest = frames.reduce((a, b) => (b.dt < a.dt ? b : a));
  if (newest.note <= 0) return null;
  return {
    note: newest.note,
    frequency: newest.frequency,
    volume: newest.volume,
    capturedAt: frameCapturedAt(arrivalMs, rttMs, newest.dt),
  };
}

/** A newer message than the last one taken (sequence numbers grow; a reconnect restarts at 0). */
export const isNewerSeq = (seq: number | null, last: number | null): boolean =>
  seq === null || last === null || seq > last || seq < last - 1000;

export interface PitchBundler {
  /** One detection at `now` (ms, `performance.now()`); null when nothing is sung. */
  push: (pitch: PitchResult | null, now: number) => void;
}

/**
 * Phone side: collects voiced detections and sends them `maxFrames` at a time, or after
 * `maxWaitMs`; the first silence after singing flushes and sends one silence frame.
 */
export function createPitchBundler(
  send: (message: PitchMessage) => void,
  { maxFrames = 3, maxWaitMs = 100 }: { maxFrames?: number; maxWaitMs?: number } = {},
): PitchBundler {
  let seq = 0;
  let pending: { at: number; frame: Omit<PitchFrame, 'dt'> }[] = [];
  let silent = true;

  const flush = (now: number) => {
    if (pending.length === 0) return;
    const frames = pending.map(({ at, frame }) => ({ dt: Math.round(now - at), ...frame }));
    pending = [];
    send({ type: 'pitch', seq: seq++, frames });
  };

  return {
    push(pitch, now) {
      if (pitch && pitch.note > 0) {
        silent = false;
        pending.push({
          at: now,
          frame: { note: pitch.note, frequency: pitch.frequency, volume: pitch.volume },
        });
        if (pending.length >= maxFrames || now - pending[0].at >= maxWaitMs) flush(now);
        return;
      }
      if (silent) return;
      silent = true;
      pending.push({ at: now, frame: { note: -1, frequency: -1, volume: pitch?.volume ?? 0 } });
      flush(now);
    },
  };
}
