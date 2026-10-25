import {
  listCompanionSongs,
  songRecording,
  type CompanionSong,
} from '../../../../lib/companion/songScoresApi';
import {
  createNotesPiece,
  getNotesPiece,
  updateNotesPiece,
  uploadNotesFile,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../../lib/companion/notesLibraryApi';
import {
  getSongDownloadStatus,
  startSongDownload,
  type SongDownloadRequest,
  type SongDownloadStatus,
} from '../../../../lib/companion/songDownloadApi';
import { catalogKey } from './scoreCatalog';

/** The Melodiq song folder with the same artist and title (see catalogKey), if there is one. */
export function findSongFolder(
  songs: CompanionSong[],
  title: string,
  artist: string,
): CompanionSong | null {
  const key = catalogKey(title, artist);
  return songs.find((s) => catalogKey(s.title, s.artist) === key) ?? null;
}

/** The song a piece is linked to when the server still has it, else the folder matching by name. */
export function matchSong(
  songs: CompanionSong[],
  title: string,
  artist: string,
  linkedSongId: string | null,
): CompanionSong | null {
  return (
    (linkedSongId && songs.find((s) => s.id === linkedSongId)) ||
    findSongFolder(songs, title, artist)
  );
}

/**
 * What importing does: a matching folder that has a recording is used as it is (its mix is never
 * replaced); a matching folder without one gets the download; otherwise a new folder is made.
 */
export type ImportPlan =
  | { kind: 'reuse'; song: CompanionSong }
  | { kind: 'download-into'; song: CompanionSong }
  | { kind: 'download-new' };

export function planImport(match: CompanionSong | null): ImportPlan {
  if (!match) return { kind: 'download-new' };
  return songRecording(match)
    ? { kind: 'reuse', song: match }
    : { kind: 'download-into', song: match };
}

export interface ImportInput {
  title: string;
  artist: string;
  /** Needed unless the plan is `reuse`. */
  youtubeUrl: string | null;
  /** The score on stage, stored as a new Notes piece unless it already is one. */
  scoreFile: File | null;
  /** Set when the score on stage was opened from the Notes library. */
  fromPiece: { pieceId: string; scoreFile: string; songId: string | null } | null;
}

export type ImportProgress =
  | { stage: 'download'; status: SongDownloadStatus['status']; progress: number }
  | { stage: 'score' };

export interface ImportApi {
  listSongs: () => Promise<CompanionSong[]>;
  startDownload: (req: SongDownloadRequest) => Promise<string>;
  getStatus: (jobId: string) => Promise<SongDownloadStatus>;
  createPiece: typeof createNotesPiece;
  getPiece: typeof getNotesPiece;
  updatePiece: typeof updateNotesPiece;
  uploadScore: (pieceId: string, file: File) => Promise<{ file: string }>;
  wait: (ms: number) => Promise<void>;
}

const defaultApi: ImportApi = {
  listSongs: listCompanionSongs,
  startDownload: startSongDownload,
  getStatus: getSongDownloadStatus,
  createPiece: createNotesPiece,
  getPiece: getNotesPiece,
  updatePiece: updateNotesPiece,
  uploadScore: uploadNotesFile,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export const POLL_MS = 1500;

const aborted = () => new DOMException('cancelled', 'AbortError');

/** Polls the server's download job until it is done; resolves to the song id it reports. */
async function waitForDownload(
  jobId: string,
  api: ImportApi,
  onProgress: (p: ImportProgress) => void,
  signal?: AbortSignal,
): Promise<string | null> {
  for (;;) {
    if (signal?.aborted) throw aborted();
    const status = await api.getStatus(jobId);
    onProgress({ stage: 'download', status: status.status, progress: status.progress });
    if (status.status === 'done') return status.songId ?? null;
    if (status.status === 'error') throw new Error(status.error || 'download failed');
    await api.wait(POLL_MS);
  }
}

/** Links the piece on stage to the song, or stores the score as a new piece linked to it. */
async function linkScore(
  input: ImportInput,
  songId: string,
  api: ImportApi,
): Promise<{ pieceId: string; file: string }> {
  const from = input.fromPiece;
  if (from) {
    if (from.songId !== songId) {
      const current = await api.getPiece(from.pieceId);
      await api.updatePiece(from.pieceId, { title: current.title, artist: current.artist, songId });
    }
    return { pieceId: from.pieceId, file: from.scoreFile };
  }
  if (!input.scoreFile) throw new Error('no score to store');
  const piece = await api.createPiece({ title: input.title, artist: input.artist, songId });
  return { pieceId: piece.id, file: (await api.uploadScore(piece.id, input.scoreFile)).file };
}

/**
 * Brings score and recording together: downloads the recording into a Melodiq song folder with
 * the server's yt-dlp queue if needed, and links the score's Notes piece to that song (`songId`)
 * so it plays with the song's mix. The score itself stays in the Notes library (Q18).
 */
export async function importRecording(
  input: ImportInput,
  onProgress: (p: ImportProgress) => void = () => {},
  api: ImportApi = defaultApi,
  signal?: AbortSignal,
): Promise<{ piece: NotesPiece; score: NotesPieceScore; song: CompanionSong }> {
  const linked = input.fromPiece?.songId ?? null;
  const plan = planImport(matchSong(await api.listSongs(), input.title, input.artist, linked));
  let songId: string | null = plan.kind === 'download-new' ? null : plan.song.id;
  if (plan.kind !== 'reuse') {
    if (!input.youtubeUrl) throw new Error('no recording chosen');
    const jobId = await api.startDownload({
      artist: input.artist,
      title: input.title,
      youtubeUrl: input.youtubeUrl,
      ...(songId ? { songId } : {}),
    });
    songId = (await waitForDownload(jobId, api, onProgress, signal)) ?? songId;
  }
  if (signal?.aborted) throw aborted();

  // servers from before #486 report no song id: find the new folder by artist and title
  if (!songId)
    songId = findSongFolder(await api.listSongs(), input.title, input.artist)?.id ?? null;
  if (!songId) throw new Error('downloaded song not found');

  onProgress({ stage: 'score' });
  const { pieceId, file } = await linkScore(input, songId, api);
  const [piece, songs] = await Promise.all([api.getPiece(pieceId), api.listSongs()]);
  const song = songs.find((s) => s.id === songId);
  const score = piece.scores.find((s) => s.file === file);
  if (!song || !score) throw new Error('stored score not found');
  return { piece, score, song };
}
