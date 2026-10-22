import { drumLaneOf } from '../../../../modules/music-score';
import { lowerBound } from '../logic/charts';
import { GOOD_SEC, nearestOpenNote, pendingNotes, timingJudgement } from '../logic/judging';
import type { StageEngine } from './StageEngine';
import type { StagePlayer } from './types';

const PRESS_FLASH_MS = 160;

/** The focused player played `lane` (MIDI key, string or drum lane). */
export function playLane(e: StageEngine, lane: number) {
  const p = e.focus;
  if (!p) return;
  p.pressed.add(lane);
  setTimeout(() => p.pressed.delete(lane), PRESS_FLASH_MS);
  const view = p.instrument.view;
  if (view === 'drums') e.sound.playDrum(lane, 1);
  else if (view === 'keys') e.sound.playNote(p.instrument.kind, lane, 0.5, 1);
  if (e.state !== 'playing') return;
  if (e.mode === 'learn') return playLaneLearning(e, p, lane);
  const found = nearestOpenNote(p.notes, lane, e.beat, e.secPerBeat(e.beat));
  const kind = found ? timingJudgement(found.deltaSec) : null;
  if (!found || !kind) return;
  if (view === 'strings')
    e.sound.playNote(
      p.instrument.kind,
      found.note.pitch,
      found.note.dur * e.secPerBeat(found.note.t),
      1,
    );
  e.judge(p, found.note, kind);
}

function playLaneLearning(e: StageEngine, p: StagePlayer, lane: number) {
  const target = p.pending.find((n) => n.lane === lane);
  if (target && (target.t - e.beat) * e.secPerBeat(target.t) <= GOOD_SEC) {
    if (p.instrument.view === 'strings')
      e.sound.playNote(p.instrument.kind, target.pitch, target.dur * e.secPerBeat(target.t), 1);
    e.judge(p, target, 'learn');
    p.pending = pendingNotes(p.notes, e.loop);
  } else if (e.waitingFor === p && p.pending[0]) {
    const s = p.stats.sections[e.sectionAt(p.pending[0].t)];
    if (s) s.errors++;
    p.fx.push({ kind: 'wrong', note: p.pending[0], lane });
  }
}

/** A pitch from MIDI or microphone: a key, a drum lane, a string (the one the open note is on) or a sung pitch. */
export function playPitch(e: StageEngine, midi: number) {
  const p = e.focus;
  if (!p) return;
  const view = p.instrument.view;
  if (view === 'pitch') return e.setVoice(midi, true);
  if (view === 'drums') return playLane(e, drumLaneOf(midi));
  if (view === 'keys') return playLane(e, midi);
  const near = p.notes
    .slice(lowerBound(p.notes, e.beat - 1))
    .find((n) => !n.judged && n.pitch === midi && Math.abs(n.t - e.beat) < 1);
  playLane(e, near ? near.lane : -1);
}
