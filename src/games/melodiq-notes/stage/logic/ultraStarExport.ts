import {
  exportableVocalParts,
  scoreToUltraStar,
  type BarMark,
  type ScorePart,
  type ScoreSong,
} from '../../../../modules/music-score';

/** What to export: one vocal part by id, or the first two vocal parts as a duet. */
export const DUET_CHOICE = 'duet';

/** The picker's vocal parts, with the duet option when the song has exactly two. */
export function ultraStarChoices(song: ScoreSong | null): { parts: ScorePart[]; duet: boolean } {
  const parts = song ? exportableVocalParts(song) : [];
  return { parts, duet: parts.length === 2 };
}

/**
 * The `.txt` for the chosen part(s), timed like the recording plays (bar marks plus the offset).
 * `recordingName` becomes `#MP3` unless it is the linked song's mix, whose file name the stage lacks.
 * @throws without bar marks or vocal parts.
 */
export function buildUltraStarFile(
  song: ScoreSong,
  marks: BarMark[] | null,
  offset: number,
  choice: string,
  recordingName?: string,
): { name: string; text: string } {
  const { parts, duet } = ultraStarChoices(song);
  const ids = choice === DUET_CHOICE && duet ? parts.map((p) => p.id) : [choice];
  const shifted = marks?.map((m) => ({ ...m, sec: m.sec + offset })) ?? null;
  const text = scoreToUltraStar(song, ids, shifted, { mp3: recordingName });
  const base = [song.artist, song.title].filter(Boolean).join(' - ') || 'song';
  return { name: `${base}.txt`, text };
}
