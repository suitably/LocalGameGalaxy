import {
  companionUrl,
  fetchCompanionFile,
  getBarMarks,
  type CompanionScore,
  type CompanionSong,
  type StoredBarMarks,
} from '../../../lib/companion/songScoresApi';
import {
  getNotesMarks,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../lib/companion/notesLibraryApi';
import { readScoreFile, type LoadedScore } from './loadScore';

export type SongOrigin =
  | { kind: 'example'; title: string }
  | { kind: 'file'; title: string }
  | { kind: 'server'; title: string; songId: string; scoreFile: string }
  | { kind: 'notes'; title: string; pieceId: string; scoreFile: string };

export interface RecordingSource {
  name: string;
  url: string;
  /** Local file (object URL) or server media; local files are released when replaced. */
  local: boolean;
  /** A local recording that is not in the Notes library yet. */
  file?: File;
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

/** Sheet music in a Melodiq song folder; the song's mix is the recording. */
export async function loadSongFolderScore(
  entry: CompanionSong,
  score: CompanionScore,
): Promise<ServerScoreLoad> {
  if (!score.url) throw new Error('missing url');
  const loaded = await readServerScore(score.file, score.url, entry);
  const audio = entry.originalAudio ?? entry.audio;
  return {
    loaded,
    origin: { kind: 'server', title: entry.title, songId: entry.id, scoreFile: score.file },
    recording: audio ? { name: entry.title, url: companionUrl(audio), local: false } : null,
    marks: score.hasMarks ? await getBarMarks(entry.id, score.file) : null,
  };
}

/** A piece from the Notes library; the recording the marks were made for, else the first one. */
export async function loadNotesPieceScore(
  piece: NotesPiece,
  score: NotesPieceScore,
): Promise<ServerScoreLoad> {
  const loaded = await readServerScore(score.file, score.url, piece);
  const stored = score.hasMarks ? await getNotesMarks(piece.id, score.file) : null;
  const audio =
    piece.recordings.find((r) => r.file === stored?.audio) ?? piece.recordings[0] ?? null;
  return {
    loaded,
    origin: { kind: 'notes', title: piece.title, pieceId: piece.id, scoreFile: score.file },
    recording: audio ? { name: audio.file, url: companionUrl(audio.url), local: false } : null,
    marks: stored && audio?.file === stored.audio ? stored : null,
  };
}
