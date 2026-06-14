const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const config = require('../../config');
const { sanitizeFilename } = require('../utils/helpers');
const { getUsdbCookie, fetchUsdbTxt } = require('./usdb');
const { scanSongs } = require('./scanner');

const DOWNLOAD_JOBS = new Map();
const jobQueue = [];
let isQueueRunning = false;

function findYtDlpBin() {
    const candidates = [
        'yt-dlp',
        path.join(__dirname, '..', '..', 'yt-dlp'), // resolved relative to packaged app
        path.join(process.cwd(), 'yt-dlp'),
        '/tmp/yt-dlp',
        '/usr/local/bin/yt-dlp',
        `${process.env.HOME || '/root'}/.local/bin/yt-dlp`,
        `${process.env.HOME || '/root'}/.npm-global/bin/yt-dlp`,
    ];
    for (const bin of candidates) {
        try { execFileSync(bin, ['--version'], { stdio: 'pipe', timeout: 4000 }); return bin; }
        catch (_) { /* not found here */ }
    }
    return null;
}

function downloadYtDlpFile(dest, url) {
    return new Promise((resolve) => {
        const curl = spawn('curl', ['-L', url, '-o', dest]);
        curl.on('close', code => {
            if (code === 0) {
                try { fs.chmodSync(dest, 0o755); resolve(true); } catch (_) { resolve(false); }
            } else {
                const wget = spawn('wget', [url, '-O', dest]);
                wget.on('close', codeW => {
                    if (codeW === 0) {
                        try { fs.chmodSync(dest, 0o755); resolve(true); } catch (_) { resolve(false); }
                    } else {
                        resolve(false);
                    }
                });
                wget.on('error', () => resolve(false));
            }
        });
        curl.on('error', () => {
            const wget = spawn('wget', [url, '-O', dest]);
            wget.on('close', codeW => {
                if (codeW === 0) {
                    try { fs.chmodSync(dest, 0o755); resolve(true); } catch (_) { resolve(false); }
                } else {
                    resolve(false);
                }
            });
            wget.on('error', () => resolve(false));
        });
    });
}

function installYtDlp(job) {
    return new Promise((resolve) => {
        job.log.push('Attempting to install yt-dlp via pip3...');
        const proc = spawn('pip3', ['install', '--user', '--break-system-packages', '--quiet', 'yt-dlp'], { stdio: 'pipe' });
        proc.on('close', async (code) => {
            if (code === 0) {
                const bin = findYtDlpBin();
                if (bin) return resolve(true);
            }
            
            job.log.push('pip3 installation failed. Downloading yt-dlp binary from GitHub...');
            const destPaths = [
                path.join(__dirname, '..', '..', 'yt-dlp'),
                path.join(process.cwd(), 'yt-dlp'),
                '/tmp/yt-dlp'
            ];
            const urls = [
                'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
                'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
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
                        } catch (e) {
                            try { fs.unlinkSync(dest); } catch (_) {}
                        }
                    }
                }
            }
            resolve(false);
        });
        proc.on('error', async () => {
            job.log.push('pip3 not available. Downloading yt-dlp binary from GitHub...');
            const destPaths = [
                path.join(__dirname, '..', '..', 'yt-dlp'),
                path.join(process.cwd(), 'yt-dlp'),
                '/tmp/yt-dlp'
            ];
            const urls = [
                'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
                'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
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
                        } catch (e) {
                            try { fs.unlinkSync(dest); } catch (_) {}
                        }
                    }
                }
            }
            resolve(false);
        });
    });
}

async function ensureYtDlp(job) {
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

function spawnYtDlp(bin, args, onLine) {
    return new Promise((resolve, reject) => {
        const proc = spawn(bin, args, { stdio: 'pipe' });
        let stdout = '';
        let stderr = '';
        const handleStdout = d => {
            const s = d.toString();
            stdout += s;
            if (onLine) s.split('\n').filter(l => l.trim()).forEach(l => onLine(l));
        };
        const handleStderr = d => {
            const s = d.toString();
            stderr += s;
            if (onLine) s.split('\n').filter(l => l.trim()).forEach(l => onLine(l));
        };
        proc.stdout.on('data', handleStdout);
        proc.stderr.on('data', handleStderr);
        proc.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`yt-dlp exit ${code}: ${(stderr || stdout).slice(-300)}`)));
        proc.on('error', reject);
    });
}

async function runDownloadJob(job) {
    try {
        job.status = 'running';
        const { usdbId, artist, title, videoMode, youtubeUrl, targetDir, safeName: jobSafeName } = job;

        // 1. Ensure yt-dlp is available
        const ytBin = await ensureYtDlp(job);

        // 2. Prepare output folder
        const dlBase = config.downloadDir || (config.directories[0] || process.cwd());
        const safeName = jobSafeName || `${sanitizeFilename(artist)} - ${sanitizeFilename(title)}`;
        const songDir  = targetDir || path.join(dlBase, safeName);
        fs.mkdirSync(songDir, { recursive: true });
        job.log.push(`📁 Folder: ${songDir}`);

        // 3. Fetch .txt from USDB or recover existing local one
        let txtContent = null;
        const txtPath = path.join(songDir, `${safeName}.txt`);
        if (fs.existsSync(txtPath)) {
            job.log.push('📄 Using existing local .txt file...');
            try {
                txtContent = fs.readFileSync(txtPath, 'utf-8');
            } catch (err) {
                job.log.push(`⚠️ Failed to read existing .txt: ${err.message}`);
            }
        }

        if (!txtContent && usdbId && config.usdbUsername && config.usdbPassword) {
            job.log.push('🔐 Logging in to USDB...');
            try {
                const cookie = await getUsdbCookie();
                job.log.push('📄 Downloading lyrics (.txt)...');
                txtContent = await fetchUsdbTxt(usdbId, cookie);
            } catch (e) {
                job.log.push('Session expired or error – re-logging in...');
                try {
                    const cookie = await getUsdbCookie(true);
                    txtContent = await fetchUsdbTxt(usdbId, cookie);
                } catch (err) {
                    throw new Error(`Failed to fetch lyrics: ${err.message}`);
                }
            }
        } else if (!txtContent) {
            job.log.push('⚠️ No USDB credentials / USDB ID – generating minimal .txt.');
        }
        job.progress = 15;

        // 4. Download audio and thumbnail via yt-dlp
        const audioOut = path.join(songDir, `${safeName}.mp3`);
        job.log.push('🎵 Downloading audio and cover...');
        const audioSource = youtubeUrl || `ytsearch1:${artist} ${title} audio`;
        await spawnYtDlp(ytBin, [
            '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
            '--write-thumbnail', '--convert-thumbnails', 'jpg',
            '-o', audioOut, '--no-playlist',
            audioSource
        ], l => job.log.push(l));
        
        // Rename cover thumbnail to a clean name (safeName-cover.jpg)
        const defaultThumb = `${audioOut}.jpg`;
        const targetCover = path.join(songDir, `${safeName}-cover.jpg`);
        if (fs.existsSync(defaultThumb)) {
            try { fs.renameSync(defaultThumb, targetCover); } catch (_) {}
        } else {
            const possibleThumbExts = ['.png', '.jpeg', '.webp'];
            for (const ext of possibleThumbExts) {
                const thumbPath = `${audioOut}${ext}`;
                if (fs.existsSync(thumbPath)) {
                    try { fs.renameSync(thumbPath, targetCover); } catch (_) {}
                    break;
                }
            }
        }

        job.progress = 55;
        job.log.push('✅ Audio and cover done.');

        // 5. Video handling
        let videoHeaderValue = '';
        if (videoMode === 'mp4') {
            const videoOut = path.join(songDir, `${safeName}.mp4`);
            job.log.push('🎬 Downloading video (MP4)...');
            const videoSource = youtubeUrl || `ytsearch1:${artist} ${title}`;
            await spawnYtDlp(ytBin, [
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '-o', videoOut, '--no-playlist',
                videoSource
            ], l => job.log.push(l));
            videoHeaderValue = `${safeName}.mp4`;
            job.log.push('✅ Video done.');
        } else if (videoMode === 'stream') {
            if (youtubeUrl) {
                videoHeaderValue = youtubeUrl;
                job.log.push(`📡 Stream URL: ${videoHeaderValue}`);
            } else {
                job.log.push('📡 Resolving YouTube URL...');
                const ytOut = await spawnYtDlp(ytBin, [
                    '--print', 'webpage_url', '--no-playlist',
                    `ytsearch1:${artist} ${title}`
                ]);
                videoHeaderValue = ytOut.trim().split('\n')[0];
                job.log.push(`📡 Stream URL: ${videoHeaderValue}`);
            }
        }
        job.progress = 85;

        // 6. Write .txt file
        if (txtContent && (txtContent.includes('#TITLE') || txtContent.includes('#ARTIST'))) {
            // Patch downloaded .txt: update MP3/VIDEO/COVER headers, remove unused BACKGROUND
            let lines = txtContent.split('\n');
            lines = lines.filter(l => !l.match(/^#MP3:/i) && !l.match(/^#VIDEO:/i) && !l.match(/^#COVER:/i) && !l.match(/^#BACKGROUND:/i));
            
            const lastHeaderIdx = lines.reduce((acc, l, i) => l.startsWith('#') ? i : acc, 0);
            lines.splice(lastHeaderIdx + 1, 0, `#MP3:${safeName}.mp3`);
            
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
            const lines = [
                `#TITLE:${title}`,
                `#ARTIST:${artist}`,
                `#MP3:${safeName}.mp3`,
                videoHeaderValue ? `#VIDEO:${videoHeaderValue}` : null,
                fs.existsSync(targetCover) ? `#COVER:${safeName}-cover.jpg` : null,
                `#BPM:200`,
                `#GAP:0`,
                `E`
            ].filter(Boolean);
            fs.writeFileSync(txtPath, lines.join('\n'), 'utf-8');
        }
        job.log.push('✅ .txt written.');
        job.progress = 100;
        job.status = 'done';
        job.log.push(`🎉 Saved to: ${songDir}`);

        // Auto-rescan library
        setTimeout(scanSongs, 1000);
    } catch (err) {
        job.status = 'error';
        job.error = err.message;
        job.log.push(`❌ ${err.message}`);
    }
}

async function processJobQueue() {
    if (isQueueRunning || jobQueue.length === 0) return;
    isQueueRunning = true;
    while (jobQueue.length > 0) {
        const job = jobQueue.shift();
        try {
            await runDownloadJob(job);
        } catch (e) {
            console.error('Job failed:', e);
        }
    }
    isQueueRunning = false;
}

module.exports = {
    DOWNLOAD_JOBS,
    jobQueue,
    runDownloadJob,
    processJobQueue,
    spawnYtDlp,
    ensureYtDlp
};
