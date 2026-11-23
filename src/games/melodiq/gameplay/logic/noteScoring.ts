import type { Note } from '../../logic/songVocals';

/** Points a track sung perfectly is worth (UltraStar uses 10,000; Melodiq caps a track at 1,000). */
export const TRACK_MAX_POINTS = 1000;

/** Notes the scoring engine scores: not line breaks (`-`) and not rap (`R`, `G`). */
export const isScoredNote = (n: Note): boolean =>
  n.type !== '-' && n.type !== 'R' && n.type !== 'G';

/** Index of the scored note sounding at `beat`, or -1. */
export const activeNoteIndex = (notes: readonly Note[], beat: number): number =>
  notes.findIndex((n) => isScoredNote(n) && beat >= n.start && beat <= n.start + n.duration);

/** Points per beat so a perfectly sung track gives `TRACK_MAX_POINTS`; golden beats (`*`) count `golden` times. */
export function pointsPerBeat(notes: readonly Note[], golden: number): number {
  const totalBeats = notes
    .filter(isScoredNote)
    .reduce((sum, n) => sum + n.duration * (n.type === '*' ? golden : 1), 0);
  return totalBeats > 0 ? TRACK_MAX_POINTS / totalBeats : 10;
}
