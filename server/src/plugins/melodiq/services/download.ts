import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serverConfig } from '../../../config';
import { sanitizeFilename } from '../../../utils/helpers';
import { getUsdbCookie, fetchUsdbTxt } from './usdb';
import { scanSongs, addOrUpdateSongInCache } from './scanner';
import { SEPARATOR_JOBS, separatorQueue, processSeparatorQueue } from './separator';
import { ensureYtDlp, spawnYtDlp } from './ytdlp';
import {
  buildMinimalTxt,
  cleanSearchTerm,
  hasNotes,
  hasSongHeaders,
  rewriteMediaHeaders,
  videoHeader,
} from './ultrastarTxt';
import type { DownloadJob, SeparatorJob, Song } from '../../../core/types';

export const DOWNLOAD_JOBS = new Map<string, DownloadJob>();
export const jobQueue: DownloadJob[] = [];
let isQueueRunning = false;

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Existing local .txt with notes, else the USDB file (one re-login retry), else null. */
async function resolveLyricsTxt(job: DownloadJob, txtPath: string): Promise<string | null> {
  let txtContent: string | null = null;

  if (fs.existsSync(txtPath)) {
    try {
      const existing = fs.readFileSync(txtPath, 'utf-8');
      if (hasNotes(existing)) {
        job.log.push('📄 Using existing local .txt file with lyrics...');
        txtContent = existing;
      } else {
        job.log.push('⚠️ Existing local .txt has no lyrics notes. Fetching from USDB...');
      }
    } catch (err: unknown) {
      job.log.push(`⚠️ Failed to read existing .txt: ${errorMessage(err)}`);
    }
  }

  if (
    (!txtContent || !hasNotes(txtContent)) &&
    job.usdbId &&
    serverConfig.usdbUsername &&
    serverConfig.usdbPassword
  ) {
    job.log.push('🔐 Logging in to USDB...');
    try {
      const cookie = await getUsdbCookie();
      job.log.push('📄 Downloading lyrics (.txt)...');
      const fetched = await fetchUsdbTxt(job.usdbId, cookie);
      if (fetched && hasNotes(fetched)) {
        txtContent = fetched;
        job.log.push('✅ Lyrics successfully downloaded from USDB.');
      } else if (fetched) {
        txtContent = fetched;
      }
    } catch {
      job.log.push('Session expired or error – re-logging in...');
      try {
        const cookie = await getUsdbCookie(true);
        const fetched = await fetchUsdbTxt(job.usdbId, cookie);
        if (fetched) {
          txtContent = fetched;
          job.log.push('✅ Lyrics successfully downloaded from USDB.');
        }
      } catch (err: unknown) {
        job.log.push(`⚠️ Failed to fetch lyrics from USDB: ${errorMessage(err)}`);
      }
    }
  } else if (!txtContent) {
    job.log.push('⚠️ No USDB credentials / USDB ID – generating minimal .txt.');
  }
  return txtContent;
}

/** The job's YouTube URL, or the first search hit for "artist title" without bracketed suffixes. */
async function resolveYoutubeUrl(ytBin: string, job: DownloadJob): Promise<string> {
  if (job.youtubeUrl) return job.youtubeUrl;
  job.log.push('📡 Resolving YouTube URL...');
  const searchQuery = `ytsearch1:${cleanSearchTerm(job.artist)} ${cleanSearchTerm(job.title)}`;
  const ytOut = await spawnYtDlp(ytBin, ['--print', 'webpage_url', '--no-playlist', searchQuery]);
  const resolvedUrl = ytOut.trim().split('\n')[0];
  if (!resolvedUrl || (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://'))) {
    throw new Error(`Failed to resolve YouTube URL for: ${job.artist} - ${job.title}`);
  }
  job.log.push(`📡 Resolved URL: ${resolvedUrl}`);
  return resolvedUrl;
}

/** Downloads the thumbnail and renames it to `targetCover`; failures are logged, not thrown. */
async function downloadCover(
  ytBin: string,
  job: DownloadJob,
  url: string,
  audioOut: string,
  targetCover: string,
) {
  job.log.push('🖼️ Downloading cover...');
  try {
    await spawnYtDlp(
      ytBin,
      [
        '--write-thumbnail',
        '--convert-thumbnails',
        'jpg',
        '--skip-download',
        '-o',
        audioOut,
        '--no-playlist',
        url,
      ],
      (l) => job.log.push(l),
    );
    const thumb = ['.jpg', '.png', '.jpeg', '.webp']
      .map((ext) => `${audioOut}${ext}`)
      .find((p) => fs.existsSync(p));
    if (thumb) {
      try {
        fs.renameSync(thumb, targetCover);
      } catch {
        // ignore
      }
    }
    job.progress = 25;
  } catch (err: unknown) {
    job.log.push('⚠️ Failed to download cover: ' + errorMessage(err));
  }
}

/** Downloads the MP4 or returns the stream URL; the value for `#VIDEO` ('' for no video). */
async function resolveVideo(
  ytBin: string,
  job: DownloadJob,
  url: string,
  songDir: string,
  safeName: string,
) {
  if (job.videoMode === 'mp4') {
    job.log.push('🎬 Downloading video (MP4)...');
    await spawnYtDlp(
      ytBin,
      [
        '-f',
        'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format',
        'mp4',
        '-o',
        path.join(songDir, `${safeName}.mp4`),
        '--no-playlist',
        url,
      ],
      (l) => job.log.push(l),
    );
    job.log.push('✅ Video done.');
    return `${safeName}.mp4`;
  }
  if (job.videoMode === 'stream') {
    job.log.push(`📡 Stream URL: ${url}`);
    return url;
  }
  return '';
}

/** Queues vocal separation for the downloaded song when auto separation is enabled. */
function enqueueAutoSeparation(
  job: DownloadJob,
  songDir: string,
  safeName: string,
  audioFile: string,
  indexedSong: Song | null,
) {
  if (!serverConfig.autoVocalSeparation) return;
  job.log.push(`🎤 Auto Vocal Separation is enabled. Queuing separator job...`);
  const sepJob: SeparatorJob = {
    jobId: crypto.randomBytes(8).toString('hex'),
    type: 'separate',
    songId: indexedSong ? indexedSong.id : safeName,
    songDir,
    audioFile,
    txtFile: `${safeName}.txt`,
    safeName,
    status: 'pending',
    progress: 0,
    log: [],
    error: null,
  };
  SEPARATOR_JOBS.set(sepJob.jobId, sepJob);
  separatorQueue.push(sepJob);
  processSeparatorQueue();
}

export async function runDownloadJob(job: DownloadJob): Promise<void> {
  try {
    job.status = 'running';
    const ytBin = await ensureYtDlp(job);

    const dlBase = serverConfig.downloadDir || serverConfig.directories[0] || process.cwd();
    const safeName =
      job.safeName || `${sanitizeFilename(job.artist)} - ${sanitizeFilename(job.title)}`;
    const songDir = job.targetDir || path.join(dlBase, safeName);
    fs.mkdirSync(songDir, { recursive: true });
    job.log.push(`📁 Folder: ${songDir}`);

    const txtPath = path.join(songDir, `${safeName}.txt`);
    const txtContent = await resolveLyricsTxt(job, txtPath);
    job.progress = 15;

    const url = await resolveYoutubeUrl(ytBin, job);
    const audioFile = job.skipAudio && job.audioFile ? job.audioFile : `${safeName}.m4a`;
    const audioOut = path.join(songDir, `${safeName}.m4a`);
    const targetCover = path.join(songDir, `${safeName}-cover.jpg`);
    await downloadCover(ytBin, job, url, audioOut, targetCover);

    if (!job.skipAudio) {
      job.log.push('🎵 Downloading audio...');
      await spawnYtDlp(
        ytBin,
        [
          // YouTube's AAC as it is: no second lossy encode, and M4A's frame index seeks exactly
          // (browsers land up to a second off in VBR MP3s, which breaks note alignment)
          '-f',
          'bestaudio[ext=m4a]/bestaudio',
          '--extract-audio',
          '--audio-format',
          'm4a',
          '--audio-quality',
          '0',
          '-o',
          audioOut,
          '--no-playlist',
          url,
        ],
        (l) => job.log.push(l),
      );
      // replacing a song's recording used to overwrite this file; now it would stay behind
      fs.rmSync(path.join(songDir, `${safeName}.mp3`), { force: true });
    } else {
      job.log.push('⏩ Skipping audio download as requested.');
    }
    job.progress = 55;
    job.log.push('✅ Audio and cover done.');

    // an existing song folder keeps its video when only the audio is downloaded
    const video =
      (await resolveVideo(ytBin, job, url, songDir, safeName)) ||
      (job.songId ? videoHeader(txtContent) : '');
    job.progress = 85;

    const media = {
      mp3: audioFile,
      video,
      cover: fs.existsSync(targetCover) ? `${safeName}-cover.jpg` : undefined,
    };
    const txt = hasSongHeaders(txtContent)
      ? rewriteMediaHeaders(txtContent, media)
      : buildMinimalTxt({ title: job.title, artist: job.artist, ...media });
    fs.writeFileSync(txtPath, txt, 'utf-8');
    job.log.push('✅ .txt written.');

    // Index right away so the UI has the song (and its id) before the rescan
    let indexedSong: Song | null = null;
    try {
      indexedSong = await addOrUpdateSongInCache(txtPath);
      if (indexedSong) job.log.push('⚡ Immediately added to song cache.');
    } catch (e) {
      console.warn('[Download] Failed to instantly index song:', e);
    }
    if (indexedSong) job.songId = indexedSong.id;
    // done only now, so a client polling the status gets the song id with it
    job.progress = 100;
    job.status = 'done';
    job.log.push(`🎉 Saved to: ${songDir}`);

    enqueueAutoSeparation(job, songDir, safeName, audioFile, indexedSong);
    setTimeout(scanSongs, 1000);
  } catch (err: unknown) {
    job.status = 'error';
    job.error = errorMessage(err);
    job.log.push(`❌ ${job.error}`);
  }
}

export async function processJobQueue(): Promise<void> {
  if (isQueueRunning || jobQueue.length === 0) return;
  isQueueRunning = true;
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (job) {
      try {
        await runDownloadJob(job);
      } catch (e) {
        console.error('Job failed:', e);
      }
    }
  }
  isQueueRunning = false;
}
