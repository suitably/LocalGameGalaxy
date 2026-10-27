import {
  companionUrl,
  fetchCompanionFile,
  songRecording,
  type CompanionSong,
  type StoredBarMarks,
} from '../../../lib/companion/songScoresApi';
import {
  getNotesMarks,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../lib/companion/notesLibraryApi';
import { parseUltraStarTxt, ultraStarToScore } from '../../../modules/music-score';
import { readScoreFile, type LoadedScore } from './loadScore';

export type SongOrigin =
  | { kind: 'example'; title: string }
  | { kind: 'file'; title: string }
  | {
      kind: 'notes';
      title: string;
      pieceId: string;
      scoreFile: string;
      /** Melodiq song the piece is linked to (it plays with that song's mix). */
      songId: string | null;
    }
  /** The vocal part of a Melodiq song's karaoke `.txt` (#566). */
  | { kind: 'karaoke'; title: string; songId: string };

export interface RecordingSource {
  name: string;
  url: string;
  /** Local file (object URL) or server media; local files are released when replaced. */
  local: boolean;
  /** A local recording that is not in the Notes library yet. */
  file?: File;
  /** The linked Melodiq song's mix; marks for it are stored with `audio: null`. */
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
 * Which recording plays with a piece: the piece's own recording the marks name; else the linked
 * song's mix (marks naming no own recording belong to it); else the piece's first recording.
 */
export function pickRecording(
  piece: NotesPiece,
  song: CompanionSong | null,
  stored: StoredBarMarks | null,
): { recording: RecordingSource | null; marks: StoredBarMarks | null } {
  const own = piece.recordings.find((r) => r.file === stored?.audio);
  if (own) {
    return {
      recording: { name: own.file, url: companionUrl(own.url), local: false },
      marks: stored,
    };
  }
  const mix = song ? songRecording(song) : null;
  if (song && mix) {
    return {
      recording: { name: song.title, url: companionUrl(mix), local: false, songMix: true },
      marks: stored,
    };
  }
  const first = piece.recordings[0];
  return {
    recording: first ? { name: first.file, url: companionUrl(first.url), local: false } : null,
    marks: null,
  };
}

/** A piece from the Notes library with the recording it plays with (see pickRecording). */
export async function loadNotesPieceScore(
  piece: NotesPiece,
  score: NotesPieceScore,
  song: CompanionSong | null = null,
): Promise<ServerScoreLoad> {
  const loaded = await readServerScore(score.file, score.url, piece);
  const stored = score.hasMarks ? await getNotesMarks(piece.id, score.file) : null;
  return {
    loaded,
    origin: {
      kind: 'notes',
      title: piece.title,
      pieceId: piece.id,
      scoreFile: score.file,
      songId: piece.songId ?? null,
    },
    ...pickRecording(piece, song, stored),
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
