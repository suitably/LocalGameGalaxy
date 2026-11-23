/**
 * What Melodiq sings (#604): every song goes through the shared `ScoreSong` model. A karaoke `.txt`
 * becomes a score (`ultraStarToScore`) and its vocal parts come back as singer tracks
 * (`scoreToSungSong`); a song without `.txt` sings the vocal part of its score, timed by the bar
 * marks. With both, the `.txt` wins.
 */
import {
  parseUltraStarTxt,
  scoreToSungSong,
  ultraStarToScore,
  type BarMark,
  type ScoreSong,
  type SungSong,
  type UltraStarNote,
  type UltraStarTrack,
} from '../../../modules/music-score';
import type { Song } from '../db';

/** A sung note on the UltraStar grid (`-` = line break). */
export type Note = UltraStarNote;
/** One singer's notes. */
export type SongTrack = UltraStarTrack;

/** Sheet music of a song with the bar marks that time it to the recording (null: score tempo). */
export interface ScoreVocalsSource {
  song: ScoreSong;
  marks: BarMark[] | null;
}

/** The gameplay view of a song: singer tracks, grid, and the `.txt` header fields (media names). */
export interface SongVocals extends SungSong {
  headers: Record<string, string>;
}

/** What gameplay components receive: the sung view; song fields are optional extras. */
export type SongWithNotes = Partial<Song> & {
  notes?: Note[];
  tracks?: SongTrack[];
  bpm?: number;
  gap?: number;
  headers?: Record<string, string>;
};

/**
 * The song's vocals from its karaoke `.txt` (preferred) or its score.
 * @throws when the song has neither, or nothing to sing.
 */
export function songVocals(src: { txtContent?: string; score?: ScoreVocalsSource }): SongVocals {
  if (src.txtContent) {
    const parsed = parseUltraStarTxt(src.txtContent);
    const { song, marks } = ultraStarToScore(parsed);
    return { ...scoreToSungSong(song, marks), headers: parsed.headers };
  }
  if (src.score) {
    const { song, marks } = src.score;
    return { ...scoreToSungSong(song, marks), headers: { TITLE: song.title, ARTIST: song.artist } };
  }
  throw new Error('The song has neither a karaoke .txt nor sheet music.');
}
