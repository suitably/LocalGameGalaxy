/**
 * A song without karaoke `.txt` sings the vocal part of its sheet music (#604): which songs Melodiq
 * lists, which score of a song folder it sings, and the bar marks that time it to the mix.
 */
import { sungParts, type BarMark, type ScoreSong } from '../../../modules/music-score';
import type { SongScore, StoredBarMarks } from '../../../lib/companion/songScoresApi';
import { songVocals, type SongVocals } from './songVocals';

/** i18n keys (`melodiq.session.*`) of the ways a score-only song can fail to load. */
export type ScoreVocalsError = 'no_vocal_part' | 'score_load_failed';

export class ScoreVocalsLoadError extends Error {
  readonly reason: ScoreVocalsError;
  constructor(reason: ScoreVocalsError) {
    super(reason);
    this.reason = reason;
  }
}

/**
 * Songs Melodiq lists from `/api/songs?all=1`: every karaoke song, and songs with sheet music.
 * Whether a score has a vocal part is only known after reading it (`loadScoreVocals`).
 */
export function isSingableServerSong(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const song = raw as { karaoke?: unknown; scores?: unknown };
  if (song.karaoke !== false) return true;
  return Array.isArray(song.scores) && song.scores.length > 0;
}

/** Scores to try, in order: those with bar marks (timed to a recording) first, else folder order. */
export const scoreCandidates = (scores: readonly SongScore[]): SongScore[] => [
  ...scores.filter((s) => s.hasMarks),
  ...scores.filter((s) => !s.hasMarks),
];

/**
 * Stored marks as they time the song's mix (fine-tune offset applied); marks made for another
 * recording in the folder do not, so the score's own tempo times it then (null).
 */
export function marksForMix(stored: StoredBarMarks | null): BarMark[] | null {
  if (!stored || stored.audio !== null || stored.marks.length < 2) return null;
  return stored.marks.map((m) => ({ beat: m.beat, sec: m.sec + (stored.offsetSec || 0) }));
}

export interface ScoreVocalsDeps {
  fetchFile: (url: string) => Promise<ArrayBuffer>;
  fetchMarks: (songId: string, file: string) => Promise<StoredBarMarks | null>;
  readScore: (file: string, data: ArrayBuffer) => ScoreSong;
}

/**
 * The vocals of the first score (see `scoreCandidates`) that has a vocal part.
 * @throws ScoreVocalsLoadError: `no_vocal_part` when no score has one, `score_load_failed` when
 * none could be read.
 */
export async function loadScoreVocals(
  songId: string,
  scores: readonly SongScore[],
  deps: ScoreVocalsDeps,
): Promise<SongVocals> {
  let readAny = false;
  for (const score of scoreCandidates(scores)) {
    let song: ScoreSong;
    try {
      song = deps.readScore(score.file, await deps.fetchFile(score.url));
    } catch (e) {
      console.warn('[Melodiq] Could not read score', score.file, e);
      continue;
    }
    readAny = true;
    if (sungParts(song).length === 0) continue;
    const stored = score.hasMarks ? await deps.fetchMarks(songId, score.file) : null;
    return songVocals({ score: { song, marks: marksForMix(stored) } });
  }
  throw new ScoreVocalsLoadError(
    readAny || scores.length === 0 ? 'no_vocal_part' : 'score_load_failed',
  );
}
