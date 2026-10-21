/**
 * yt-dlp binary management for the Melodiq plugin: find, install, run [ID: SERVER-MELODIQ-YTDLP]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

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

/** Downloads the yt-dlp binary from GitHub into the first writable candidate path that then runs. */
async function downloadYtDlpBinary(job: { log: string[] }): Promise<boolean> {
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
          return true;
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
  return false;
}

export function installYtDlp(job: { log: string[] }): Promise<boolean> {
  return new Promise((resolve) => {
    job.log.push('Attempting to install yt-dlp via pip3...');
    const proc = spawn(
      'pip3',
      ['install', '--user', '--break-system-packages', '--quiet', 'yt-dlp'],
      {
        stdio: 'pipe',
      },
    );
    proc.on('close', async (code) => {
      if (code === 0) {
        const bin = findYtDlpBin();
        if (bin) return resolve(true);
      }

      job.log.push('pip3 installation failed. Downloading yt-dlp binary from GitHub...');
      resolve(await downloadYtDlpBinary(job));
    });
    proc.on('error', async () => {
      job.log.push('pip3 not available. Downloading yt-dlp binary from GitHub...');
      resolve(await downloadYtDlpBinary(job));
    });
  });
}

export async function ensureYtDlp(job: { log: string[] }): Promise<string> {
  let bin = findYtDlpBin();
  if (bin) return bin;
  job.log.push('yt-dlp not found. Installing...');
  const ok = await installYtDlp(job);
  if (!ok)
    throw new Error(
      'yt-dlp installation failed. Please install yt-dlp and ffmpeg manually on the host.',
    );
  bin = findYtDlpBin();
  if (!bin) throw new Error('yt-dlp installed but not found in PATH. Restart the server.');
  job.log.push('yt-dlp installed successfully.');
  return bin;
}

export function spawnYtDlp(
  bin: string,
  args: string[],
  onLine?: (line: string) => void,
): Promise<string> {
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
      code === 0
        ? resolve(stdout)
        : reject(new Error(`yt-dlp exit ${code}: ${(stderr || stdout).slice(-300)}`)),
    );
    proc.on('error', reject);
  });
}
