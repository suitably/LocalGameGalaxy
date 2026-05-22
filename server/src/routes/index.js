const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');
const { getLocalIp } = require('../utils/helpers');
const { getSongCache, isScanning, scanSongs } = require('../services/scanner');
const { usdbLogin, searchUsdb, setUsdbSessionCookie } = require('../services/usdb');
const { DOWNLOAD_JOBS, jobQueue, processJobQueue } = require('../services/download');

const router = express.Router();

const resolveSecurePath = (userPath) => {
    if (!userPath) return null;
    const safePath = path.normalize(userPath);
    const isAllowed = config.directories.some(dir => safePath.startsWith(path.normalize(dir)));
    return isAllowed && fs.existsSync(safePath) ? safePath : null;
};

// --- UI ROUTE ---
router.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const PORT = config.port;
    const SSL_PORT = config.port + 1;
    const localIp = getLocalIp();
    const networkUrl = `https://${localIp}:${SSL_PORT}`;

    // SECURITY CHECK
    const remoteIp = req.socket.remoteAddress || req.connection.remoteAddress;
    const isLocal = remoteIp === '::1' || remoteIp === '127.0.0.1' || remoteIp === '::ffff:127.0.0.1';
    const clientToken = req.query.token;

    if (!isLocal && clientToken !== config.token) {
        try {
            const loginHtmlPath = path.join(__dirname, '..', '..', 'public', 'login.html');
            const loginHtml = fs.readFileSync(loginHtmlPath, 'utf-8');
            return res.send(loginHtml);
        } catch (e) {
            return res.status(500).send('Login template not found.');
        }
    }

    try {
        const indexHtmlPath = path.join(__dirname, '..', '..', 'public', 'index.html');
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');

        // Dynamic directory listing HTML
        const dirListHtml = config.directories.map(dir => `
            <li class="dir-item">
                <span class="dir-path">${dir}</span>
                <button class="danger" onclick="removeDir('${dir.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Remove</button>
            </li>
        `).join('');

        // Replace placeholders
        html = html
            .replace(/\{\{AUTH_TOKEN\}\}/g, config.token)
            .replace(/\{\{SONG_COUNT\}\}/g, getSongCache().length.toString())
            .replace(/\{\{DIRECTORIES\}\}/g, dirListHtml)
            .replace(/\{\{NETWORK_URL\}\}/g, networkUrl)
            .replace(/\{\{LOCAL_IP\}\}/g, localIp)
            .replace(/\{\{PORT\}\}/g, PORT.toString())
            .replace(/\{\{SCAN_DISABLED\}\}/g, isScanning() ? 'disabled' : '')
            .replace(/\{\{SCAN_TEXT\}\}/g, isScanning() ? 'Scanning Library...' : 'Rescan Library');

        res.send(html);
    } catch (e) {
        res.status(500).send('Index template not found: ' + e.message);
    }
});

// --- MEDIA STREAMING ---
router.get('/media', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Missing path');
    const safePath = resolveSecurePath(targetPath);
    if (!safePath) return res.status(403).send('Access Denied or File Not Found');
    
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.sendFile(safePath);
});

// --- SONGS LISTING ---
router.get('/api/songs', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10000;
    const search = (req.query.search || '').trim().toLowerCase();

    const toClientSong = (s) => {
        const secureUrl = (absPath) => {
            if (!absPath) return null;
            return '/media?path=' + encodeURIComponent(absPath) + '&token=' + config.token;
        };

        return {
            ...s,
            video: secureUrl(s.video),
            audio: secureUrl(s.audio),
            cover: secureUrl(s.cover),
            background: secureUrl(s.background)
        };
    };

    let results = getSongCache();
    if (search) results = results.filter(s => s.searchString.includes(search));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = results.slice(startIndex, endIndex).map(toClientSong);

    res.set('X-Total-Count', results.length);
    res.set('X-Page', page);
    res.set('X-Limit', limit);
    res.json(paginated);
});

// --- SCAN STATUS ---
router.get('/api/status', (req, res) => {
    res.json({
        scanning: isScanning(),
        count: getSongCache().length
    });
});

router.post('/api/songs/refresh', async (req, res) => {
    if (isScanning()) return res.status(409).send('Scan already in progress');
    scanSongs();
    res.send('Scan started');
});

// --- CONFIG DIRECTORIES ---
router.get('/api/config/directories', (req, res) => res.json(config.directories));
router.post('/api/config/directories', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath && fs.existsSync(newPath)) {
        config.addDirectory(newPath);
        scanSongs();
        res.json(config.directories);
    } else {
        res.status(400).json({ error: 'Invalid path' });
    }
});
router.delete('/api/config/directories', (req, res) => {
    config.removeDirectory(req.body.path);
    scanSongs();
    res.json(config.directories);
});

// --- DIRECTORY BROWSER ---
router.get('/api/browse', (req, res) => {
    const queryPath = req.query.path || require('os').homedir();
    try {
        if (!fs.existsSync(queryPath)) return res.status(404).json({ error: 'Path not found' });
        const entries = fs.readdirSync(queryPath, { withFileTypes: true });
        const dirs = entries
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);

        const parent = path.resolve(queryPath, '..');
        if (parent !== path.resolve(queryPath)) {
            dirs.unshift('..');
        }

        res.json({ current: path.resolve(queryPath), dirs: dirs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- USDB SEARCH ---
router.get('/api/usdb/search', async (req, res) => {
    const { title, artist, edition, language, genre, year, creator,
            limit, order, direction, golden, sc, offset } = req.query;
            
    if (!title && !artist && !edition && !language && !genre && !year && !creator && golden !== '1' && sc !== '1') {
        return res.json([]);
    }
    try {
        const results = await searchUsdb({ title, artist, edition, language, genre, year, creator, limit, order, direction, golden, sc, offset });
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- USDB DOWNLOAD ---
router.post('/api/usdb/download', (req, res) => {
    let requests = req.body;
    if (!Array.isArray(requests)) {
        requests = [requests];
    }
    
    const jobIds = [];
    for (const reqItem of requests) {
        const { usdbId, artist, title, videoMode } = reqItem;
        if (!usdbId || !artist || !title) continue;
        const mode = ['mp4', 'stream', 'none'].includes(videoMode) ? videoMode : 'none';
        const jobId = crypto.randomBytes(8).toString('hex');
        const job = { jobId, usdbId, artist, title, videoMode: mode, status: 'pending', progress: 0, log: [], error: null };
        DOWNLOAD_JOBS.set(jobId, job);
        jobQueue.push(job);
        jobIds.push(jobId);
    }
    
    if (jobIds.length === 0) return res.status(400).json({ error: 'No valid jobs provided' });
    
    processJobQueue();
    res.json({ jobIds });
});

// --- USDB JOBS ---
router.get('/api/usdb/jobs', (req, res) => {
    const jobsList = Array.from(DOWNLOAD_JOBS.values()).map(j => ({
        jobId: j.jobId,
        usdbId: j.usdbId,
        artist: j.artist,
        title: j.title,
        videoMode: j.videoMode,
        status: j.status,
        progress: j.progress,
        error: j.error,
        log: j.log
    }));
    res.json(jobsList);
});

router.get('/api/usdb/status/:jobId', (req, res) => {
    const job = DOWNLOAD_JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ status: job.status, progress: job.progress, log: job.log.slice(-30), error: job.error });
});

// --- CONFIG DOWNLOAD DIRECTORY ---
router.get('/api/config/download-dir', (req, res) => {
    res.json({ downloadDir: config.downloadDir || config.directories[0] || null });
});

router.post('/api/config/download-dir', (req, res) => {
    const { dir } = req.body;
    if (!dir || !fs.existsSync(dir)) return res.status(400).json({ error: 'Directory does not exist' });
    config.downloadDir = dir;
    res.json({ downloadDir: config.downloadDir });
});

// --- CONFIG USDB CREDENTIALS ---
router.get('/api/config/usdb-credentials', (req, res) => {
    res.json({ username: config.usdbUsername || '', hasPassword: !!config.usdbPassword });
});

router.post('/api/config/usdb-credentials', async (req, res) => {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    let finalPassword = password;
    if (password === '********' || !password) {
        finalPassword = config.usdbPassword;
    }

    try {
        const testCookie = await usdbLogin(username, finalPassword);
        setUsdbSessionCookie(testCookie);
        config.setUsdbCredentials(username, finalPassword);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
