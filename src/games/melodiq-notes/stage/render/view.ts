import type { ScoreSong } from '../../../../modules/music-score';
import type { StageNote } from '../logic/charts';
import type { StagePlayer } from '../engine/types';
import type { Ctx, StageTexts } from './common';

export interface ViewContext {
  g: Ctx;
  p: StagePlayer;
  song: ScoreSong;
  w: number;
  h: number;
  /** Song position shown (a little before bar 1 while idle so the first notes are visible). */
  beat: number;
  isFocus: boolean;
  idle: boolean;
  texts: StageTexts;
}

/** Where on the panel a note is hit, so effects appear at the right spot. */
export type HitPoint = (n: StageNote) => { x: number; y: number };

/** Notes to highlight as "play next": the pending notes, or the first notes before the start. */
export const upcoming = (v: ViewContext) =>
  v.idle ? v.p.notes.filter((n) => n.t === v.p.notes[0]?.t) : v.p.pending;
