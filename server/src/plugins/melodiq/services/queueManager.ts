import crypto from 'node:crypto';
import path from 'node:path';
import { DOWNLOAD_JOBS, jobQueue, processJobQueue } from './download';
import {
  SEPARATOR_JOBS,
  separatorQueue,
  processSeparatorQueue,
  checkIsInstalled,
} from './separator';
import { getSongCache } from './scanner';
import type { DownloadJob, SeparatorJob } from '../../../core/types';

export interface DownloadJobRequest {
  usdbId?: string | null;
  artist: string;
  title: string;
  videoMode?: 'mp4' | 'stream' | 'none';
  youtubeUrl?: string | null;
  targetDir?: string | null;
  safeName?: string | null;
  skipAudio?: boolean;
  audioFile?: string | null;
}

export interface SeparatorJobRequest {
  songId?: string;
  songDir?: string;
  audioFile?: string;
  vocalsFile?: string | null;
  txtFile?: string;
  safeName?: string;
  type?: 'separate' | 'full-sync' | 'install';
}

export function addDownloadJobs(requests: DownloadJobRequest[] | DownloadJobRequest): string[] {
  const list = Array.isArray(requests) ? requests : [requests];
  const jobIds: string[] = [];

  for (const reqItem of list) {
    const { usdbId, artist, title, videoMode, youtubeUrl, targetDir, safeName, skipAudio, audioFile } = reqItem;
    if (!artist || !title) continue;
    const mode = videoMode && ['mp4', 'stream', 'none'].includes(videoMode) ? videoMode : 'none';
    const jobId = crypto.randomBytes(8).toString('hex');
    const job: DownloadJob = {
      jobId,
      usdbId: usdbId || null,
      artist,
      title,
      videoMode: mode,
      youtubeUrl: youtubeUrl || null,
      targetDir: targetDir || null,
      safeName: safeName || null,
      skipAudio: !!skipAudio,
      audioFile: audioFile || null,
      status: 'pending',
      progress: 0,
      log: [],
      error: null,
    };
    DOWNLOAD_JOBS.set(jobId, job);
    jobQueue.push(job);
    jobIds.push(jobId);
  }

  if (jobIds.length > 0) {
    processJobQueue();
  }
  return jobIds;
}

export function getDownloadJobsList() {
  return Array.from(DOWNLOAD_JOBS.values()).map((j) => ({
    jobId: j.jobId,
    usdbId: j.usdbId,
    artist: j.artist,
    title: j.title,
    videoMode: j.videoMode,
    status: j.status,
    progress: j.progress,
    error: j.error,
    log: j.log,
  }));
}

export function getDownloadJob(jobId: string): DownloadJob | null {
  return DOWNLOAD_JOBS.get(jobId) || null;
}

export async function checkSeparatorInstalled(): Promise<boolean> {
  return await checkIsInstalled();
}

export function addSeparatorInstallJob(): string {
  const jobId = crypto.randomBytes(8).toString('hex');
  const job: SeparatorJob = {
    jobId,
    type: 'install',
    status: 'pending',
    progress: 0,
    log: [],
    error: null,
  };
  SEPARATOR_JOBS.set(jobId, job);
  separatorQueue.push(job);
  processSeparatorQueue();
  return jobId;
}

export function getSeparatorJobsList() {
  return Array.from(SEPARATOR_JOBS.values()).map((j) => ({
    jobId: j.jobId,
    type: j.type,
    status: j.status,
    progress: j.progress,
    error: j.error,
    log: j.log,
    safeName: j.safeName,
  }));
}

export function getSeparatorJob(jobId: string): SeparatorJob | null {
  return SEPARATOR_JOBS.get(jobId) || null;
}

export function addSeparatorJobs(requests: SeparatorJobRequest[] | SeparatorJobRequest): string[] {
  const list = Array.isArray(requests) ? requests : [requests];
  const jobIds: string[] = [];

  for (const reqItem of list) {
    const { songId, type } = reqItem;
    let { songDir, audioFile, vocalsFile, txtFile, safeName } = reqItem;

    if (songId) {
      const song = getSongCache().find((s) => s.id === songId);
      if (song && song.txtPath) {
        songDir = songDir || path.dirname(song.txtPath);
        txtFile = txtFile || path.basename(song.txtPath);
        safeName = safeName || song.title;
        if (song.originalAudio) {
          audioFile = audioFile || path.basename(song.originalAudio.split('?')[0]);
        } else if (song.audio) {
          audioFile = audioFile || path.basename(song.audio.split('?')[0]);
        } else if (song.video) {
          audioFile = audioFile || path.basename(song.video.split('?')[0]);
        }
        if (song.vocalsAudio) {
          vocalsFile = vocalsFile || path.basename(song.vocalsAudio.split('?')[0]);
        }
      }
    }

    if (!songId || !songDir || !audioFile) continue;

    const jobId = crypto.randomBytes(8).toString('hex');
    const job: SeparatorJob = {
      jobId,
      type: type || 'separate',
      songId,
      songDir,
      audioFile,
      vocalsFile: vocalsFile || null,
      txtFile,
      safeName,
      status: 'pending',
      progress: 0,
      log: [],
      error: null,
    };
    SEPARATOR_JOBS.set(jobId, job);
    separatorQueue.push(job);
    jobIds.push(jobId);
  }

  if (jobIds.length > 0) {
    processSeparatorQueue();
  }
  return jobIds;
}

export function clearDownloadJobs(jobId?: string): void {
  if (jobId) {
    DOWNLOAD_JOBS.delete(jobId);
  } else {
    for (const [id, j] of DOWNLOAD_JOBS.entries()) {
      if (j.status === 'done' || j.status === 'error') {
        DOWNLOAD_JOBS.delete(id);
      }
    }
  }
}

export function clearSeparatorJobs(jobId?: string): void {
  if (jobId) {
    SEPARATOR_JOBS.delete(jobId);
  } else {
    for (const [id, j] of SEPARATOR_JOBS.entries()) {
      if (j.status === 'done' || j.status === 'error') {
        SEPARATOR_JOBS.delete(id);
      }
    }
  }
}
