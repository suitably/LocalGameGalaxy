import {
  companionUrl,
  fetchCompanionFile,
  songRecording,
  type CompanionSong,
  type SongScore,
  type StoredBarMarks,
} from '../../../lib/companion/songScoresApi';
import { getSongMarks } from '../../../lib/companion/notesLibraryApi';
import { parseUltraStarTxt, ultraStarToScore } from '../../../modules/music-score';
import { readScoreFile, type LoadedScore } from './loadScore';

export type SongOrigin =
  | { kind: 'example'; title: string }
  | { kind: 'file'; title: string }
  /** A score in a song folder (#568). */
  | { kind: 'notes'; title: string; songId: string; scoreFile: string }
  /** The vocal part of a Melodiq song's karaoke `.txt` (#566). */
  | { kind: 'karaoke'; title: string; songId: string };

export interface RecordingSource {
  name: string;
  url: string;
  /** Local file (object URL) or server media; local files are released when replaced. */
  local: boolean;
  /** A local recording that is not in the song folder yet. */
  file?: File;
  /** The song's mix; marks for it are stored with `audio: null`. */
  songMix?: boolean;
}

/** A score from the companion server with the recording it plays with and its stored bar marks. */
export interface ServerScoreLoad {
  loaded: LoadedScore;
  origin: SongOrigin;
  recording: RecordingSource | null;
  /** Only marks that belong to `recording`. */
  marks: StoredBarMarks | null;
}

async function readServerScore(file: string, url: string, meta: { title: string; artist: string }) {
  const loaded = readScoreFile(file, await fetchCompanionFile(url));
  loaded.song.title = meta.title;
  loaded.song.artist = meta.artist;
  return loaded;
}

/**
 * Which recording plays with a score: the song folder's recording the marks name; else the song's
 * mix (marks naming no other recording belong to it); else the folder's first recording.
 */
export function pickRecording(
  song: CompanionSong,
  stored: StoredBarMarks | null,
): { recording: RecordingSource | null; marks: StoredBarMarks | null } {
  const recordings = song.recordings ?? [];
  const own = recordings.find((r) => r.file === stored?.audio);
  if (own) {
    return {
      recording: { name: own.file, url: companionUrl(own.url), local: false },
      marks: stored,
    };
  }
  const mix = songRecording(song);
  if (mix) {
    return {
      recording: { name: song.title, url: companionUrl(mix), local: false, songMix: true },
      marks: stored,
    };
  }
  const first = recordings[0];
  return {
    recording: first ? { name: first.file, url: companionUrl(first.url), local: false } : null,
    marks: null,
  };
}

/** A score from a song folder with the recording it plays with (see pickRecording). */
export async function loadSongScore(
  song: CompanionSong,
  score: SongScore,
): Promise<ServerScoreLoad> {
  const loaded = await readServerScore(score.file, score.url, song);
  const stored = score.hasMarks ? await getSongMarks(song.id, score.file) : null;
  return {
    loaded,
    origin: { kind: 'notes', title: song.title, songId: song.id, scoreFile: score.file },
    ...pickRecording(song, stored),
  };
}

/**
 * A Melodiq song's karaoke `.txt` as a vocal score with the song's mix. The `.txt` is timed to that
 * mix, so its bar marks come from `#BPM` / `#GAP` and nothing has to be aligned (#566).
 */
export async function loadKaraokeVocals(song: CompanionSong): Promise<ServerScoreLoad> {
  const parsed = parseUltraStarTxt(song.txtContent ?? '');
  const { song: score, marks } = ultraStarToScore(parsed, `${song.artist} - ${song.title}.txt`);
  score.title = song.title;
  score.artist = song.artist;
  if (score.parts.length === 0) throw new Error('The karaoke file has no notes.');
  const mix = songRecording(song);
  return {
    loaded: { song: score, xml: null },
    origin: { kind: 'karaoke', title: song.title, songId: song.id },
    recording: mix
      ? { name: song.title, url: companionUrl(mix), local: false, songMix: true }
      : null,
    marks: mix ? { marks, offsetSec: 0, audio: null } : null,
  };
}
