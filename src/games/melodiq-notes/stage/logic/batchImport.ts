import type { BarMark, ScoreSong } from '../../../../modules/music-score';
import type {
  CompanionSong,
  SongScore,
  StoredBarMarks,
} from '../../../../lib/companion/songScoresApi';
import type { YouTubeResult } from '../../../../lib/companion/songDownloadApi';
import { pickRecording } from '../serverScoreLoad';
import { findSongFolder } from './scoreCatalog';
import {
  aborted,
  importRecording,
  planImport,
  waitForDownload,
  type ImportApi,
  type ImportProgress,
} from './youtubeImport';

/** Score files a batch takes (the scores `readScoreFile` reads; no audio). */
export const BATCH_SCORE_ACCEPT = '.mxl,.musicxml,.xml,.mid,.midi,.gp';

export type BatchProgress = ImportProgress | { stage: 'read' | 'search' | 'align' };

/** Everything a batch import talks to; the browser parts (score parser, aligner) are injected too. */
export interface BatchApi extends ImportApi {
  readScore: (fileName: string, data: ArrayBuffer) => ScoreSong;
  search: (query: string) => Promise<YouTubeResult[]>;
  fetchFile: (url: string) => Promise<ArrayBuffer>;
  getMarks: (songId: string, file: string) => Promise<StoredBarMarks | null>;
  saveMarks: (songId: string, file: string, marks: StoredBarMarks) => Promise<unknown>;
  align: (audio: ArrayBuffer, song: ScoreSong) => Promise<BarMark[]>;
}

export interface BatchResult {
  songId: string;
  title: string;
  artist: string;
  /** False when the folder has no recording or the alignment found too few bars. */
  aligned: boolean;
}

/**
 * Title and artist of a score: what the file writes, else "Artist - Title" from the file name
 * (MIDI and many MusicXML exports name no artist; `parse*` already fall back to the file name).
 */
export function scoreMeta(song: ScoreSong, fileName: string): { title: string; artist: string } {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  const title = song.title.trim() || base;
  if (song.artist.trim()) return { title, artist: song.artist.trim() };
  const split = /^(.+?)\s+[-–]\s+(.+)$/.exec(base);
  if (split && title === base) return { artist: split[1].trim(), title: split[2].trim() };
  return { title, artist: '' };
}

/** The search for a song's recording and the hit a batch takes without asking: the top one. */
export const recordingQuery = (title: string, artist: string) => `${artist} ${title}`.trim();
export const topHit = (results: YouTubeResult[]) => results[0]?.url ?? null;

/** Aligns one stored score to the folder's recording and stores the marks; false if it could not. */
async function alignScore(
  song: CompanionSong,
  score: SongScore,
  scoreSong: ScoreSong | null,
  api: BatchApi,
  audio: { name: string | null; data: ArrayBuffer },
): Promise<boolean> {
  const parsed = scoreSong ?? api.readScore(score.file, await api.fetchFile(score.url));
  const marks = await api.align(audio.data.slice(0), parsed);
  if (marks.length < 2) return false;
  await api.saveMarks(song.id, score.file, { marks, offsetSec: 0, audio: audio.name });
  return true;
}

/** The recording a score of the folder plays with (see pickRecording) and its bytes. */
async function folderAudio(song: CompanionSong, api: BatchApi) {
  const { recording } = pickRecording(song, null);
  if (!recording) return null;
  return {
    name: recording.songMix ? null : recording.name,
    data: await api.fetchFile(recording.url),
  };
}

/**
 * One score of a batch: finds its song folder by title and artist, downloads the top YouTube hit
 * into it unless the folder already has a recording, stores the score there and aligns it.
 */
export async function importScoreFile(
  file: File,
  api: BatchApi,
  onProgress: (p: BatchProgress) => void = () => {},
  signal?: AbortSignal,
): Promise<BatchResult> {
  onProgress({ stage: 'read' });
  const scoreSong = api.readScore(file.name, await file.arrayBuffer());
  const meta = scoreMeta(scoreSong, file.name);
  if (!meta.artist) throw new Error('the score names no artist');
  const plan = planImport(findSongFolder(await api.listSongs(), meta.title, meta.artist));
  let youtubeUrl: string | null = null;
  if (plan.kind !== 'reuse') {
    onProgress({ stage: 'search' });
    youtubeUrl = topHit(await api.search(recordingQuery(meta.title, meta.artist)));
    if (!youtubeUrl) throw new Error('no recording found on YouTube');
  }
  if (signal?.aborted) throw aborted();
  const { song, score } = await importRecording(
    { ...meta, youtubeUrl, scoreFile: file, fromSong: null },
    onProgress,
    api,
    signal,
  );
  if (signal?.aborted) throw aborted();
  onProgress({ stage: 'align' });
  const audio = await folderAudio(song, api);
  const aligned = !!audio && (await alignScore(song, score, scoreSong, api, audio));
  return { songId: song.id, ...meta, aligned };
}

/**
 * Replaces a song folder's mix with another YouTube video (the folder keeps its id, scores and
 * recordings) and aligns again every score whose marks belonged to the old mix. Scores aligned
 * to another recording of the folder keep their marks.
 */
export async function replaceSongRecording(
  song: CompanionSong,
  youtubeUrl: string,
  api: BatchApi,
  onProgress: (p: BatchProgress) => void = () => {},
  signal?: AbortSignal,
): Promise<{ song: CompanionSong; aligned: number }> {
  const jobId = await api.startDownload({
    artist: song.artist,
    title: song.title,
    youtubeUrl,
    songId: song.id,
  });
  const songId = (await waitForDownload(jobId, api, onProgress, signal)) ?? song.id;
  let next = await api.getSong(songId);
  onProgress({ stage: 'align' });
  const audio = await folderAudio(next, api);
  let aligned = 0;
  for (const score of next.scores ?? []) {
    if (signal?.aborted) throw aborted();
    const stored = score.hasMarks ? await api.getMarks(next.id, score.file) : null;
    if (stored && stored.audio !== null) continue;
    if (audio && (await alignScore(next, score, null, api, audio))) aligned++;
  }
  if (aligned) next = await api.getSong(next.id);
  return { song: next, aligned };
}
