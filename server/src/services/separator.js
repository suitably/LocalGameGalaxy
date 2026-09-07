const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { scanSongs, addOrUpdateSongInCache } = require('./scanner');

/**
 * AI Audio Vocal Separation & Installation Service
 * 
 * Manages CPU-only vocal separation using PyTorch and the `audio-separator` CLI.
 * 
 * ## Job Processing Architecture
 * - Uses a central `separatorQueue` array to process jobs sequentially.
 * - `SEPARATOR_JOBS` map holds active job status/logs in memory for API querying.
 * - Spawns shell processes (`spawn`, `exec`) for installation and separation.
 * 
 * ## PyTorch Environment Installation
 * - First checks if `audio-separator` and Python dependencies are present.
 * - Checks if the system python package manager requires the `--break-system-packages` override flag.
 * - Forces installation of CPU-only PyTorch build:
 *   `pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu`
 *   to avoid downloading massive CUDA binaries (~1GB+).
 * 
 * ## Vocal Separation execution
 * - Spawns `audio-separator` with `UVR-MDX-NET-Inst_HQ_3.onnx` ONNX model.
 * - Logs and maps outputs (`Instrumental` and `Vocals` stems) to the song folder.
 * - Patches UltraStar `.txt` files with `#MP3:instrumental.mp3` and `#VOCALS:vocals.mp3` headers.
 */
const SEPARATOR_JOBS = new Map();
const separatorQueue = [];
let isSeparatorRunning = false;

async function checkIsInstalled() {
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

async function checkBreakSystemPackagesSupport() {
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

/**
 * Executes a pip3 installation sequence.
 * Installs PyTorch (CPU variant) first, then audio-separator and whisper-timestamped.
 * Handles system-managed python environments with break-system-packages support.
 * Updates job progress and log array reactively.
 * 
 * @param {Object} job - The installation job definition.
 */
async function runInstallJob(job) {
    job.log.push("Starting installation...");
    job.progress = 10;
    
    const supportsBreak = await checkBreakSystemPackagesSupport();
    if (supportsBreak) {
        job.log.push("System-managed environment detected. Enabling --break-system-packages.");
    }

    const runPip = (args, startProgress, endProgress) => {
        return new Promise((resolve, reject) => {
            const finalArgs = [...args];
            if (supportsBreak) {
                finalArgs.push('--break-system-packages');
            }
            
            const cmd = spawn('pip3', finalArgs);
            
            cmd.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) job.log.push(line.trim());
                }
                if (job.progress < endProgress) {
                    job.progress += 1;
                }
            });

            cmd.stderr.on('data', (data) => {
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
        job.log.push("Step 1/2: Installing CPU-only PyTorch dependencies (saves >1GB by avoiding CUDA)...");
        await runPip([
            'install', 
            '--default-timeout=1000', 
            'torch', 'torchvision', 'torchaudio', 
            '--index-url', 'https://download.pytorch.org/whl/cpu'
        ], 10, 50);

        job.log.push("Step 2/2: Installing audio-separator[cpu] and whisper-timestamped...");
        await runPip([
            'install', 
            '--default-timeout=1000', 
            'audio-separator[cpu]', 'whisper-timestamped'
        ], 50, 95);

        job.progress = 100;
        job.status = 'done';
        job.log.push("Installation complete!");
    } catch (err) {
        job.status = 'error';
        job.error = err.message;
        job.log.push(`❌ Installation failed: ${err.message}`);
    }
}

/**
 * Routes and runs the requested separation or synchronization job.
 * Spawns the audio-separator ONNX model child process and monitors stdout/stderr for progress.
 * Locates the output files and updates the UltraStar .txt file headers accordingly.
 * 
 * @param {Object} job - The separation/sync/install job request.
 */
async function runSeparatorJob(job) {
    try {
        job.status = 'running';
        
        if (job.type === 'install') {
            await runInstallJob(job);
            return;
        }
        
        if (job.type === 'auto-sync') {
            await runAutoSyncJob(job);
            return;
        }

        if (job.type === 'full-sync') {
            await runFullSyncJob(job);
            return;
        }

        const { songId, songDir, audioFile, txtFile, safeName } = job;
        job.log.push(`Separating vocals for ${safeName}...`);
        job.progress = 5;

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
        const modelsDir = path.join(process.cwd(), 'models');
        if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
        }
        job.log.push(`Model: ${model}`);
        job.log.push(`Models Directory: ${modelsDir}`);
        
        await new Promise((resolve, reject) => {
            const cmd = spawn('audio-separator', [
                audioPath,
                '--model_filename', model,
                '--model_file_dir', modelsDir,
                '--output_dir', songDir,
                '--output_format', 'mp3'
            ]);

            cmd.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        job.log.push(line.trim());
                        if (line.includes('%')) job.progress = 50;
                    }
                }
            });

            cmd.stderr.on('data', (data) => {
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
        job.log.push("Separation complete. Finding output files...");
        
        const files = fs.readdirSync(songDir);
        let instrumentalFile = null;
        let vocalsFile = null;
        
        for (const f of files) {
            if (f.endsWith('.mp3') && f !== path.basename(audioPath)) {
                if (f.includes('Instrumental')) instrumentalFile = f;
                if (f.includes('Vocals')) vocalsFile = f;
            }
        }
        
        if (!instrumentalFile || !vocalsFile) {
            throw new Error("Could not locate output (Instrumental/Vocals) MP3s.");
        }
            
        job.log.push(`Found outputs: ${instrumentalFile}, ${vocalsFile}`);
        
        if (txtPath && fs.existsSync(txtPath)) {
            job.log.push("Patching .txt file...");
            const content = fs.readFileSync(txtPath, 'utf-8');
            let lines = content.split('\n');
            
            lines = lines.filter(l => 
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
            job.log.push(".txt patched successfully.");
        }
        
        job.progress = 100;
        job.status = 'done';
        
        try {
            if (txtPath && fs.existsSync(txtPath)) {
                await addOrUpdateSongInCache(txtPath);
            }
        } catch (e) { /* ignore */ }

        setTimeout(scanSongs, 1000);
    } catch (err) {
        job.status = 'error';
        job.error = err.message;
        job.log.push(`❌ ${err.message}`);
    }
}

async function processSeparatorQueue() {
    if (isSeparatorRunning || separatorQueue.length === 0) return;
    isSeparatorRunning = true;
    while (separatorQueue.length > 0) {
        const job = separatorQueue.shift();
        try {
            await runSeparatorJob(job);
        } catch (e) {
            console.error('Separator job failed:', e);
        }
    }
    isSeparatorRunning = false;
}

function findVocalsFile(songDir, txtPath, explicitVocals) {
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
        } catch (e) { /* ignore */ }
    }

    try {
        const files = fs.readdirSync(songDir);
        const supportedExts = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus'];
        const vFile = files.find(f => {
            const lower = f.toLowerCase();
            return lower.includes('vocals') && supportedExts.some(ext => lower.endsWith(ext));
        });
        if (vFile) return vFile;
    } catch (e) { /* ignore */ }

    return null;
}

async function runAutoSyncJob(job) {
    try {
        job.status = 'running';
        const { songId, songDir, audioFile, txtFile, safeName, approximateStartSec, isPaused } = job;
        
        job.log.push(`Auto-Syncing ${safeName}...${approximateStartSec ? ` (Near ${approximateStartSec.toFixed(1)}s)` : ''}`);
        job.progress = 10;

        const txtPath = txtFile ? path.join(songDir, txtFile) : null;
        if (!txtPath || !fs.existsSync(txtPath)) {
            throw new Error(`Text file not found: ${txtPath}`);
        }

        let vocalsStartMs = 0;
        
        if (isPaused && approximateStartSec && approximateStartSec > 0) {
            job.log.push(`Manual sync requested at ${approximateStartSec.toFixed(2)}s. Bypassing audio analysis.`);
            vocalsStartMs = Math.round(approximateStartSec * 1000);
        } else {
            const vocalsFile = findVocalsFile(songDir, txtPath, job.vocalsFile);
            let syncAudioFile = vocalsFile;
            if (syncAudioFile) {
                job.log.push(`Using separated vocals track for start detection: ${syncAudioFile}`);
            } else {
                job.log.push(`No separated vocals track found. Using main audio track: ${audioFile}`);
                syncAudioFile = audioFile;
            }

            const syncAudioPath = path.join(songDir, syncAudioFile);
            if (!fs.existsSync(syncAudioPath)) {
                throw new Error(`Audio file not found: ${syncAudioPath}`);
            }

            job.log.push(`Running silence detection on ${syncAudioFile}...`);
            job.progress = 30;

            const firstSoundStartSec = await new Promise((resolve) => {
                const cmd = spawn('ffmpeg', [
                    '-i', syncAudioPath,
                    '-af', 'silencedetect=noise=-30dB:d=0.2',
                    '-f', 'null', '-'
                ]);

                let startSec = 0;
                let output = '';

                cmd.stderr.on('data', (data) => {
                    output += data.toString();
                });

                cmd.on('close', () => {
                    const lines = output.split('\n');
                    let foundSilenceEnd = false;
                    let minDiff = Infinity;
                    
                    for (const line of lines) {
                        if (line.includes('silence_end')) {
                            const match = line.match(/silence_end:\s+([\d.]+)/);
                            if (match) {
                                const time = parseFloat(match[1]);
                                
                                if (approximateStartSec && approximateStartSec > 0) {
                                    const targetTime = approximateStartSec - 0.3;
                                    const diff = Math.abs(time - targetTime);
                                    if (diff < minDiff && diff < 4.0) {
                                        minDiff = diff;
                                        startSec = time;
                                        foundSilenceEnd = true;
                                    }
                                } else {
                                    startSec = time;
                                    foundSilenceEnd = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (!foundSilenceEnd) {
                        if (approximateStartSec && approximateStartSec > 0) {
                            startSec = Math.max(0, approximateStartSec - 0.3);
                        } else {
                            startSec = 0;
                        }
                    }
                    resolve(startSec);
                });
            });

            vocalsStartMs = Math.round(firstSoundStartSec * 1000);
        }

        job.log.push(`Detected vocals start at: ${vocalsStartMs} ms`);
        job.progress = 75;

        // Parse txt file
        const txtContent = fs.readFileSync(txtPath, 'utf-8');
        const lines = txtContent.split('\n');
        
        let bpm = 120;
        let oldGap = 0;
        let firstNoteStartBeat = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.toUpperCase().startsWith('#BPM:')) {
                bpm = parseFloat(trimmed.split(':')[1].replace(',', '.')) || 120;
            } else if (trimmed.toUpperCase().startsWith('#GAP:')) {
                oldGap = parseFloat(trimmed.split(':')[1].replace(',', '.')) || 0;
            } else if (trimmed.match(/^[:*FRG]\s+(\d+)/)) {
                if (firstNoteStartBeat === null) {
                    const parts = trimmed.split(/\s+/);
                    firstNoteStartBeat = parseInt(parts[1], 10);
                }
            }
        }

        if (firstNoteStartBeat === null) {
            throw new Error("Could not find any notes in the .txt file.");
        }

        const msPerBeat = 60000 / (bpm * 4);
        const theoreticalStartMs = firstNoteStartBeat * msPerBeat;
        const newGap = Math.round(vocalsStartMs - theoreticalStartMs);
        
        job.log.push(`BPM: ${bpm}, First Note Beat: ${firstNoteStartBeat}`);
        job.log.push(`Theoretical First Note (at GAP=0): ${Math.round(theoreticalStartMs)} ms`);
        job.log.push(`Old GAP: ${oldGap} ms -> New GAP: ${newGap} ms`);
        job.progress = 90;

        let newLines = [];
        let gapUpdated = false;
        for (const line of lines) {
            if (line.trim().toUpperCase().startsWith('#GAP:')) {
                newLines.push(`#GAP:${newGap}`);
                gapUpdated = true;
            } else {
                newLines.push(line);
            }
        }

        if (!gapUpdated) {
            let insertIdx = newLines.findIndex(l => l.trim().toUpperCase().startsWith('#BPM:'));
            if (insertIdx === -1) insertIdx = 0;
            newLines.splice(insertIdx + 1, 0, `#GAP:${newGap}`);
        }

        fs.writeFileSync(txtPath, newLines.join('\n'), 'utf-8');
        job.log.push(`Successfully updated song GAP to ${newGap} ms!`);

        job.progress = 100;
        job.status = 'done';
        
        try {
            if (txtPath && fs.existsSync(txtPath)) {
                await addOrUpdateSongInCache(txtPath);
            }
        } catch (e) { /* ignore */ }

        setTimeout(scanSongs, 1000);
    } catch (err) {
        job.status = 'error';
        job.error = err.message;
        job.log.push(`❌ ${err.message}`);
    }
}

async function runFullSyncJob(job) {
    try {
        job.status = 'running';
        const { songId, songDir, audioFile, txtFile, safeName } = job;
        
        job.log.push(`Full AI Syncing ${safeName}...`);
        job.progress = 5;

        const txtPath = txtFile ? path.join(songDir, txtFile) : null;
        if (!txtPath || !fs.existsSync(txtPath)) {
            throw new Error(`Text file not found: ${txtPath}`);
        }

        const audioPath = path.join(songDir, audioFile);
        if (!fs.existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }

        // 1. Check for existing separated vocals file
        let vocalsFile = findVocalsFile(songDir, txtPath, job.vocalsFile);
        let targetAudioPath = null;

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
        
        await new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '..', 'scripts', 'align_lyrics.py');
            const cmd = spawn('python3', [scriptPath, txtPath, targetAudioPath]);

            cmd.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        job.log.push(line.trim());
                        if (line.includes('Whisper transcribed')) job.progress = 70;
                        if (line.includes('matched')) job.progress = 85;
                    }
                }
            });

            cmd.stderr.on('data', (data) => {
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

        job.log.push("Successfully aligned lyrics!");
        job.progress = 100;
        job.status = 'done';
        
        try {
            if (txtPath && fs.existsSync(txtPath)) {
                await addOrUpdateSongInCache(txtPath);
            }
        } catch (e) { /* ignore */ }

        setTimeout(scanSongs, 1000);
    } catch (err) {
        job.status = 'error';
        job.error = err.message;
        job.log.push(`❌ ${err.message}`);
    }
}

module.exports = {
    SEPARATOR_JOBS,
    separatorQueue,
    runSeparatorJob,
    processSeparatorQueue,
    checkIsInstalled,
    findVocalsFile,
    runAutoSyncJob,
    runFullSyncJob
};
