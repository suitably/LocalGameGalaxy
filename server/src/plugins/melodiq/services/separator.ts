import fs from 'node:fs';
import path from 'node:path';
import { spawn, exec } from 'node:child_process';
import { scanSongs, addOrUpdateSongInCache } from './scanner';
import type { SeparatorJob } from '../../../core/types';

export const SEPARATOR_JOBS = new Map<string, SeparatorJob>();
export const separatorQueue: SeparatorJob[] = [];
let isSeparatorRunning = false;

function getAlignLyricsScriptPath(): string {
  const candidates = [
    path.resolve(__dirname, '../../scripts/align_lyrics.py'),
    path.resolve(__dirname, '../../../scripts/align_lyrics.py'),
    path.resolve(__dirname, '../../../../src/scripts/align_lyrics.py'),
    path.resolve(process.cwd(), 'src/scripts/align_lyrics.py'),
    path.resolve(process.cwd(), 'scripts/align_lyrics.py'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.resolve(process.cwd(), 'src/scripts/align_lyrics.py');
}

export async function checkIsInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('audio-separator --version', (error) => {
      if (error) {
        resolve(false);
      } else {
        exec('python3 -c "import whisper_timestamped"', (err) => {
          if (err) resolve(false);
          else resolve(true);
        });
      }
    });
  });
}

export async function checkBreakSystemPackagesSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('pip3 install --help', (err, stdout) => {
      if (!err && stdout.includes('--break-system-packages')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

export async function runInstallJob(job: SeparatorJob): Promise<void> {
  job.log.push('Starting installation...');
  job.progress = 10;

  const supportsBreak = await checkBreakSystemPackagesSupport();
  if (supportsBreak) {
    job.log.push('System-managed environment detected. Enabling --break-system-packages.');
  }

  const runPip = (args: string[], _startProgress: number, endProgress: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const finalArgs = [...args];
      if (supportsBreak) {
        finalArgs.push('--break-system-packages');
      }

      const cmd = spawn('pip3', finalArgs);

      cmd.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) job.log.push(line.trim());
        }
        if (job.progress < endProgress) {
          job.progress += 1;
        }
      });

      cmd.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) job.log.push(line.trim());
        }
      });

      cmd.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pip3 ${args.join(' ')} failed with code ${code}`));
        } else {
          job.progress = endProgress;
          resolve();
        }
      });
    });
  };

  try {
    job.log.push('Step 1/2: Installing CPU-only PyTorch dependencies (saves >1GB by avoiding CUDA)...');
    await runPip(
      [
        'install',
        '--default-timeout=1000',
        'torch',
        'torchvision',
        'torchaudio',
        '--index-url',
        'https://download.pytorch.org/whl/cpu',
      ],
      10,
      50
    );

    job.log.push('Step 2/2: Installing audio-separator[cpu] and whisper-timestamped...');
    await runPip(['install', '--default-timeout=1000', 'audio-separator[cpu]', 'whisper-timestamped'], 50, 95);

    job.progress = 100;
    job.status = 'done';
    job.log.push('Installation complete!');
  } catch (err: unknown) {
    job.status = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    job.error = msg;
    job.log.push(`❌ Installation failed: ${msg}`);
  }
}

export function findVocalsFile(
  songDir: string,
  txtPath?: string | null,
  explicitVocals?: string | null
): string | null {
  if (!songDir || !fs.existsSync(songDir)) return null;

  if (explicitVocals) {
    const explicitPath = path.isAbsolute(explicitVocals) ? explicitVocals : path.join(songDir, explicitVocals);
    if (fs.existsSync(explicitPath)) return path.basename(explicitPath);
  }

  if (txtPath && fs.existsSync(txtPath)) {
    try {
      const content = fs.readFileSync(txtPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().toUpperCase().startsWith('#VOCALS:')) {
          const vocName = line.split(':')[1]?.trim();
          if (vocName && fs.existsSync(path.join(songDir, vocName))) {
            return vocName;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const files = fs.readdirSync(songDir);
    const supportedExts = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus'];
    const vFile = files.find((f) => {
      const lower = f.toLowerCase();
      return lower.includes('vocals') && supportedExts.some((ext) => lower.endsWith(ext));
    });
    if (vFile) return vFile;
  } catch {
    // ignore
  }

  return null;
}

export async function runFullSyncJob(job: SeparatorJob): Promise<void> {
  try {
    job.status = 'running';
    const { songDir, audioFile, txtFile, safeName } = job;

    job.log.push(`Full AI Syncing ${safeName}...`);
    job.progress = 5;

    if (!songDir || !audioFile) {
      throw new Error('songDir and audioFile required for full sync.');
    }

    const txtPath = txtFile ? path.join(songDir, txtFile) : null;
    if (!txtPath || !fs.existsSync(txtPath)) {
      throw new Error(`Text file not found: ${txtPath}`);
    }

    const audioPath = path.join(songDir, audioFile);
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // 1. Check for existing separated vocals file
    const vocalsFile = findVocalsFile(songDir, txtPath, job.vocalsFile);
    let targetAudioPath: string | null = null;

    if (vocalsFile) {
      job.log.push(`Found separated vocals track: ${vocalsFile}. Using for AI alignment.`);
      targetAudioPath = path.join(songDir, vocalsFile);
      job.progress = 30;
    } else {
      job.log.push(`No separated vocals stem found. Using master audio track for AI lyrics alignment: ${audioFile}`);
      targetAudioPath = audioPath;
      job.progress = 30;
    }

    if (!targetAudioPath || !fs.existsSync(targetAudioPath)) {
      throw new Error(`Target audio file for alignment not found: ${targetAudioPath}`);
    }

    job.progress = 40;
    job.log.push(`Running AI Forced Alignment with Whisper on: ${path.basename(targetAudioPath)}...`);

    await new Promise<void>((resolve, reject) => {
      const scriptPath = getAlignLyricsScriptPath();
      const cmd = spawn('python3', [scriptPath, txtPath, targetAudioPath!]);

      cmd.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            job.log.push(line.trim());
            if (line.includes('Whisper transcribed')) job.progress = 70;
            if (line.includes('matched')) job.progress = 85;
          }
        }
      });

      cmd.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            if (line.includes('%|') || line.includes('it/s') || line.includes('MiB/s')) {
              job.log.push(line.trim());
            } else {
              job.log.push(`[Script Info] ${line.trim()}`);
            }
          }
        }
      });

      cmd.on('close', (code) => {
        if (code !== 0) reject(new Error(`align_lyrics.py failed with code ${code}`));
        else resolve();
      });
    });

    job.log.push('Successfully aligned lyrics!');
    job.progress = 100;
    job.status = 'done';

    try {
      if (txtPath && fs.existsSync(txtPath)) {
        await addOrUpdateSongInCache(txtPath);
      }
    } catch {
      // ignore
    }

    setTimeout(scanSongs, 1000);
  } catch (err: unknown) {
    job.status = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    job.error = msg;
    job.log.push(`❌ ${msg}`);
  }
}

export async function runSeparatorJob(job: SeparatorJob): Promise<void> {
  try {
    job.status = 'running';

    if (job.type === 'install') {
      await runInstallJob(job);
      return;
    }

    if (job.type === 'full-sync') {
      await runFullSyncJob(job);
      return;
    }

    const { songDir, audioFile, txtFile, safeName } = job;
    job.log.push(`Separating vocals for ${safeName}...`);
    job.progress = 5;

    if (!songDir || !audioFile) {
      throw new Error('songDir and audioFile required for separation.');
    }

    const isInstalled = await checkIsInstalled();
    if (!isInstalled) {
      throw new Error('audio-separator is not installed. Please click "Install Tool" first.');
    }

    const audioPath = path.join(songDir, audioFile);
    const txtPath = txtFile ? path.join(songDir, txtFile) : null;

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const model = 'UVR-MDX-NET-Inst_HQ_3.onnx';
    const modelsDir = process.env.MODELS_DIR
      ? path.resolve(process.env.MODELS_DIR)
      : path.join(process.cwd(), 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    job.log.push(`Model: ${model}`);
    job.log.push(`Models Directory: ${modelsDir}`);

    await new Promise<void>((resolve, reject) => {
      const cmd = spawn('audio-separator', [
        audioPath,
        '--model_filename',
        model,
        '--model_file_dir',
        modelsDir,
        '--output_dir',
        songDir,
        '--output_format',
        'mp3',
      ]);

      cmd.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            job.log.push(line.trim());
            if (line.includes('%')) job.progress = 50;
          }
        }
      });

      cmd.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            job.log.push(line.trim());
            if (line.includes('%')) job.progress = 50;
          }
        }
      });

      cmd.on('close', (code) => {
        if (code !== 0) reject(new Error(`audio-separator failed with code ${code}`));
        else resolve();
      });
    });

    job.progress = 85;
    job.log.push('Separation complete. Finding output files...');

    const files = fs.readdirSync(songDir);
    let instrumentalFile: string | null = null;
    let vocalsFile: string | null = null;

    for (const f of files) {
      if (f.endsWith('.mp3') && f !== path.basename(audioPath)) {
        if (f.includes('Instrumental')) instrumentalFile = f;
        if (f.includes('Vocals')) vocalsFile = f;
      }
    }

    if (!instrumentalFile || !vocalsFile) {
      throw new Error('Could not locate output (Instrumental/Vocals) MP3s.');
    }

    job.log.push(`Found outputs: ${instrumentalFile}, ${vocalsFile}`);

    if (txtPath && fs.existsSync(txtPath)) {
      job.log.push('Patching .txt file...');
      const content = fs.readFileSync(txtPath, 'utf-8');
      let lines = content.split('\n');

      lines = lines.filter(
        (l) =>
          !l.toLowerCase().startsWith('#mp3:') &&
          !l.toLowerCase().startsWith('#vocals:') &&
          !l.toLowerCase().startsWith('#instrumental:') &&
          !l.toLowerCase().startsWith('#original:') &&
          !l.toLowerCase().startsWith('#originalaudio:')
      );

      let lastHeader = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#')) lastHeader = i;
      }

      lines.splice(lastHeader + 1, 0, `#MP3:${instrumentalFile}`);
      lines.splice(lastHeader + 2, 0, `#VOCALS:${vocalsFile}`);
      lines.splice(lastHeader + 3, 0, `#INSTRUMENTAL:${instrumentalFile}`);
      lines.splice(lastHeader + 4, 0, `#ORIGINAL:${path.basename(audioPath)}`);

      fs.writeFileSync(txtPath, lines.join('\n'), 'utf-8');
      job.log.push('.txt patched successfully.');
    }

    job.progress = 100;
    job.status = 'done';

    try {
      if (txtPath && fs.existsSync(txtPath)) {
        await addOrUpdateSongInCache(txtPath);
      }
    } catch {
      // ignore
    }

    setTimeout(scanSongs, 1000);
  } catch (err: unknown) {
    job.status = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    job.error = msg;
    job.log.push(`❌ ${msg}`);
  }
}

export async function processSeparatorQueue(): Promise<void> {
  if (isSeparatorRunning || separatorQueue.length === 0) return;
  isSeparatorRunning = true;
  while (separatorQueue.length > 0) {
    const job = separatorQueue.shift();
    if (job) {
      try {
        await runSeparatorJob(job);
      } catch (e) {
        console.error('Separator job failed:', e);
      }
    }
  }
  isSeparatorRunning = false;
}
