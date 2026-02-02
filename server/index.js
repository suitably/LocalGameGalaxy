const express = require('express');
const cors = require('cors');
const glob = require('fast-glob');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const sanitize = require('sanitize-filename');
const config = require('./config');

// Dynamic import for music-metadata
let parseFile;
try {
    import('music-metadata').then(mm => {
        parseFile = mm.parseFile;
    });
} catch (e) {
    console.log('Using dynamic import for music-metadata');
}

const app = express();

// --- SECURITY MIDDLEWARE ---
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for local dev/inline scripts in our simple HTML
}));
app.use(cors()); // In production, restrict this to specific origins
app.use(express.json());
app.use(morgan('dev')); // Logging

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs (relaxed for local dev/media streaming)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// --- IN-MEMORY CACHE ---
let SONG_CACHE = [];
let IS_SCANNING = false;
let LAST_SCAN_TIME = null;

// Helper: Secure Path Resolution
const resolveSecurePath = (userPath) => {
    if (!userPath) return null;
    const safePath = path.normalize(userPath);
    // Ensure path is within one of the configured directories
    const isAllowed = config.directories.some(dir => safePath.startsWith(path.normalize(dir)));
    return isAllowed && fs.existsSync(safePath) ? safePath : null;
};

// --- CORE LOGIC: SCANNING ---
const scanSongs = async () => {
    if (IS_SCANNING) return;
    IS_SCANNING = true;
    console.log(`[Scanner] Starting scan of ${config.directories.length} directories...`);
    const startTime = Date.now();

    // Ensure parser is loaded
    if (!parseFile) {
        try {
            const mm = await import('music-metadata');
            parseFile = mm.parseFile;
        } catch (e) {
            console.error('[Scanner] Failed to load music-metadata:', e);
            IS_SCANNING = false;
            return;
        }
    }

    const newSongs = [];

    for (const libraryPath of config.directories) {
        try {
            const txtFiles = await glob('**/*.txt', {
                cwd: libraryPath,
                absolute: true,
                ignore: ['**/node_modules/**', '**/.*'],
                onlyFiles: true
            });

            for (const txtPath of txtFiles) {
                try {
                    const dir = path.dirname(txtPath);
                    const content = fs.readFileSync(txtPath, 'utf-8');
                    const headers = {};

                    content.split('\n').forEach(line => {
                        if (line.startsWith('#')) {
                            const parts = line.substring(1).split(':');
                            if (parts.length >= 2) {
                                const key = parts[0].trim().toUpperCase();
                                const value = parts.slice(1).join(':').trim();
                                headers[key] = value;
                            }
                        }
                    });

                    if (!headers['TITLE'] || !headers['ARTIST']) continue;

                    const getServeUrl = (filename) => {
                        if (!filename) return null;
                        const fullPath = path.join(dir, filename);
                        return `/media?path=${encodeURIComponent(fullPath)}`;
                    };

                    const song = {
                        id: Buffer.from(`${headers['ARTIST']}-${headers['TITLE']}-${dir}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32),
                        title: headers['TITLE'],
                        artist: headers['ARTIST'],
                        bpm: parseFloat(headers['BPM']?.replace(',', '.') || '0'),
                        gap: parseFloat(headers['GAP']?.replace(',', '.') || '0'),
                        edition: headers['EDITION'],
                        genre: headers['GENRE'],
                        language: headers['LANGUAGE'],
                        year: headers['YEAR'],
                        video: getServeUrl(headers['VIDEO']),
                        audio: getServeUrl(headers['MP3']),
                        cover: getServeUrl(headers['COVER']),
                        background: getServeUrl(headers['BACKGROUND']),
                        txtContent: content,
                        searchString: `${headers['TITLE']} ${headers['ARTIST']} ${headers['GENRE']} ${headers['LANGUAGE']}`.toLowerCase()
                    };

                    // Duration calc
                    if (headers['END']) {
                        song.duration = parseFloat(headers['END']) / 1000;
                    } else if (song.bpm > 0) {
                        // Estimate
                        let maxBeat = 0;
                        const lines = content.split('\n');
                        for (const line of lines) {
                            if (line.startsWith(':') || line.startsWith('*') || line.startsWith('F')) {
                                const parts = line.split(' ');
                                if (parts.length >= 3) {
                                    const start = parseInt(parts[1]);
                                    const len = parseInt(parts[2]);
                                    if (!isNaN(start) && !isNaN(len) && start + len > maxBeat) {
                                        maxBeat = start + len;
                                    }
                                }
                            }
                        }
                        song.duration = (maxBeat * 60) / song.bpm;
                    }

                    newSongs.push(song);
                } catch (e) { /* ignore individual file errors */ }
            }
        } catch (e) {
            console.warn(`[Scanner] Failed to scan ${libraryPath}:`, e.message);
        }
    }

    SONG_CACHE = newSongs;
    LAST_SCAN_TIME = new Date();
    IS_SCANNING = false;
    console.log(`[Scanner] Finished. Cached ${newSongs.length} songs in ${(Date.now() - startTime) / 1000}s.`);
};

// Initial Scan
scanSongs();


// --- ROUTES ---

// Status Page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Melodiq Helper</title>
            <style>
                body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 40px; background: #f5f5f5; color: #333; }
                .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; }
                h1 { color: #1976d2; }
                .badge { background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                button { cursor: pointer; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h1>Melodiq Helper</h1>
                    <span class="badge">Online</span>
                </div>
                <p>Songs Cached: <strong>${SONG_CACHE.length}</strong> (Last scan: ${LAST_SCAN_TIME ? LAST_SCAN_TIME.toLocaleTimeString() : 'Never'})</p>
                <form action="/api/songs/refresh" method="POST">
                   <button type="submit" ${IS_SCANNING ? 'disabled' : ''}>${IS_SCANNING ? 'Scanning...' : 'Refresh Library'}</button>
                </form>
            </div>
            <div class="card">
                 <h2>Useful Links</h2>
                 <ul>
                    <li><a href="/api/songs?limit=10">Test API (First 10 songs)</a></li>
                 </ul>
            </div>
        </body>
        </html>
    `);
});

// Secure Media Serving
app.get('/media', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Missing path');

    const safePath = resolveSecurePath(targetPath);
    if (!safePath) return res.status(403).send('Access Denied or File Not Found');

    res.sendFile(safePath);
});

// API: List Songs (with Pagination & Search)
app.get('/api/songs', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10000; // Default to High for backwards compat with Desktop
    const search = (req.query.search || '').trim().toLowerCase();

    let results = SONG_CACHE;

    // Filter
    if (search) {
        results = results.filter(s => s.searchString.includes(search));
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = results.slice(startIndex, endIndex);

    // If client requested pagination specifically (low limit) or simply for API correctness
    // We return the array directly if it seems legacy, OR we can determine via acceptance header?
    // User instruction said: "If no page is provided, it will return ALL songs... but for Mobile support, clients should use ?page=1"
    // To ensure existing client compatibility (which expects Array), we MUST return Array.
    // We can add metadata in headers X-Total-Count, X-Page, etc.

    res.set('X-Total-Count', results.length);
    res.set('X-Page', page);
    res.set('X-Limit', limit);

    res.json(paginated);
});

// API: Refresh
app.post('/api/songs/refresh', async (req, res) => {
    if (IS_SCANNING) return res.status(409).send('Scan already in progress');
    scanSongs(); // Async, don't wait
    res.send('Scan started');
});

// API: Config (Preserved)
app.get('/api/config/directories', (req, res) => res.json(config.directories));
app.post('/api/config/directories', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath && fs.existsSync(newPath)) {
        config.addDirectory(newPath);
        scanSongs(); // Trigger rescan
        res.json(config.directories);
    } else {
        res.status(400).json({ error: 'Invalid path' });
    }
});
app.delete('/api/config/directories', (req, res) => {
    config.removeDirectory(req.body.path);
    scanSongs();
    res.json(config.directories);
});

// Directory Browser DO NOT REMOVE (Needed for frontend)
app.get('/api/browse', (req, res) => {
    const queryPath = req.query.path || require('os').homedir();
    try {
        if (!fs.existsSync(queryPath)) return res.status(404).json({ error: 'Path not found' });
        const entries = fs.readdirSync(queryPath, { withFileTypes: true });
        const dirs = entries
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);
        const parent = path.dirname(queryPath);
        if (parent !== queryPath) dirs.unshift('..');
        res.json({ current: queryPath, dirs: dirs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(config.port, () => {
    console.log(`Melodiq Host running at http://localhost:${config.port}`);
});
