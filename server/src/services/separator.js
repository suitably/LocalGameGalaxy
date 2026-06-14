const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { scanSongs } = require('./scanner');

const SEPARATOR_JOBS = new Map();
const separatorQueue = [];
let isSeparatorRunning = false;

async function checkIsInstalled() {
    return new Promise((resolve) => {
        exec('audio-separator --version', (error) => {
            if (error) resolve(false);
            else resolve(true);
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

        job.log.push("Step 2/2: Installing audio-separator[cpu]...");
        await runPip([
            'install', 
            '--default-timeout=1000', 
            'audio-separator[cpu]'
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

async function runSeparatorJob(job) {
    try {
        job.status = 'running';
        
        if (job.type === 'install') {
            await runInstallJob(job);
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
            
            lines = lines.filter(l => !l.toLowerCase().startsWith('#mp3:') && !l.toLowerCase().startsWith('#vocals:'));
            
            let lastHeader = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#')) lastHeader = i;
            }
            
            lines.splice(lastHeader + 1, 0, `#MP3:${instrumentalFile}`);
            lines.splice(lastHeader + 2, 0, `#VOCALS:${vocalsFile}`);
            
            fs.writeFileSync(txtPath, lines.join('\n'), 'utf-8');
            job.log.push(".txt patched successfully.");
        }
        
        job.progress = 100;
        job.status = 'done';
        
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

module.exports = {
    SEPARATOR_JOBS,
    separatorQueue,
    runSeparatorJob,
    processSeparatorQueue,
    checkIsInstalled
};
