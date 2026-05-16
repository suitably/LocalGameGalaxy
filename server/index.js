const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { glob } = require('fast-glob');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const forge = require('node-forge');
const config = require('./config');

// Music Metadata
const mm = require('music-metadata');

// Ensure TextEncoder/btoa are available (Node 18+)
if (typeof TextEncoder === 'undefined') {
    const { TextEncoder } = require('util');
    global.TextEncoder = TextEncoder;
}
if (typeof btoa === 'undefined') {
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

const app = express();

// --- CONFIG ---
const PORT = config.port;
const SSL_PORT = config.port + 1;

// --- AUTH TOKEN ---
const AUTH_TOKEN = config.token;

// Middleware
const requireAuth = (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    if (req.path === '/' || req.path === '/favicon.ico' || req.path === '/api/browse') {
        return next();
    }
    const token = req.headers['authorization'] || req.query.token;
    const cleanToken = token?.replace('Bearer ', '');

    if (token === AUTH_TOKEN || cleanToken === AUTH_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Invalid Token.' });
    }
};

const helmetMiddleware = helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity: false
});

app.use((req, res, next) => {
    if (req.path === '/media') {
        // Skip helmet for media to prevent strict ORB/CORP issues in Firefox
        return next();
    }
    helmetMiddleware(req, res, next);
});

// --- CORS ORIGIN ALLOWLIST ---
// Configurable via environment variable ALLOWED_ORIGINS (comma-separated).
// Example: ALLOWED_ORIGINS=https://nexumia.de,https://www.nexumia.de
// If not set, all origins are allowed (open mode for simple local setups).
const ENV_ORIGINS = process.env.ALLOWED_ORIGINS;
const RESTRICT_ORIGINS = !!ENV_ORIGINS;
const ALLOWED_ORIGINS = RESTRICT_ORIGINS
    ? [
        ...ENV_ORIGINS.split(',').map(o => o.trim()).filter(Boolean),
        'http://localhost',   // Always allow local dev
        'http://127.0.0.1',  // Always allow local dev
      ]
    : [];

if (RESTRICT_ORIGINS) {
    console.log(`[CORS] Restricted mode. Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
} else {
    console.log('[CORS] Open mode (no ALLOWED_ORIGINS set). All origins permitted.');
}

const isOriginAllowed = (origin) => {
    if (!origin) return true;  // No origin = direct access (curl, browser nav), handled by token auth
    if (!RESTRICT_ORIGINS) return true; // Open mode: allow everything
    return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed + ':'));
};

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // If origin is present but NOT allowed: no CORS headers → browser blocks the response.

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Limit');

    if (req.method === 'OPTIONS') {
        // Only send 200 for allowed origins, otherwise 403
        if (origin && !isOriginAllowed(origin)) {
            return res.sendStatus(403);
        }
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});

if (!config.disableRateLimit) {
    app.use('/api', limiter);
}
app.use(requireAuth);

let SONG_CACHE = [];
let IS_SCANNING = false;

const resolveSecurePath = (userPath) => {
    if (!userPath) return null;
    const safePath = path.normalize(userPath);
    const isAllowed = config.directories.some(dir => safePath.startsWith(path.normalize(dir)));
    return isAllowed && fs.existsSync(safePath) ? safePath : null;
};

// ID Generation (Matches Client Logic)
const generateId = (title, artist, relPath) => {
    // Ensure forward slashes for consistency with Client
    const normalizedPath = relPath.replace(/\\/g, '/');
    const str = `${artist}-${title}-${normalizedPath}`;

    // Node.js implementation of Client logic
    // Client: const bytes = new TextEncoder().encode(str); return btoa(String.fromCharCode(...))...
    // Node Buffer is equivalent to UTF-8 encode
    return Buffer.from(str, 'utf-8').toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

// --- SCANNING ---
const scanSongs = async () => {
    if (IS_SCANNING) return;
    IS_SCANNING = true;
    console.log(`[Scanner] Starting scan of ${config.directories.length} directories...`);
    const startTime = Date.now();

    const newSongs = [];

    if (!config.directories || !Array.isArray(config.directories)) {
        console.warn('[Scanner] config.directories is missing or invalid.');
        SONG_CACHE = [];
        IS_SCANNING = false;
        return;
    }

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

                    // Calculate relative path from library root to match Client ID generation
                    // If libraryPath is /Music and dir is /Music/Artist/Song, relative is Artist/Song
                    let relativePath = path.relative(libraryPath, dir);
                    if (relativePath === '') relativePath = '.'; // Handle root match

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

                    if (!headers['TITLE'] || !headers['ARTIST']) {
                        console.warn(`[Scanner] Skipping ${path.basename(txtPath)}: Missing TITLE or ARTIST header.`);
                        continue;
                    }

                    const getServeUrl = (filename) => {
                        if (!filename) return null;
                        const floatPath = path.resolve(dir, filename);
                        if (fs.existsSync(floatPath)) return floatPath;
                        return null;
                    };

                    const audioPath = getServeUrl(headers['MP3']);
                    const videoPath = getServeUrl(headers['VIDEO']);
                    const coverPath = getServeUrl(headers['COVER']);
                    const backgroundPath = getServeUrl(headers['BACKGROUND']);

                    // DURATION CALCULATION
                    let duration = 0;
                    if (audioPath) {
                        try {
                            const metadata = await mm.parseFile(audioPath, { duration: true, skipCovers: true });
                            if (metadata.format.duration) {
                                duration = metadata.format.duration;
                            }
                        } catch (e) {
                            console.warn(`[Scanner] Failed to read duration for ${audioPath}:`, e.message);
                        }
                    }

                    // Fallback Duration
                    if (!duration && headers['END']) {
                        duration = parseFloat(headers['END']) / 1000;
                    }

                    const song = {
                        id: generateId(headers['TITLE'], headers['ARTIST'], relativePath),
                        title: headers['TITLE'],
                        artist: headers['ARTIST'],
                        bpm: parseFloat(headers['BPM']?.replace(',', '.') || '0'),
                        gap: parseFloat(headers['GAP']?.replace(',', '.') || '0'),
                        edition: headers['EDITION'],
                        genre: headers['GENRE'],
                        language: headers['LANGUAGE'],
                        year: headers['YEAR'],
                        video: videoPath,
                        audio: audioPath,
                        cover: coverPath,
                        background: backgroundPath,
                        txtContent: content,
                        duration: duration,
                        searchString: `${headers['TITLE']} ${headers['ARTIST']} ${headers['GENRE']} ${headers['LANGUAGE']}`.toLowerCase()
                    };

                    newSongs.push(song);
                } catch (e) { /* ignore */ }
            }
        } catch (e) {
            console.warn(`[Scanner] Failed to scan ${libraryPath}:`, e.message);
        }
    }

    if (newSongs.length === 0) {
        console.warn(`[Scanner] No songs found in any of the directories.`);
        if (config.directories.length > 0) {
            console.log(`[Scanner] Checked directories: ${config.directories.join(', ')}`);
        } else {
            console.warn(`[Scanner] No directories configured.`);
        }
    }

    SONG_CACHE = newSongs;
    IS_SCANNING = false;
    console.log(`[Scanner] Finished. Cached ${newSongs.length} songs in ${(Date.now() - startTime) / 1000}s.`);
};

// Initial Scan
scanSongs();

const getLocalIp = () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};

// --- UI ROUTE ---
app.get('/', (req, res) => {
    // Disable caching for the main page
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const localIp = getLocalIp();
    const networkUrl = `https://${localIp}:${SSL_PORT}`;

    // Note: Concatenated string to avoid template tag issues with tools

    // SECURITY CHECK
    // Allow localhost automatically. Remote IPs must provide ?token=...
    const remoteIp = req.socket.remoteAddress || req.connection.remoteAddress;
    const isLocal = remoteIp === '::1' || remoteIp === '127.0.0.1' || remoteIp === '::ffff:127.0.0.1';
    const clientToken = req.query.token;

    if (!isLocal && clientToken !== AUTH_TOKEN) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Melodiq Helper Login</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f2f5; }
                    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 320px; }
                    input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
                    button { width: 100%; padding: 10px; background: #1877f2; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
                    button:hover { background: #166fe5; }
                    h2 { color: #1c1e21; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2 style="margin-top:0; text-align:center;">Melodiq Access</h2>
                    <form method="GET" action="/">
                        <input type="text" name="token" placeholder="Enter Access Token" required>
                        <button type="submit">Connect</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Melodiq Helper</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f0f2f5; color: #1c1e21; }
                .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 24px; }
                h1 { color: #1877f2; margin-top: 0; font-size: 1.5rem; }
                .badge { background: #e7f3ff; color: #1877f2; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; vertical-align: middle; }
                button { cursor: pointer; padding: 10px 16px; background: #1877f2; color: white; border: none; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
                button:hover { background: #166fe5; }
                button:disabled { background: #ccc; cursor: not-allowed; }
                button.secondary { background: #e4e6eb; color: #050505; }
                button.secondary:hover { background: #d8dadf; }
                button.danger { background: #fff; color: #dc3545; border: 1px solid #dc3545; padding: 4px 10px; font-size: 0.9rem; }
                button.danger:hover { background: #dc3545; color: white; }
                
                .code-box { background: #242526; color: #4cd964; padding: 16px; font-family: 'SF Mono', Consolas, monospace; font-size: 1.1rem; border-radius: 8px; overflow-x: auto; margin: 10px 0; border: 1px solid #3e4042; }
                .label { font-size: 0.9rem; font-weight: 600; color: #65676b; margin-bottom: 8px; display: block; }
                .row { display: flex; gap: 10px; align-items: stretch; }
                
                .dir-list { list-style: none; padding: 0; margin: 0; }
                .dir-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f7f8fa; border-radius: 6px; margin-bottom: 8px; }
                .dir-path { font-family: monospace; word-break: break-all; font-size: 0.9rem; }
                
                input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }

                a { color: #1877f2; text-decoration: none; }
                a:hover { text-decoration: underline; }

                .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
                .modal-content { background: white; width: 90%; max-width: 500px; margin: 50px auto; padding: 20px; border-radius: 12px; height: 70vh; display: flex; flex-direction: column; }
                .browser-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                .browser-list { overflow-y: auto; flex: 1; border: 1px solid #ddd; border-radius: 4px; }
                .browser-item { padding: 10px; border-bottom: 1px solid #f0f0f0; cursor: pointer; display: flex; align-items: center; gap: 10px; }
                .browser-item:hover { background: #f5f5f5; }
                .browser-item.selected { background: #e7f3ff; }
                .folder-icon { color: #ffd700; width: 20px; display: inline-block; }
            </style>
            <script>
                const API_TOKEN = "${AUTH_TOKEN}";

                document.addEventListener('DOMContentLoaded', () => {
                    const hostname = window.location.hostname;
                    // Detect if hostname is an IP address or localhost
                    const isIP = /^[0-9\.]+$/.test(hostname) || hostname.includes(':') || hostname.includes('[');
                    const isLocalhost = hostname === 'localhost';

                    if (!isIP && !isLocalhost) {
                        // Accessed via domain name (likely reverse proxy with valid cert)
                        const urlDisplay = document.getElementById('urlDisplay');
                        if (urlDisplay) {
                            urlDisplay.innerText = window.location.origin;
                        }
                        
                        const warningBox = document.getElementById('tv-connection-warning');
                        if (warningBox) {
                            warningBox.style.display = 'none';
                        }
                    }
                });

                function copyText(id) {
                    const el = document.getElementById(id);
                    navigator.clipboard.writeText(el.innerText).then(() => {
                        const btn = document.getElementById('btn-' + id);
                        const original = btn.innerText;
                        btn.innerText = 'Copied!';
                        setTimeout(() => btn.innerText = original, 2000);
                    });
                }

                async function addDir() {
                    const input = document.getElementById('newPath');
                    const path = input.value.trim();
                    if (!path) return;
                    
                    try {
                         const res = await fetch('/api/config/directories?token=' + API_TOKEN, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ path })
                        });
                        if (res.ok) window.location.reload();
                        else alert('Failed to add directory. Ensure path exists.');
                    } catch(e) { alert('Error: ' + e.message); }
                }

                async function removeDir(path) {
                    if (!confirm('Remove this directory from configuration?')) return;
                    try {
                         const res = await fetch('/api/config/directories?token=' + API_TOKEN, {
                            method: 'DELETE',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ path })
                        });
                        if (res.ok) window.location.reload();
                    } catch(e) { alert('Error: ' + e.message); }
                }

                let currentBrowserPath = '';
                
                async function openBrowser() {
                    document.getElementById('browserModal').style.display = 'block';
                    loadPath('');
                }

                function closeBrowser() {
                    document.getElementById('browserModal').style.display = 'none';
                }

                async function loadPath(path) {
                    try {
                        const res = await fetch('/api/browse?path=' + encodeURIComponent(path));
                         if (res.status === 401) throw new Error("Unauthorized");
                        const data = await res.json();
                        if (data.error) throw new Error(data.error);
                        
                        currentBrowserPath = data.current;
                        document.getElementById('currentPathDisplay').innerText = data.current;
                        
                        const list = document.getElementById('browserList');
                        list.innerHTML = '';
                        
                        data.dirs.forEach(dir => {
                            const div = document.createElement('div');
                            div.className = 'browser-item';
                            div.innerHTML = \`<span class="folder-icon">📁</span> \${dir}\`;
                            div.onclick = () => {
                                let newPath;
                                if (dir === '..') {
                                    newPath = currentBrowserPath.endsWith('/') || currentBrowserPath.endsWith('\\\\') 
                                        ? currentBrowserPath + dir 
                                        : currentBrowserPath + '/' + dir; 
                                } else {
                                    newPath = currentBrowserPath.endsWith('/') || currentBrowserPath.endsWith('\\\\') 
                                        ? currentBrowserPath + dir 
                                        : currentBrowserPath + '/' + dir;
                                }
                                loadPath(newPath);
                            };
                            list.appendChild(div);
                        });

                    } catch(e) {
                        alert('Error loading path: ' + e.message);
                    }
                }

                function selectCurrentPath() {
                    document.getElementById('newPath').value = currentBrowserPath;
                    closeBrowser();
                }
            </script>
        </head>
        <body>
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <h1>Melodiq Helper</h1>
                        <span class="badge">Online (HTTP/HTTPS)</span>
                    </div>
                </div>
                
                 <div id="tv-connection-warning" style="background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 10px; border-radius: 6px; margin-bottom: 20px;">
                    <strong>TV Connection Info:</strong> Use the HTTPS URL below. When opening on TV/Mobile, you will assume a "Security Warning". Click "Advanced" -> "Proceed (Unsafe)" to accept the self-signed certificate. This is necessary for Mixed Content support.
                </div>

                <p><strong>${SONG_CACHE.length}</strong> songs cached.</p>
                <div style="margin-top: 30px;">
                    <span class="label">Music Folders</span>
                    <ul class="dir-list">
                        ${config.directories.map(dir => `
                            <li class="dir-item">
                                <span class="dir-path">${dir}</span>
                                <button class="danger" onclick="removeDir('${dir.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Remove</button>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="row" style="margin-top: 10px;">
                        <input type="text" id="newPath" placeholder="/path/to/media/folder">
                        <button class="secondary" onclick="openBrowser()">Browse...</button>
                        <button class="secondary" onclick="addDir()">Add</button>
                    </div>
                </div>

                <div style="margin-top: 30px;">
                   <span class="label">Network URL (HTTPS - Recommended for TV)</span>
                    <div class="row">
                        <div class="code-box" style="flex:1; margin:0; display:flex; align-items:center;" id="urlDisplay">${networkUrl}</div>
                        <button class="secondary" id="btn-urlDisplay" onclick="copyText('urlDisplay')">Copy</button>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <span class="label">Security Token (Persistent)</span>
                    <div class="row">
                        <div class="code-box" style="flex:1; margin:0; display:flex; align-items:center;" id="tokenDisplay">${AUTH_TOKEN}</div>
                        <button class="secondary" id="btn-tokenDisplay" onclick="copyText('tokenDisplay')">Copy</button>
                    </div>
                </div>
                
                 <div style="margin-top: 20px;">
                    <span class="label">Alternative HTTP Link</span>
                     <div class="row">
                        <div class="code-box" style="flex:1; margin:0; display:flex; align-items:center; opacity: 0.7; font-size: 0.9rem;">http://${localIp}:${PORT}</div>
                    </div>
                </div>

            <script>
                // ... previous scripts remain ... 

               async function rescanLibrary() {
                    const btn = document.getElementById('btn-rescan');
                    const originalText = btn.innerText;
                    btn.disabled = true;
                    btn.innerText = 'Scanning Library...';
                    
                    try {
                        const res = await fetch('/api/songs/refresh?token=' + API_TOKEN, { method: 'POST' });
                        if (res.ok) {
                             // Poll for status
                             const pollInterval = setInterval(async () => {
                                 try {
                                     const statusRes = await fetch('/api/status?token=' + API_TOKEN);
                                     const status = await statusRes.json();
                                     if (!status.scanning) {
                                         clearInterval(pollInterval);
                                         btn.innerText = 'Scan Complete!';
                                         setTimeout(() => window.location.reload(), 1000);
                                     }
                                 } catch(e) {
                                     console.error('Poll failed', e);
                                 }
                             }, 1000);
                        } else {
                            const txt = await res.text();
                            alert('Scan failed to start: ' + txt);
                            btn.innerText = originalText;
                            btn.disabled = false;
                        }
                    } catch (e) {
                        alert('Error: ' + e.message);
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                }
            </script>
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <button id="btn-rescan" onclick="rescanLibrary()" ${IS_SCANNING ? 'disabled' : ''} style="width:100%">
                    ${IS_SCANNING ? 'Scanning Library...' : 'Rescan Library'}
                </button>
            </div>
            </div>
            
            <p style="text-align:center; color:#65676b; font-size: 0.9rem;">
                <a href="/api/songs?limit=10&token=${AUTH_TOKEN}" target="_blank">Test API Connection</a>
            </p>

            <div id="browserModal" class="modal">
                <div class="modal-content">
                    <div class="browser-header">
                        <span style="font-weight:bold" id="currentPathDisplay">...</span>
                        <button class="secondary" onclick="closeBrowser()">Cancel</button>
                    </div>
                    <div class="browser-list" id="browserList">
                    </div>
                    <div style="margin-top: 15px; text-align: right;">
                        <button onclick="selectCurrentPath()">Select This Folder</button>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/media', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Missing path');
    const safePath = resolveSecurePath(targetPath);
    if (!safePath) return res.status(403).send('Access Denied or File Not Found');
    
    // Cache media files for 7 days and make them 'immutable' so the browser
    // doesn't even re-validate them on a hard page reload (F5).
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.sendFile(safePath);
});

app.get('/api/songs', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10000;
    const search = (req.query.search || '').trim().toLowerCase();

    // Convert cache to client-safe format
    const toClientSong = (s) => {
        const secureUrl = (absPath) => {
            if (!absPath) return null;
            return '/media?path=' + encodeURIComponent(absPath) + '&token=' + AUTH_TOKEN;
        };

        return {
            ...s,
            video: secureUrl(s.video),
            audio: secureUrl(s.audio),
            cover: secureUrl(s.cover),
            background: secureUrl(s.background)
        };
    };

    let results = SONG_CACHE;
    if (search) results = results.filter(s => s.searchString.includes(search));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = results.slice(startIndex, endIndex).map(toClientSong);

    res.set('X-Total-Count', results.length);
    res.set('X-Page', page);
    res.set('X-Limit', limit);
    res.json(paginated);
});

app.get('/api/status', (req, res) => {
    res.json({
        scanning: IS_SCANNING,
        count: SONG_CACHE.length
    });
});

app.post('/api/songs/refresh', async (req, res) => {
    if (IS_SCANNING) return res.status(409).send('Scan already in progress');
    scanSongs();
    res.send('Scan started');
});

// API: Config
app.get('/api/config/directories', (req, res) => res.json(config.directories));
app.post('/api/config/directories', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath && fs.existsSync(newPath)) {
        config.addDirectory(newPath);
        scanSongs();
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

// Directory Browser
app.get('/api/browse', (req, res) => {
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


// GENERATE OR LOAD CERTIFICATE
let pem;

if (config.ssl && config.ssl.key && config.ssl.cert) {
    console.log('Loading existing SSL certificate...');
    pem = {
        private: config.ssl.key,
        cert: config.ssl.cert
    };
} else {
    console.log('Generating standardized RSA certificate (node-forge)...');
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    // RANDOM SERIAL to avoid browser errors (SEC_ERROR_REUSED_ISSUER_AND_SERIAL)
    cert.serialNumber = crypto.randomBytes(16).toString('hex');
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // 10 years
    const attrs = [
        { name: 'commonName', value: 'MelodiqHelper' },
        { name: 'countryName', value: 'US' },
        { shortName: 'ST', value: 'Virginia' },
        { name: 'organizationName', value: 'Melodiq' },
        { shortName: 'OU', value: 'Helper' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
        { name: 'basicConstraints', cA: true },
        { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
        { name: 'extKeyUsage', serverAuth: true, clientAuth: true, codeSigning: true, emailProtection: true, timeStamping: true },
        { name: 'nsCertType', client: true, server: true, email: true, objsign: true, sslCA: true, emailCA: true, objCA: true }
    ]);
    // Self-sign with SHA256
    cert.sign(keys.privateKey, forge.md.sha256.create());

    pem = {
        private: pki.privateKeyToPem(keys.privateKey),
        cert: pki.certificateToPem(cert)
    };

    // Save to config
    config.ssl = {
        key: pem.private,
        cert: pem.cert
    };
    console.log('New SSL certificate generated and saved.');
}

const httpsOptions = {
    key: pem.private,
    cert: pem.cert,
    minVersion: 'TLSv1',
    ciphers: 'ALL:!EXPORT:!LOW:!aNULL:!eNULL:!SSLv2'
};

// START SERVERS
http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

https.createServer(httpsOptions, app).listen(SSL_PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`---------------------------------------------------`);
    console.log(`MELODIQ HELPER RUNNING (HTTPS)`);
    console.log(`---------------------------------------------------`);
    console.log(`Local Access:   http://localhost:${PORT}`);
    console.log(`Secure Access:  https://${localIp}:${SSL_PORT}`);
    console.log(``);
    console.log(`NOTE: You MUST accept the self-signed certificate warning.`);
    console.log(`---------------------------------------------------`);
    console.log(`SECURITY TOKEN: ${AUTH_TOKEN}`);
    console.log(`---------------------------------------------------`);

    // Initial Scan
    if (typeof IS_SCANNING !== 'undefined' && !IS_SCANNING) {
        scanSongs();
    } else if (typeof scanSongs === 'function') {
        scanSongs();
    }
});
