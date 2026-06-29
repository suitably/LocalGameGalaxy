const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');
const { getLocalIp } = require('../utils/helpers');
const { getSongCache, isScanning, scanSongs } = require('../services/scanner');
const { usdbLogin, searchUsdb, setUsdbSessionCookie } = require('../services/usdb');
const { DOWNLOAD_JOBS, jobQueue, processJobQueue } = require('../services/download');
const { SEPARATOR_JOBS, separatorQueue, processSeparatorQueue, checkIsInstalled } = require('../services/separator');
const multer = require('multer');

const router = express.Router();
const playlistsRouter = require('./playlists');

// --- PLAYLISTS ROUTER ---
router.use('/api/playlists', playlistsRouter);

const resolveSecurePath = (userPath) => {
    if (!userPath) return null;
    const safePath = path.normalize(userPath);
    const isAllowed = config.directories.some(dir => safePath.startsWith(path.normalize(dir)));
    return isAllowed && fs.existsSync(safePath) ? safePath : null;
};

const videoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const songId = req.params.id;
        const song = getSongCache().find(s => s.id === songId);
        if (!song || !song.txtPath) return cb(new Error('Song not found'));
        const songDir = path.dirname(song.txtPath);
        const safeFolder = resolveSecurePath(songDir);
        if (!safeFolder) return cb(new Error('Access denied'));
        cb(null, safeFolder);
    },
    filename: function (req, file, cb) {
        const songId = req.params.id;
        const song = getSongCache().find(s => s.id === songId);
        const txtFilename = path.basename(song.txtPath);
        const safeName = txtFilename.substring(0, txtFilename.lastIndexOf('.'));
        const ext = path.extname(file.originalname) || '.mp4';
        cb(null, `${safeName}${ext}`);
    }
});
const videoUpload = multer({ storage: videoStorage });

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
router.get('/media', async (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Missing path');

    // Check if targetPath is a remote web URL
    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
        try {
            const { spawnYtDlp, ensureYtDlp } = require('../services/download');
            // Create a mock job to pass to ensureYtDlp
            const mockJob = { log: [] };
            const ytBin = await ensureYtDlp(mockJob);
            
            // Resolve direct stream URL using yt-dlp
            // Format: bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best to make sure browser can play it
            const directUrl = await spawnYtDlp(ytBin, [
                '-g',
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                targetPath
            ]);
            
            const resolvedUrl = directUrl.trim().split('\n')[0];
            if (resolvedUrl && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))) {
                return res.redirect(resolvedUrl);
            } else {
                throw new Error('Invalid resolved stream URL: ' + resolvedUrl);
            }
        } catch (e) {
            console.error('[Media] Failed to resolve stream URL:', e.message);
            return res.status(500).send('Failed to resolve stream URL: ' + e.message);
        }
    }

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

// --- DELETE SONG ---
router.delete('/api/songs/:id', (req, res) => {
    const songId = req.params.id;
    const song = getSongCache().find(s => s.id === songId);
    if (!song) return res.status(404).json({ error: 'Song not found in cache' });
    if (!song.txtPath) return res.status(400).json({ error: 'Song does not have a text path' });

    const songFolder = path.dirname(song.txtPath);
    const safeFolder = resolveSecurePath(songFolder);
    if (!safeFolder) {
        return res.status(403).json({ error: 'Access denied or song directory not found' });
    }

    try {
        const isRootConfigDir = config.directories.some(dir => path.normalize(dir) === safeFolder);
        if (isRootConfigDir) {
            // Root config directory - delete individual files to avoid deleting the library root folder
            if (fs.existsSync(song.txtPath)) fs.unlinkSync(song.txtPath);
            if (song.audio && fs.existsSync(song.audio)) fs.unlinkSync(song.audio);
            if (song.video && fs.existsSync(song.video)) fs.unlinkSync(song.video);
            if (song.cover && fs.existsSync(song.cover)) fs.unlinkSync(song.cover);
            if (song.background && fs.existsSync(song.background)) fs.unlinkSync(song.background);
        } else {
            // Delete the full song directory
            fs.rmSync(safeFolder, { recursive: true, force: true });
        }

        scanSongs();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete song: ' + e.message });
    }
});

// --- UPDATE SONG TXT ---
router.put('/api/songs/:id/txt', (req, res) => {
    const songId = req.params.id;
    const { txtContent } = req.body;
    if (!txtContent) return res.status(400).json({ error: 'Missing txtContent' });

    const song = getSongCache().find(s => s.id === songId);
    if (!song) return res.status(404).json({ error: 'Song not found in cache' });
    if (!song.txtPath) return res.status(400).json({ error: 'Song does not have a text path' });

    const safePath = resolveSecurePath(song.txtPath);
    if (!safePath) {
        return res.status(403).json({ error: 'Access denied or song file not found' });
    }

    try {
        fs.writeFileSync(safePath, txtContent, 'utf-8');
        scanSongs();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save song file: ' + e.message });
    }
});

// --- UPDATE SONG VIDEO ---
router.post('/api/songs/:id/video', videoUpload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
    
    const songId = req.params.id;
    const song = getSongCache().find(s => s.id === songId);
    if (!song || !song.txtPath) return res.status(404).json({ error: 'Song not found' });
    
    const safePath = resolveSecurePath(song.txtPath);
    if (!safePath) return res.status(403).json({ error: 'Access denied' });

    try {
        let txtContent = fs.readFileSync(safePath, 'utf-8');
        let lines = txtContent.split('\n');
        
        // Remove existing #VIDEO
        lines = lines.filter(l => !l.match(/^#VIDEO:/i));
        
        // Find MP3 line or TITLE to insert after
        let insertIdx = lines.findIndex(l => l.match(/^#MP3:/i));
        if (insertIdx === -1) insertIdx = lines.findIndex(l => l.match(/^#TITLE:/i));
        if (insertIdx === -1) insertIdx = 0;
        
        const videoFilename = req.file.filename;
        lines.splice(insertIdx + 1, 0, `#VIDEO:${videoFilename}`);
        
        fs.writeFileSync(safePath, lines.join('\n'), 'utf-8');
        scanSongs();
        res.json({ success: true, video: videoFilename });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update song video: ' + e.message });
    }
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
    const { q, title, artist, edition, language, genre, year, creator,
            limit, order, direction, golden, sc, offset } = req.query;
            
    try {
        if (q) {
            const queryStr = q.trim();
            if (queryStr.includes('-')) {
                const parts = queryStr.split('-');
                const pArtist = parts[0].trim();
                const pTitle = parts.slice(1).join('-').trim();
                const results = await searchUsdb({ artist: pArtist, title: pTitle, limit, offset });
                return res.json(results);
            } else {
                const [artistResults, titleResults] = await Promise.all([
                    searchUsdb({ artist: queryStr, limit, offset }),
                    searchUsdb({ title: queryStr, limit, offset })
                ]);
                const merged = [...artistResults.songs, ...titleResults.songs];
                const uniqueSongs = Array.from(new Map(merged.map(s => [s.usdbId, s])).values());
                return res.json({ 
                    songs: uniqueSongs, 
                    totalResults: uniqueSongs.length, 
                    totalPages: 1 
                });
            }
        }

        if (!title && !artist && !edition && !language && !genre && !year && !creator && golden !== '1' && sc !== '1') {
            return res.json([]);
        }
        
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
        const { usdbId, artist, title, videoMode, youtubeUrl, targetDir, safeName } = reqItem;
        if (!artist || !title) continue;
        const mode = ['mp4', 'stream', 'none'].includes(videoMode) ? videoMode : 'none';
        const jobId = crypto.randomBytes(8).toString('hex');
        const job = {
            jobId,
            usdbId: usdbId || null,
            artist,
            title,
            videoMode: mode,
            youtubeUrl: youtubeUrl || null,
            targetDir: targetDir || null,
            safeName: safeName || null,
            status: 'pending',
            progress: 0,
            log: [],
            error: null
        };
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

// --- SEPARATOR JOBS ---
router.get('/api/separator/status', async (req, res) => {
    const isInstalled = await checkIsInstalled();
    res.json({ installed: isInstalled });
});

router.post('/api/separator/install', async (req, res) => {
    const isInstalled = await checkIsInstalled();
    if (isInstalled) return res.json({ success: true, message: 'Already installed' });
    
    const jobId = crypto.randomBytes(8).toString('hex');
    const job = {
        jobId,
        type: 'install',
        status: 'pending',
        progress: 0,
        log: [],
        error: null
    };
    SEPARATOR_JOBS.set(jobId, job);
    separatorQueue.push(job);
    processSeparatorQueue();
    res.json({ jobId });
});

router.get('/api/separator/jobs', (req, res) => {
    const jobsList = Array.from(SEPARATOR_JOBS.values()).map(j => ({
        jobId: j.jobId,
        type: j.type,
        status: j.status,
        progress: j.progress,
        error: j.error,
        log: j.log,
        safeName: j.safeName
    }));
    res.json(jobsList);
});

router.get('/api/separator/status/:jobId', (req, res) => {
    const job = SEPARATOR_JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ status: job.status, progress: job.progress, log: job.log.slice(-30), error: job.error });
});

router.post('/api/separator/job', (req, res) => {
    let requests = req.body;
    if (!Array.isArray(requests)) {
        requests = [requests];
    }
    
    const jobIds = [];
    for (const reqItem of requests) {
        const { songId, songDir, audioFile, txtFile, safeName } = reqItem;
        if (!songId || !songDir || !audioFile) continue;
        
        const jobId = crypto.randomBytes(8).toString('hex');
        const job = {
            jobId,
            type: 'separate',
            songId,
            songDir,
            audioFile,
            txtFile,
            safeName,
            status: 'pending',
            progress: 0,
            log: [],
            error: null
        };
        SEPARATOR_JOBS.set(jobId, job);
        separatorQueue.push(job);
        jobIds.push(jobId);
    }
    
    if (jobIds.length === 0) return res.status(400).json({ error: 'No valid jobs provided' });
    
    processSeparatorQueue();
    res.json({ jobIds });
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

// --- API KEYS ---
router.get('/api/config/apikeys', (req, res) => {
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
    res.json(config.apiKeys);
});

router.post('/api/config/apikeys', (req, res) => {
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
    const { name } = req.body;
    const newKey = config.createApiKey(name);
    res.json(newKey);
});

router.delete('/api/config/apikeys/:id', (req, res) => {
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
    const success = config.deleteApiKey(req.params.id);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'API Key not found' });
    }
});

module.exports = router;
