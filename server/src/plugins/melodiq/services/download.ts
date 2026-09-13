import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { serverConfig } from '../../../config';
import { sanitizeFilename } from '../../../utils/helpers';
import { getUsdbCookie, fetchUsdbTxt } from './usdb';
import { scanSongs, addOrUpdateSongInCache } from './scanner';
import { SEPARATOR_JOBS, separatorQueue, processSeparatorQueue } from './separator';
import type { DownloadJob, SeparatorJob } from '../../../core/types';

export const DOWNLOAD_JOBS = new Map<string, DownloadJob>();
export const jobQueue: DownloadJob[] = [];
let isQueueRunning = false;

export function findYtDlpBin(): string | null {
  const candidates = [
    'yt-dlp',
    path.join(__dirname, '../../../../yt-dlp'),
    path.join(process.cwd(), 'yt-dlp'),
    '/tmp/yt-dlp',
    '/usr/local/bin/yt-dlp',
    `${process.env.HOME || '/root'}/.local/bin/yt-dlp`,
    `${process.env.HOME || '/root'}/.npm-global/bin/yt-dlp`,
  ];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['--version'], { stdio: 'pipe', timeout: 4000 });
      return bin;
    } catch {
      // not found here
    }
  }
  return null;
}

export function downloadYtDlpFile(dest: string, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const curl = spawn('curl', ['-L', url, '-o', dest]);
    curl.on('close', (code) => {
      if (code === 0) {
        try {
          fs.chmodSync(dest, 0o755);
          resolve(true);
        } catch {
          resolve(false);
        }
      } else {
        const wget = spawn('wget', [url, '-O', dest]);
        wget.on('close', (codeW) => {
          if (codeW === 0) {
            try {
              fs.chmodSync(dest, 0o755);
              resolve(true);
            } catch {
              resolve(false);
            }
          } else {
            resolve(false);
          }
        });
        wget.on('error', () => resolve(false));
      }
    });
    curl.on('error', () => {
      const wget = spawn('wget', [url, '-O', dest]);
      wget.on('close', (codeW) => {
        if (codeW === 0) {
          try {
            fs.chmodSync(dest, 0o755);
            resolve(true);
          } catch {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
      wget.on('error', () => resolve(false));
    });
  });
}

export function installYtDlp(job: { log: string[] }): Promise<boolean> {
  return new Promise((resolve) => {
    job.log.push('Attempting to install yt-dlp via pip3...');
    const proc = spawn('pip3', ['install', '--user', '--break-system-packages', '--quiet', 'yt-dlp'], {
      stdio: 'pipe',
    });
    proc.on('close', async (code) => {
      if (code === 0) {
        const bin = findYtDlpBin();
        if (bin) return resolve(true);
      }

      job.log.push('pip3 installation failed. Downloading yt-dlp binary from GitHub...');
      const destPaths = [
        path.join(__dirname, '../../../../yt-dlp'),
        path.join(process.cwd(), 'yt-dlp'),
        '/tmp/yt-dlp',
      ];
      const urls = [
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
      ];
      for (const dest of destPaths) {
        for (const url of urls) {
          job.log.push(`Downloading ${url} to ${dest}...`);
          const ok = await downloadYtDlpFile(dest, url);
          if (ok) {
            try {
              execFileSync(dest, ['--version'], { stdio: 'pipe', timeout: 4000 });
              job.log.push(`Successfully downloaded and verified yt-dlp at ${dest}`);
              return resolve(true);
            } catch {
              try {
                fs.unlinkSync(dest);
              } catch {
                // ignore
              }
            }
          }
        }
      }
      resolve(false);
    });
    proc.on('error', async () => {
      job.log.push('pip3 not available. Downloading yt-dlp binary from GitHub...');
      const destPaths = [
        path.join(__dirname, '../../../../yt-dlp'),
        path.join(process.cwd(), 'yt-dlp'),
        '/tmp/yt-dlp',
      ];
      const urls = [
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
      ];
      for (const dest of destPaths) {
        for (const url of urls) {
          job.log.push(`Downloading ${url} to ${dest}...`);
          const ok = await downloadYtDlpFile(dest, url);
          if (ok) {
            try {
              execFileSync(dest, ['--version'], { stdio: 'pipe', timeout: 4000 });
              job.log.push(`Successfully downloaded and verified yt-dlp at ${dest}`);
              return resolve(true);
            } catch {
              try {
                fs.unlinkSync(dest);
              } catch {
                // ignore
              }
            }
          }
        }
      }
      resolve(false);
    });
  });
}

export async function ensureYtDlp(job: { log: string[] }): Promise<string> {
  let bin = findYtDlpBin();
  if (bin) return bin;
  job.log.push('yt-dlp not found. Installing...');
  const ok = await installYtDlp(job);
  if (!ok) throw new Error('yt-dlp installation failed. Please install yt-dlp and ffmpeg manually on the host.');
  bin = findYtDlpBin();
  if (!bin) throw new Error('yt-dlp installed but not found in PATH. Restart the server.');
  job.log.push('yt-dlp installed successfully.');
  return bin;
}

export function spawnYtDlp(bin: string, args: string[], onLine?: (line: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    const handleStdout = (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      if (onLine)
        s.split('\n')
          .filter((l) => l.trim())
          .forEach((l) => onLine(l));
    };
    const handleStderr = (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      if (onLine)
        s.split('\n')
          .filter((l) => l.trim())
          .forEach((l) => onLine(l));
    };
    proc.stdout.on('data', handleStdout);
    proc.stderr.on('data', handleStderr);
    proc.on('close', (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`yt-dlp exit ${code}: ${(stderr || stdout).slice(-300)}`))
    );
    proc.on('error', reject);
  });
}

export async function runDownloadJob(job: DownloadJob): Promise<void> {
  try {
    job.status = 'running';
    const { usdbId, artist, title, videoMode, youtubeUrl, targetDir, safeName: jobSafeName, skipAudio, audioFile } = job;

    // 1. Ensure yt-dlp is available
    const ytBin = await ensureYtDlp(job);

    // 2. Prepare output folder
    const dlBase = serverConfig.downloadDir || serverConfig.directories[0] || process.cwd();
    const safeName = jobSafeName || `${sanitizeFilename(artist)} - ${sanitizeFilename(title)}`;
    const songDir = targetDir || path.join(dlBase, safeName);
    fs.mkdirSync(songDir, { recursive: true });
    job.log.push(`📁 Folder: ${songDir}`);

    // 3. Fetch .txt from USDB or recover existing local one
    let txtContent: string | null = null;
    const txtPath = path.join(songDir, `${safeName}.txt`);
    const hasNotes = (str?: string | null): boolean =>
      Boolean(str && str.split('\n').some((l) => /^[:*FRG]\s/.test(l.trim())));

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
        const msg = err instanceof Error ? err.message : String(err);
        job.log.push(`⚠️ Failed to read existing .txt: ${msg}`);
      }
    }

    if ((!txtContent || !hasNotes(txtContent)) && usdbId && serverConfig.usdbUsername && serverConfig.usdbPassword) {
      job.log.push('🔐 Logging in to USDB...');
      try {
        const cookie = await getUsdbCookie();
        job.log.push('📄 Downloading lyrics (.txt)...');
        const fetched = await fetchUsdbTxt(usdbId, cookie);
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
          const fetched = await fetchUsdbTxt(usdbId, cookie);
          if (fetched) {
            txtContent = fetched;
            job.log.push('✅ Lyrics successfully downloaded from USDB.');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          job.log.push(`⚠️ Failed to fetch lyrics from USDB: ${msg}`);
        }
      }
    } else if (!txtContent) {
      job.log.push('⚠️ No USDB credentials / USDB ID – generating minimal .txt.');
    }
    job.progress = 15;

    // 3.5 Resolve YouTube URL if not provided to ensure consistency
    let resolvedUrl = youtubeUrl;
    if (!resolvedUrl) {
      job.log.push('📡 Resolving YouTube URL...');
      const cleanTitle = title
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const cleanArtist = artist
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const searchQuery = `ytsearch1:${cleanArtist} ${cleanTitle}`;

      const ytOut = await spawnYtDlp(ytBin, ['--print', 'webpage_url', '--no-playlist', searchQuery]);
      resolvedUrl = ytOut.trim().split('\n')[0];
      if (!resolvedUrl || (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://'))) {
        throw new Error(`Failed to resolve YouTube URL for: ${artist} - ${title}`);
      }
      job.log.push(`📡 Resolved URL: ${resolvedUrl}`);
    }

    // 4. Download thumbnail first
    job.log.push('🖼️ Downloading cover...');
    const audioOut = path.join(songDir, `${safeName}.mp3`);
    const targetCover = path.join(songDir, `${safeName}-cover.jpg`);

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
          resolvedUrl,
        ],
        (l) => job.log.push(l)
      );

      const defaultThumb = `${audioOut}.jpg`;
      if (fs.existsSync(defaultThumb)) {
        try {
          fs.renameSync(defaultThumb, targetCover);
        } catch {
          // ignore
        }
      } else {
        const possibleThumbExts = ['.png', '.jpeg', '.webp'];
        for (const ext of possibleThumbExts) {
          const thumbPath = `${audioOut}${ext}`;
          if (fs.existsSync(thumbPath)) {
            try {
              fs.renameSync(thumbPath, targetCover);
            } catch {
              // ignore
            }
            break;
          }
        }
      }
      job.progress = 25;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      job.log.push('⚠️ Failed to download cover: ' + msg);
    }

    // 4.5. Download audio via yt-dlp
    if (!skipAudio) {
      job.log.push('🎵 Downloading audio...');
      await spawnYtDlp(
        ytBin,
        [
          '--extract-audio',
          '--audio-format',
          'mp3',
          '--audio-quality',
          '0',
          '-o',
          audioOut,
          '--no-playlist',
          resolvedUrl,
        ],
        (l) => job.log.push(l)
      );
    } else {
      job.log.push('⏩ Skipping audio download as requested.');
    }

    job.progress = 55;
    job.log.push('✅ Audio and cover done.');

    // 5. Video handling
    let videoHeaderValue = '';
    if (videoMode === 'mp4') {
      const videoOut = path.join(songDir, `${safeName}.mp4`);
      job.log.push('🎬 Downloading video (MP4)...');
      await spawnYtDlp(
        ytBin,
        [
          '-f',
          'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format',
          'mp4',
          '-o',
          videoOut,
          '--no-playlist',
          resolvedUrl,
        ],
        (l) => job.log.push(l)
      );
      videoHeaderValue = `${safeName}.mp4`;
      job.log.push('✅ Video done.');
    } else if (videoMode === 'stream') {
      videoHeaderValue = resolvedUrl;
      job.log.push(`📡 Stream URL: ${videoHeaderValue}`);
    }
    job.progress = 85;

    // 6. Write .txt file
    if (txtContent && (txtContent.includes('#TITLE') || txtContent.includes('#ARTIST'))) {
      let lines = txtContent.split('\n');
      lines = lines.filter(
        (l) =>
          !l.match(/^#MP3:/i) &&
          !l.match(/^#VIDEO:/i) &&
          !l.match(/^#COVER:/i) &&
          !l.match(/^#BACKGROUND:/i)
      );

      const lastHeaderIdx = lines.reduce((acc, l, i) => (l.startsWith('#') ? i : acc), 0);
      const targetAudioFile = skipAudio && audioFile ? audioFile : `${safeName}.mp3`;
      lines.splice(lastHeaderIdx + 1, 0, `#MP3:${targetAudioFile}`);

      let offset = 2;
      if (videoHeaderValue) {
        lines.splice(lastHeaderIdx + offset, 0, `#VIDEO:${videoHeaderValue}`);
        offset++;
      }

      if (fs.existsSync(targetCover)) {
        lines.splice(lastHeaderIdx + offset, 0, `#COVER:${safeName}-cover.jpg`);
      }

      fs.writeFileSync(txtPath, lines.join('\n'), 'utf-8');
    } else {
      const targetAudioFile = skipAudio && audioFile ? audioFile : `${safeName}.mp3`;
      const lines = [
        `#TITLE:${title}`,
        `#ARTIST:${artist}`,
        `#MP3:${targetAudioFile}`,
        videoHeaderValue ? `#VIDEO:${videoHeaderValue}` : null,
        fs.existsSync(targetCover) ? `#COVER:${safeName}-cover.jpg` : null,
        `#BPM:200`,
        `#GAP:0`,
        `E`,
      ].filter(Boolean);
      fs.writeFileSync(txtPath, lines.join('\n'), 'utf-8');
    }
    job.log.push('✅ .txt written.');
    job.progress = 100;
    job.status = 'done';
    job.log.push(`🎉 Saved to: ${songDir}`);

    // Instantly index the downloaded song into cache so UI has it immediately
    let indexedSong = null;
    try {
      indexedSong = await addOrUpdateSongInCache(txtPath);
      if (indexedSong) {
        job.log.push('⚡ Immediately added to song cache.');
      }
    } catch (e) {
      console.warn('[Download] Failed to instantly index song:', e);
    }

    if (serverConfig.autoVocalSeparation) {
      job.log.push(`🎤 Auto Vocal Separation is enabled. Queuing separator job...`);
      const sepJobId = crypto.randomBytes(8).toString('hex');
      const sepJob: SeparatorJob = {
        jobId: sepJobId,
        type: 'separate',
        songId: indexedSong ? indexedSong.id : safeName,
        songDir,
        audioFile: `${safeName}.mp3`,
        txtFile: `${safeName}.txt`,
        safeName,
        status: 'pending',
        progress: 0,
        log: [],
        error: null,
      };
      SEPARATOR_JOBS.set(sepJobId, sepJob);
      separatorQueue.push(sepJob);
      processSeparatorQueue();
    }

    // Auto-rescan library
    setTimeout(scanSongs, 1000);
  } catch (err: unknown) {
    job.status = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    job.error = msg;
    job.log.push(`❌ ${msg}`);
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
