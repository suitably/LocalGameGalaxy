import { firstNoteBeat, leadInBeat, noNotesAhead } from '../logic/seek';
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

/** Moves the playhead to `beat`; a loop the target lies outside of ends. */
export function seekStage(e: StageEngine, beat: number, loopLeadBeats: number) {
  const song = e.song;
  if (!song || !e.players.length) return;
  const target = Math.min(song.end, Math.max(-e.countIn, beat));
  if (e.loop && (target >= e.loop.to || target < e.loop.from - loopLeadBeats)) e.loop = null;
  e.sound.stopAll();
  e.waitingFor = null;
  if (e.state === 'done') e.state = 'paused';
  e.rewindTo(target, target);
  syncRecording(e);
  e.emit();
}

/** Seeks to `leadInSec` real seconds before the first note of any player. */
export function seekToFirstNote(e: StageEngine, leadInSec: number, loopLeadBeats: number) {
  const first = firstNoteBeat(e.players.map((p) => p.notes));
  if (first === null) return;
  seekStage(e, leadInBeat(first, leadInSec, e.secPerBeat(first), -e.countIn), loopLeadBeats);
}

/** Running without a loop, before the song's end, and every player is past their last note. */
export function nothingLeftToPlay(e: StageEngine) {
  const song = e.song;
  if (!song || e.loop || !e.players.length) return false;
  if (e.state !== 'playing' && e.state !== 'paused') return false;
  return (
    e.beat < song.end &&
    noNotesAhead(
      e.players.map((p) => p.notes),
      e.beat,
    )
  );
}
