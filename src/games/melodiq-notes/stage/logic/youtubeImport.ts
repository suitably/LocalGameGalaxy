import {
  getCompanionSong,
  listLibrarySongs,
  songRecording,
  type CompanionSong,
  type SongScore,
} from '../../../../lib/companion/songScoresApi';
import { uploadSongFile } from '../../../../lib/companion/notesLibraryApi';
import {
  getSongDownloadStatus,
  startSongDownload,
  type SongDownloadRequest,
  type SongDownloadStatus,
} from '../../../../lib/companion/songDownloadApi';
import { findSongFolder } from './scoreCatalog';

/** The song the score on stage comes from when the server still has it, else a name match. */
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
  /** The score on stage, uploaded into the song folder unless it is already there. */
  scoreFile: File | null;
  /** Set when the score on stage was opened from a song folder. */
  fromSong: { songId: string; scoreFile: string } | null;
}

export type ImportProgress =
  | { stage: 'download'; status: SongDownloadStatus['status']; progress: number }
  | { stage: 'score' };

export interface ImportApi {
  listSongs: () => Promise<CompanionSong[]>;
  startDownload: (req: SongDownloadRequest) => Promise<string>;
  getStatus: (jobId: string) => Promise<SongDownloadStatus>;
  getSong: (id: string) => Promise<CompanionSong>;
  uploadScore: (songId: string, file: File) => Promise<{ file: string }>;
  wait: (ms: number) => Promise<void>;
}

const defaultApi: ImportApi = {
  listSongs: listLibrarySongs,
  startDownload: startSongDownload,
  getStatus: getSongDownloadStatus,
  getSong: getCompanionSong,
  uploadScore: uploadSongFile,
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

/**
 * Brings score and recording together in one song folder (#568): downloads the recording into
 * the matching folder with the server's yt-dlp queue if needed (a folder without `.txt` gets one),
 * and uploads the score into that folder unless it already is there.
 */
export async function importRecording(
  input: ImportInput,
  onProgress: (p: ImportProgress) => void = () => {},
  api: ImportApi = defaultApi,
  signal?: AbortSignal,
): Promise<{ score: SongScore; song: CompanionSong }> {
  const from = input.fromSong;
  const plan = planImport(
    matchSong(await api.listSongs(), input.title, input.artist, from?.songId ?? null),
  );
  const folderId: string | null = plan.kind === 'download-new' ? null : plan.song.id;
  let songId = folderId;
  if (plan.kind !== 'reuse') {
    if (!input.youtubeUrl) throw new Error('no recording chosen');
    const jobId = await api.startDownload({
      artist: input.artist,
      title: input.title,
      youtubeUrl: input.youtubeUrl,
      ...(songId ? { songId } : {}),
    });
    // a folder that got its `.txt` now has the id derived from it
    songId = (await waitForDownload(jobId, api, onProgress, signal)) ?? songId;
  }
  if (signal?.aborted) throw aborted();

  // servers from before #486 report no song id: find the new folder by artist and title
  if (!songId)
    songId = findSongFolder(await api.listSongs(), input.title, input.artist)?.id ?? null;
  if (!songId) throw new Error('downloaded song not found');

  onProgress({ stage: 'score' });
  let file: string;
  if (from && folderId && from.songId === folderId) {
    file = from.scoreFile;
  } else {
    if (!input.scoreFile) throw new Error('no score to store');
    file = (await api.uploadScore(songId, input.scoreFile)).file;
  }
  const song = await api.getSong(songId);
  const score = song.scores?.find((s) => s.file === file);
  if (!score) throw new Error('stored score not found');
  return { score, song };
}
