import type { StageEngine } from './StageEngine';

/** How far the recording may drift from the song clock before it is moved (scaled by speed). */
const RESEEK_SEC = 0.25;

/** Keeps the recording on the song clock: starts after the count-in, waits with learn mode, seeks after loops. */
export function syncRecording(e: StageEngine) {
  const rec = e.recording;
  if (!rec) return;
  const target = rec.map.secAt(e.beat);
  const shouldPlay =
    e.state === 'playing' && e.beat >= 0 && !e.waitingFor && target >= 0 && target < rec.duration;
  if (!shouldPlay) rec.pause();
  else if (!rec.isPlaying() || Math.abs(rec.time() - target) > RESEEK_SEC * e.speed)
    rec.play(target, e.speed);
}
