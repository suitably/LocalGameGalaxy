/**
 * YouTube search and yt-dlp song downloads on the companion server (`melodiq` plugin) [ID: LIB-COMPANION-DOWNLOAD]
 */
import { companionRequest as request, jsonBody } from './companionHttp';

export interface YouTubeResult {
  id: string;
  title: string;
  duration: number;
  duration_string: string;
  uploader: string;
  url: string;
  thumbnail: string;
}

export interface SongDownloadRequest {
  artist: string;
  title: string;
  youtubeUrl: string;
  /** Download into this existing song folder instead of a new one. */
  songId?: string;
}

export interface SongDownloadStatus {
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  error: string | null;
  /** The indexed song once done (servers from before #486 do not send it). */
  songId?: string | null;
}

export const searchYouTube = (query: string, limit = 5) =>
  request<YouTubeResult[]>(`/api/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`);

/** Queues one audio-only download in the server's yt-dlp queue and returns its job id. */
export async function startSongDownload(req: SongDownloadRequest): Promise<string> {
  const { jobIds } = await request<{ jobIds: string[] }>(
    '/api/usdb/download',
    jsonBody('POST', [{ ...req, videoMode: 'none' }]),
  );
  if (!jobIds?.[0]) throw new Error('download was not queued');
  return jobIds[0];
}

export const getSongDownloadStatus = (jobId: string) =>
  request<SongDownloadStatus>(`/api/usdb/status/${encodeURIComponent(jobId)}`);
