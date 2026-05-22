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
const { spawn, execFileSync } = require('child_process');
const zlib = require('zlib');
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
                body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 0 auto; padding: 20px; background: #f0f2f5; color: #1c1e21; }
                @media (max-width: 640px) { body { padding: 12px; } }
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
                let usdbOffset = 0;
                let usdbTotalResults = 0;

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

            <!-- ===== USDB MANAGER CARD ===== -->
            <div class="card" style="margin-top:24px; border: 1px solid #dde2eb;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h2 style="margin:0; font-size:1.15rem; color:#1877f2;">📥 USDB Song Manager</h2>
                    <button class="secondary" style="font-size:0.85rem;" onclick="toggleUsdbCard()">▲ Minimise</button>
                </div>
                <div id="usdb-card-body">

                    <!-- USDB Credentials -->
                    <div style="margin-bottom:18px; padding:14px; background:#f7f8fa; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div>
                                <span class="label" style="margin:0;">USDB Account (usdb.animux.de)</span>
                                <span id="usdb-creds-summary" style="font-size:0.85rem; color:#65676b; margin-left:8px; font-weight:600;"></span>
                            </div>
                            <button class="secondary" style="font-size:0.8rem; padding:2px 8px;" id="btn-toggle-creds" onclick="toggleUsdbCreds()">Edit</button>
                        </div>
                        <div id="usdb-creds-fields" style="margin-top:10px; display:none;">
                            <div class="row" style="margin-bottom:8px;">
                                <input type="text"     id="usdb-user" placeholder="Username" style="flex:1;">
                                <input type="password" id="usdb-pass" placeholder="Password" style="flex:1;">
                                <button onclick="saveUsdbCreds()" id="btn-save-creds">Save</button>
                            </div>
                            <div id="usdb-creds-status" style="font-size:0.85rem; color:#d32f2f;"></div>
                        </div>
                    </div>

                    <!-- Download Folder -->
                    <div style="margin-bottom:18px; padding:14px; background:#f7f8fa; border-radius:8px;">
                        <span class="label">Default Download Folder</span>
                        <div class="row">
                            <input type="text" id="usdb-dldir" placeholder="/path/to/music" style="flex:1;" value="">
                            <button class="secondary" onclick="openBrowserFor('usdb-dldir')">Browse…</button>
                            <button onclick="saveDlDir()">Save</button>
                        </div>
                        <div id="usdb-dldir-status" style="font-size:0.85rem; color:#65676b; margin-top:4px;"></div>
                    </div>

                    <!-- Search & Filters -->
                    <div style="margin-bottom:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span class="label" style="margin:0;">Search USDB</span>
                            <button class="secondary" style="font-size:0.8rem; padding:4px 10px;" onclick="toggleFilters()">⚙ Filter</button>
                        </div>

                        <!-- Quick search row -->
                        <div class="row" style="margin-bottom:8px;">
                            <input type="text" id="usdb-f-title" placeholder="Title (empty = any)" style="flex:1;"
                                   onkeydown="if(event.key==='Enter') usdbNewSearch()">
                            <input type="text" id="usdb-f-artist" placeholder="Artist (empty = any)" style="flex:1;"
                                   onkeydown="if(event.key==='Enter') usdbNewSearch()">
                            <button onclick="usdbNewSearch()" id="btn-usdb-search">🔍 Search</button>
                        </div>

                        <!-- Extended filters (collapsible) -->
                        <div id="usdb-filters" style="display:none; background:#f7f8fa; padding:12px; border-radius:8px; border:1px solid #e4e6eb;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Edition</label>
                                    <input type="text" id="usdb-f-edition" placeholder="any" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem;">
                                </div>
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Language</label>
                                    <input type="text" id="usdb-f-language" placeholder="any" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem;">
                                </div>
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Genre</label>
                                    <input type="text" id="usdb-f-genre" placeholder="any" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem;">
                                </div>
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Year</label>
                                    <input type="text" id="usdb-f-year" placeholder="e.g. 2023" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem;">
                                </div>
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Creator</label>
                                    <input type="text" id="usdb-f-creator" placeholder="any" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem;">
                                </div>
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Results per page</label>
                                    <select id="usdb-f-limit" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem; border:1px solid #ddd; border-radius:6px;">
                                        <option value="20">20</option>
                                        <option value="30" selected>30</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Sort by</label>
                                    <select id="usdb-f-order" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem; border:1px solid #ddd; border-radius:6px;">
                                        <option value="id" selected>Date added</option>
                                        <option value="artist">Artist</option>
                                        <option value="title">Title</option>
                                        <option value="language">Language</option>
                                        <option value="edition">Edition</option>
                                        <option value="genre">Genre</option>
                                        <option value="year">Year</option>
                                        <option value="views">Views</option>
                                        <option value="rating">Rating</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size:0.8rem; color:#65676b; display:block; margin-bottom:3px;">Order</label>
                                    <select id="usdb-f-direction" style="width:100%; box-sizing:border-box; padding:7px 9px; font-size:0.9rem; border:1px solid #ddd; border-radius:6px;">
                                        <option value="desc" selected>Descending</option>
                                        <option value="asc">Ascending</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display:flex; gap:20px; flex-wrap:wrap;">
                                <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer;">
                                    <input type="checkbox" id="usdb-f-golden"> ⭐ Only with golden notes
                                </label>
                                <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer;">
                                    <input type="checkbox" id="usdb-f-sc"> 🎤 Only [SC] songs
                                </label>
                            </div>
                            <div style="margin-top:10px; text-align:right;">
                                <button class="secondary" style="font-size:0.85rem;" onclick="resetFilters()">↺ Reset filters</button>
                            </div>
                        </div>
                    </div>

                    <!-- Results table -->
                    <div id="usdb-results-wrap" style="display:none;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <div style="font-size:0.85rem; color:#65676b;" id="usdb-result-count"></div>
                            <button id="btn-usdb-bulk-download" onclick="startBulkDownload()" style="display:none; font-size:0.85rem; padding:4px 10px; background:#1877f2; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">
                                📥 Download Selected (0)
                            </button>
                        </div>
                        <div style="overflow-x:auto;">
                            <table id="usdb-results-table" style="width:100%; border-collapse:collapse; font-size:0.85rem; white-space:nowrap;">
                                <thead>
                                    <tr style="background:#f0f2f5; text-align:left;">
                                        <th style="padding:8px 6px; width:30px;"><input type="checkbox" id="usdb-select-all" onclick="toggleSelectAllOnPage(this.checked)"></th>
                                        <th style="padding:8px 6px;">Artist</th>
                                        <th style="padding:8px 6px;">Title</th>
                                        <th style="padding:8px 6px;">Genre</th>
                                        <th style="padding:8px 6px;">Year</th>
                                        <th style="padding:8px 6px;">Edition</th>
                                        <th style="padding:8px 6px;">⭐</th>
                                        <th style="padding:8px 6px;">Lang</th>
                                        <th style="padding:8px 6px;">Creator</th>
                                        <th style="padding:8px 6px;">Rating</th>
                                        <th style="padding:8px 6px;">Views</th>
                                        <th style="padding:8px 6px;">🎬 Video</th>
                                        <th style="padding:8px 6px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="usdb-results-body"></tbody>
                            </table>
                        </div>
                        <!-- Pagination controls -->
                        <div id="usdb-pagination" style="display:none; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px solid #e4e6eb; padding-top:10px; gap:10px;">
                            <button class="secondary" id="btn-usdb-prev" onclick="changeUsdbPage(-1)" style="font-size:0.85rem; padding:4px 10px;">◀ Previous</button>
                            <span id="usdb-page-info" style="font-size:0.85rem; font-weight:600; color:#4e5157;">Page 1</span>
                            <button class="secondary" id="btn-usdb-next" onclick="changeUsdbPage(1)" style="font-size:0.85rem; padding:4px 10px;">Next ▶</button>
                        </div>
                    </div>

                    <!-- Error display -->
                    <div id="usdb-error" style="display:none; color:#dc3545; font-size:0.9rem; margin-top:8px;"></div>

                </div><!-- /usdb-card-body -->
            </div><!-- /USDB card -->

            <!-- Background Jobs Dashboard -->
            <div id="usdb-jobs-container" style="display:none; margin-top:20px; background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 style="margin:0; font-size:1.1rem; color:#1c1e21;">⬇ Downloads Dashboard</h3>
                    <button class="secondary" style="font-size:0.8rem; padding:4px 8px;" onclick="pollJobs()">↻ Refresh</button>
                </div>
                <div id="usdb-jobs-list" style="display:flex; flex-direction:column; gap:8px; max-height:500px; overflow-y:auto; padding-right:6px;"></div>
            </div>

            <script>
                // ---- USDB Manager JS ----
                const selectedSongs = new Map();
                let currentSearchSongs = [];
                let jobsPollTimer = null;
                let activeJob = null;
                let pollTimer = null;
                let usdbBrowserTarget = null;

                // Load current settings on page load
                (async () => {
                    try {
                        const r1 = await fetch('/api/config/usdb-credentials?token=' + API_TOKEN);
                        const d1 = await r1.json();
                        if (d1.username) {
                            document.getElementById('usdb-user').value = d1.username;
                            const summary = d1.hasPassword
                                ? '✅ Saved' : '⚠️ No password';
                            document.getElementById('usdb-creds-summary').textContent = summary;
                            if (d1.hasPassword) {
                                document.getElementById('usdb-pass').value = '********';
                                document.getElementById('usdb-creds-fields').style.display = 'none';
                                document.getElementById('btn-toggle-creds').textContent = 'Edit';
                            } else {
                                document.getElementById('usdb-creds-fields').style.display = '';
                                document.getElementById('btn-toggle-creds').textContent = 'Hide';
                            }
                        } else {
                            document.getElementById('usdb-creds-fields').style.display = '';
                            document.getElementById('btn-toggle-creds').textContent = 'Hide';
                        }
                    } catch(_) {}
                    try {
                        const r2 = await fetch('/api/config/download-dir?token=' + API_TOKEN);
                        const d2 = await r2.json();
                        if (d2.downloadDir) document.getElementById('usdb-dldir').value = d2.downloadDir;
                    } catch(_) {}
                    
                    // Poll for existing jobs on page load
                    if (typeof pollJobs === 'function') pollJobs();
                })();

                function toggleUsdbCard() {
                    const body = document.getElementById('usdb-card-body');
                    const btn  = event.currentTarget || event.target;
                    if (body.style.display === 'none') { body.style.display = ''; btn.textContent = '▲ Minimise'; }
                    else { body.style.display = 'none'; btn.textContent = '▼ Expand'; }
                }

                function toggleUsdbCreds() {
                    const fields = document.getElementById('usdb-creds-fields');
                    const btn = document.getElementById('btn-toggle-creds');
                    if (fields.style.display === 'none') {
                        fields.style.display = '';
                        btn.textContent = 'Hide';
                    } else {
                        fields.style.display = 'none';
                        btn.textContent = 'Edit';
                    }
                }

                async function saveUsdbCreds() {
                    const username = document.getElementById('usdb-user').value.trim();
                    const password = document.getElementById('usdb-pass').value;
                    if (!username) { alert('Username is required.'); return; }
                    const btn = document.getElementById('btn-save-creds');
                    btn.disabled = true; btn.textContent = 'Saving…';
                    document.getElementById('usdb-creds-status').textContent = '';
                    try {
                        const r = await fetch('/api/config/usdb-credentials?token=' + API_TOKEN, {
                            method: 'POST', headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({ username, password })
                        });
                        const d = await r.json();
                        if (d.ok) {
                            document.getElementById('usdb-creds-summary').textContent = '✅ Saved';
                            document.getElementById('usdb-creds-fields').style.display = 'none';
                            document.getElementById('btn-toggle-creds').textContent = 'Edit';
                            document.getElementById('usdb-creds-status').textContent = '';
                        } else {
                            document.getElementById('usdb-creds-status').textContent = '❌ ' + (d.error || 'Error');
                        }
                    } catch(e) { document.getElementById('usdb-creds-status').textContent = '❌ ' + e.message; }
                    btn.disabled = false; btn.textContent = 'Save';
                }

                async function saveDlDir() {
                    const dir = document.getElementById('usdb-dldir').value.trim();
                    if (!dir) return;
                    const r = await fetch('/api/config/download-dir?token=' + API_TOKEN, {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ dir })
                    });
                    const d = await r.json();
                    document.getElementById('usdb-dldir-status').textContent = d.downloadDir ? '✅ Saved: ' + d.downloadDir : '❌ ' + (d.error || 'Error');
                }

                // Override selectCurrentPath to support USDB folder picker
                const _origSelect = selectCurrentPath;
                function selectCurrentPath() {
                    if (usdbBrowserTarget) {
                        document.getElementById(usdbBrowserTarget).value = currentBrowserPath;
                        usdbBrowserTarget = null;
                        closeBrowser();
                    } else {
                        _origSelect();
                    }
                }

                function openBrowserFor(inputId) {
                    usdbBrowserTarget = inputId;
                    openBrowser();
                }

                function toggleFilters() {
                    const el = document.getElementById('usdb-filters');
                    const btn = event.target;
                    if (el.style.display === 'none') { el.style.display = 'block'; btn.textContent = '✕ Filter'; }
                    else { el.style.display = 'none'; btn.textContent = '⚙ Filter'; }
                }

                function resetFilters() {
                    ['usdb-f-title','usdb-f-artist','usdb-f-edition','usdb-f-language',
                     'usdb-f-genre','usdb-f-year','usdb-f-creator'].forEach(id => {
                        document.getElementById(id).value = '';
                    });
                    document.getElementById('usdb-f-limit').value = '30';
                    document.getElementById('usdb-f-order').value = 'id';
                    document.getElementById('usdb-f-direction').value = 'desc';
                    document.getElementById('usdb-f-golden').checked = false;
                    document.getElementById('usdb-f-sc').checked = false;
                    usdbOffset = 0;
                    usdbTotalResults = 0;
                    document.getElementById('usdb-results-wrap').style.display = 'none';
                }

                function usdbNewSearch() {
                    usdbOffset = 0;
                    doUsdbSearch();
                }

                function changeUsdbPage(dir) {
                    const limit = parseInt(document.getElementById('usdb-f-limit').value, 10) || 30;
                    usdbOffset += dir * limit;
                    if (usdbOffset < 0) usdbOffset = 0;
                    doUsdbSearch();
                }

                async function doUsdbSearch() {
                    const title    = document.getElementById('usdb-f-title').value.trim();
                    const artist   = document.getElementById('usdb-f-artist').value.trim();
                    const edition  = document.getElementById('usdb-f-edition').value.trim();
                    const language = document.getElementById('usdb-f-language').value.trim();
                    const genre    = document.getElementById('usdb-f-genre').value.trim();
                    const year     = document.getElementById('usdb-f-year').value.trim();
                    const creator  = document.getElementById('usdb-f-creator').value.trim();
                    const limit    = document.getElementById('usdb-f-limit').value;
                    const order    = document.getElementById('usdb-f-order').value;
                    const dir      = document.getElementById('usdb-f-direction').value;
                    const golden   = document.getElementById('usdb-f-golden').checked ? '1' : '0';
                    const sc       = document.getElementById('usdb-f-sc').checked ? '1' : '0';

                    const btn = document.getElementById('btn-usdb-search');
                    btn.disabled = true; btn.textContent = '...';
                    document.getElementById('usdb-error').style.display = 'none';

                    const params = new URLSearchParams({
                        title, artist, edition, language, genre, year, creator,
                        limit, order, direction: dir, golden, sc, offset: usdbOffset
                    });

                    try {
                        const r = await fetch('/api/usdb/search?token=' + API_TOKEN + '&' + params.toString());
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error || 'Search failed');
                        renderUsdbResults(data.songs, data.totalResults, parseInt(limit, 10));
                    } catch(e) {
                        const errEl = document.getElementById('usdb-error');
                        errEl.textContent = '❌ ' + e.message;
                        errEl.style.display = 'block';
                    }
                    btn.disabled = false; btn.textContent = '🔍 Search';
                }

                function renderUsdbResults(songs, totalResults, limit) {
                    const tbody = document.getElementById('usdb-results-body');
                    tbody.innerHTML = '';
                    
                    usdbTotalResults = totalResults || 0;
                    currentSearchSongs = songs;

                    if (usdbTotalResults > 0) {
                        const startNum = usdbOffset + 1;
                        const endNum = Math.min(usdbOffset + limit, usdbTotalResults);
                        document.getElementById('usdb-result-count').textContent = 
                            usdbTotalResults + ' result(s) found (showing ' + startNum + '-' + endNum + ')';
                    } else {
                        document.getElementById('usdb-result-count').textContent = '0 result(s) found';
                    }

                    if (songs.length === 0) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = '<td colspan="13" style="padding:16px; text-align:center; color:#888;">No results found. Try different search terms.</td>';
                        tbody.appendChild(tr);
                        document.getElementById('usdb-pagination').style.display = 'none';
                        document.getElementById('usdb-results-wrap').style.display = 'block';
                        return;
                    }

                    const pag = document.getElementById('usdb-pagination');
                    if (usdbTotalResults > limit) {
                        pag.style.display = 'flex';
                        document.getElementById('btn-usdb-prev').disabled = (usdbOffset === 0);
                        document.getElementById('btn-usdb-next').disabled = (usdbOffset + limit >= usdbTotalResults);
                        
                        const currentPage = Math.floor(usdbOffset / limit) + 1;
                        const totalPages = Math.ceil(usdbTotalResults / limit);
                        document.getElementById('usdb-page-info').textContent = 'Page ' + currentPage + ' of ' + totalPages;
                    } else {
                        pag.style.display = 'none';
                    }

                    songs.forEach((s, i) => {
                        const esc = v => (v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = '1px solid #f0f0f0';
                        tr.onmouseover = () => tr.style.background = '#f7f8fa';
                        tr.onmouseout  = () => tr.style.background = '';
                        const isSelected = selectedSongs.has(s.usdbId);
                        tr.innerHTML = \`
                            <td style="padding:8px 6px;"><input type="checkbox" class="usdb-row-checkbox" data-idx="\${i}" \${isSelected ? 'checked' : ''} onchange="toggleSongSelection(\${i}, this.checked)"></td>
                            <td style="padding:8px 6px; max-width:160px; overflow:hidden; text-overflow:ellipsis;" title="\${esc(s.artist)}">\${esc(s.artist)}</td>
                            <td style="padding:8px 6px; max-width:180px; overflow:hidden; text-overflow:ellipsis; font-weight:500;" title="\${esc(s.title)}">\${esc(s.title)}</td>
                            <td style="padding:8px 6px; color:#888; font-size:0.8rem;">\${esc(s.genre)}</td>
                            <td style="padding:8px 6px; color:#888; font-size:0.8rem;">\${esc(s.year)}</td>
                            <td style="padding:8px 6px; color:#888; font-size:0.8rem; max-width:100px; overflow:hidden; text-overflow:ellipsis;" title="\${esc(s.edition)}">\${esc(s.edition)}</td>
                            <td style="padding:8px 6px; text-align:center;">\${s.goldenNotes || ''}</td>
                            <td style="padding:8px 6px; color:#888; font-size:0.8rem;">\${esc(s.language)}</td>
                            <td style="padding:8px 6px; color:#888; font-size:0.8rem; max-width:90px; overflow:hidden; text-overflow:ellipsis;" title="\${esc(s.creator)}">\${esc(s.creator)}</td>
                            <td style="padding:8px 6px; color:#f5a623; font-size:0.8rem; letter-spacing:-1px;">\${esc(s.rating)}</td>
                            <td style="padding:8px 6px; color:#888; font-size:0.8rem;">\${esc(s.views)}</td>
                            <td style="padding:8px 6px;">
                                <select id="vmode-\${i}" style="padding:4px 6px; border-radius:4px; border:1px solid #ddd; font-size:0.8rem;" onchange="updateVideoMode(\${i}, this.value)">
                                    <option value="mp4">🎬 MP4</option>
                                    <option value="stream">📡 Stream</option>
                                    <option value="none" selected>🎵 Audio</option>
                                </select>
                            </td>
                            <td style="padding:8px 6px; text-align:right;">
                                <button id="dl-btn-\${i}" onclick="startDownload(\${i}, '\${esc(s.usdbId)}')" style="padding:5px 10px; font-size:0.8rem;">
                                    ⬇
                                </button>
                            </td>
                        \`;
                        tr.dataset.artist = s.artist;
                        tr.dataset.title  = s.title;
                        tbody.appendChild(tr);
                    });

                    document.getElementById('usdb-results-wrap').style.display = 'block';
                    updateBulkDownloadButton();
                }

                function toggleSongSelection(idx, checked) {
                    const s = currentSearchSongs[idx];
                    const vmode = document.getElementById('vmode-' + idx).value;
                    if (checked) {
                        selectedSongs.set(s.usdbId, { usdbId: s.usdbId, artist: s.artist, title: s.title, videoMode: vmode });
                    } else {
                        selectedSongs.delete(s.usdbId);
                    }
                    updateBulkDownloadButton();
                }

                function toggleSelectAllOnPage(checked) {
                    const checkboxes = document.querySelectorAll('.usdb-row-checkbox');
                    checkboxes.forEach(cb => {
                        cb.checked = checked;
                        const idx = parseInt(cb.dataset.idx, 10);
                        const s = currentSearchSongs[idx];
                        const vmode = document.getElementById('vmode-' + idx).value;
                        if (checked) {
                            selectedSongs.set(s.usdbId, { usdbId: s.usdbId, artist: s.artist, title: s.title, videoMode: vmode });
                        } else {
                            selectedSongs.delete(s.usdbId);
                        }
                    });
                    updateBulkDownloadButton();
                }

                function updateVideoMode(idx, value) {
                    const s = currentSearchSongs[idx];
                    if (selectedSongs.has(s.usdbId)) {
                        selectedSongs.get(s.usdbId).videoMode = value;
                    }
                }

                function updateBulkDownloadButton() {
                    const btn = document.getElementById('btn-usdb-bulk-download');
                    const count = selectedSongs.size;
                    if (count > 0) {
                        btn.style.display = 'inline-block';
                        btn.textContent = '📥 Download Selected (' + count + ')';
                    } else {
                        btn.style.display = 'none';
                    }
                    
                    const allCbs = document.querySelectorAll('.usdb-row-checkbox');
                    const allChecked = allCbs.length > 0 && Array.from(allCbs).every(cb => cb.checked);
                    const selectAllCb = document.getElementById('usdb-select-all');
                    if (selectAllCb) selectAllCb.checked = allChecked;
                }

                async function startBulkDownload() {
                    if (selectedSongs.size === 0) return;
                    const requests = Array.from(selectedSongs.values());
                    
                    const btn = document.getElementById('btn-usdb-bulk-download');
                    btn.disabled = true;
                    btn.textContent = '⏳ Enqueuing...';
                    
                    try {
                        const r = await fetch('/api/usdb/download?token=' + API_TOKEN, {
                            method: 'POST', headers: {'Content-Type':'application/json'},
                            body: JSON.stringify(requests)
                        });
                        const d = await r.json();
                        if (!r.ok) throw new Error(d.error || 'Failed to start downloads');
                        
                        // Clear selections
                        selectedSongs.clear();
                        document.querySelectorAll('.usdb-row-checkbox').forEach(cb => cb.checked = false);
                        updateBulkDownloadButton();
                        
                        pollJobs();
                    } catch(e) {
                        alert('Error: ' + e.message);
                    } finally {
                        btn.disabled = false;
                        updateBulkDownloadButton();
                    }
                }

                async function startDownload(idx, usdbId) {
                    const rows  = document.getElementById('usdb-results-body').children;
                    const row   = rows[idx];
                    const vmode = document.getElementById('vmode-' + idx).value;
                    const artist = row.dataset.artist;
                    const title  = row.dataset.title;

                    const btn = document.getElementById('dl-btn-' + idx);
                    btn.disabled = true; btn.textContent = '⏳';

                    try {
                        const r = await fetch('/api/usdb/download?token=' + API_TOKEN, {
                            method: 'POST', headers: {'Content-Type':'application/json'},
                            body: JSON.stringify([{ usdbId, artist, title, videoMode: vmode }])
                        });
                        const d = await r.json();
                        if (!r.ok) throw new Error(d.error || 'Failed to start download');
                        
                        btn.textContent = '✅';
                        pollJobs();
                    } catch(e) {
                        alert('Error: ' + e.message);
                        btn.disabled = false; btn.textContent = '⬇ Download';
                    }
                }

                async function pollJobs() {
                    try {
                        const r = await fetch('/api/usdb/jobs?token=' + API_TOKEN);
                        if (!r.ok) return;
                        const jobsList = await r.json();
                        
                        const containerWrap = document.getElementById('usdb-jobs-container');
                        const listWrap = document.getElementById('usdb-jobs-list');
                        
                        if (jobsList.length === 0) {
                            containerWrap.style.display = 'none';
                            return;
                        }
                        
                        containerWrap.style.display = 'block';
                        
                        const openJobIds = new Set();
                        listWrap.querySelectorAll('details[open]').forEach(d => openJobIds.add(d.dataset.jobid));
                        listWrap.innerHTML = '';
                        
                        let activeCount = 0;
                        jobsList.slice().reverse().forEach(j => { // Newest top
                            if (j.status === 'pending' || j.status === 'running') activeCount++;
                            
                            let color = '#65676b';
                            let statusIcon = '⏳';
                            if (j.status === 'running') { color = '#1877f2'; statusIcon = '▶️'; }
                            else if (j.status === 'done') { color = '#28a745'; statusIcon = '✅'; }
                            else if (j.status === 'error') { color = '#dc3545'; statusIcon = '❌'; }
                            
                            const div = document.createElement('div');
                            div.style.border = '1px solid #e4e6eb';
                            div.style.borderRadius = '6px';
                            div.style.padding = '8px 12px';
                            div.style.background = j.status === 'running' ? '#f0f7ff' : '#fff';
                            
                            const isOpen = openJobIds.has(j.jobId) || j.status === 'running';
                            
                            div.innerHTML = \`
                                <details data-jobid="\${j.jobId}" \${isOpen ? 'open' : ''}>
                                    <summary style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; outline:none;">
                                        <div style="font-weight:600; font-size:0.9rem;">
                                            \${statusIcon} \${j.artist} - \${j.title}
                                        </div>
                                        <div style="font-size:0.85rem; color:\${color}; font-weight:bold;">
                                            \${j.status === 'error' ? 'Error' : j.progress + '%'}
                                        </div>
                                    </summary>
                                    <div style="margin-top:8px;">
                                        <div style="background:#e4e6eb; border-radius:4px; height:6px; overflow:hidden; margin-bottom:8px;">
                                            <div style="background:\${color}; height:100%; width:\${j.progress}%; transition:width 0.4s;"></div>
                                        </div>
                                        <div style="background:#1c1e21; color:#4cd964; font-family:monospace; font-size:0.75rem;
                                                       padding:8px; border-radius:4px; max-height:150px; overflow-y:auto; white-space:pre-wrap;">\${(j.log || []).join('\\n')}</div>
                                    </div>
                                </details>
                            \`;
                            listWrap.appendChild(div);
                            
                            if (j.status === 'running' || j.status === 'error' || j.status === 'pending') {
                                setTimeout(() => {
                                    const logBox = div.querySelector('div[style*="overflow-y:auto"]');
                                    if (logBox) logBox.scrollTop = logBox.scrollHeight;
                                }, 50);
                            }
                        });
                        
                        if (activeCount > 0) {
                            if (!jobsPollTimer) jobsPollTimer = setInterval(pollJobs, 1500);
                        } else {
                            if (jobsPollTimer) { clearInterval(jobsPollTimer); jobsPollTimer = null; }
                        }
                    } catch (e) {}
                }
            </script>

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


// ============================================================
// USDB MANAGER – helpers, job system & API routes
// ============================================================

// In-memory job store
const DOWNLOAD_JOBS = new Map();
let USDB_SESSION_COOKIE = null;

async function getUsdbCookie(forceRefresh = false) {
    if (!config.usdbUsername || !config.usdbPassword) {
        throw new Error('USDB credentials not set. Please save your credentials above.');
    }
    if (!USDB_SESSION_COOKIE || forceRefresh) {
        USDB_SESSION_COOKIE = await usdbLogin(config.usdbUsername, config.usdbPassword);
    }
    return USDB_SESSION_COOKIE;
}

// --- yt-dlp helpers ---

function findYtDlpBin() {
    const candidates = [
        'yt-dlp',
        path.join(__dirname, 'yt-dlp'),
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
                path.join(__dirname, 'yt-dlp'),
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
                path.join(__dirname, 'yt-dlp'),
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
        let out = '';
        const handle = d => {
            const s = d.toString();
            out += s;
            if (onLine) s.split('\n').filter(l => l.trim()).forEach(l => onLine(l));
        };
        proc.stdout.on('data', handle);
        proc.stderr.on('data', handle);
        proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(`yt-dlp exit ${code}: ${out.slice(-300)}`)));
        proc.on('error', reject);
    });
}

// --- HTTP helpers (gzip-aware) ---

function decompressResponse(res) {
    const enc = res.headers['content-encoding'];
    if (enc === 'gzip')    return res.pipe(zlib.createGunzip());
    if (enc === 'deflate') return res.pipe(zlib.createInflate());
    if (enc === 'br')      return res.pipe(zlib.createBrotliDecompress());
    return res;
}

function httpsGetFollow(url, reqHeaders) {
    return new Promise((resolve, reject) => {
        const doReq = (u, redirects) => {
            if (redirects > 5) return reject(new Error('Too many redirects'));
            const lib = u.startsWith('https') ? https : http;
            const headers = { 'User-Agent': 'Mozilla/5.0 (compatible)', 'Accept-Encoding': 'gzip, deflate', ...reqHeaders };
            lib.get(u, { headers }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const next = res.headers.location.startsWith('http')
                        ? res.headers.location
                        : new URL(res.headers.location, u).href;
                    res.resume();
                    return doReq(next, redirects + 1);
                }
                const stream = decompressResponse(res);
                const chunks = [];
                stream.on('data', d => chunks.push(d));
                stream.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8'), headers: res.headers }));
                stream.on('error', reject);
            }).on('error', reject);
        };
        doReq(url, 0);
    });
}

function httpsPost(url, bodyStr, extraHeaders) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const bodyBuf = Buffer.from(bodyStr);
        const opts = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': bodyBuf.length,
                'User-Agent': 'Mozilla/5.0 (compatible)',
                'Accept-Encoding': 'gzip, deflate',
                ...extraHeaders
            }
        };
        const req = https.request(opts, (res) => {
            const cookies = res.headers['set-cookie'] || [];
            const stream = decompressResponse(res);
            const chunks = [];
            stream.on('data', d => chunks.push(d));
            stream.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8'), cookies }));
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.write(bodyBuf);
        req.end();
    });
}

// --- USDB helpers ---

async function usdbLogin(username, password) {
    // Login via POST to index.php?link=login
    const body = new URLSearchParams({ user: username, pass: password, login: 'Login' }).toString();
    const res = await httpsPost('https://usdb.animux.de/index.php?link=login', body);
    if (!res.body.includes('logout')) {
        throw new Error('USDB login failed – check username/password.');
    }
    const cookie = (res.cookies || []).map(c => c.split(';')[0]).join('; ');
    if (!cookie || !cookie.includes('PHPSESSID')) {
        throw new Error('USDB login failed – session cookie not set.');
    }
    return cookie;
}

function stripHtml(s) {
    return s
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}

function parseUsdbSearch(html) {
    const songs = [];

    const clean = (s) => s
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .trim();

    const starCount = (s) => {
        // USDB uses star images or ★ characters for rating
        const imgs = (s.match(/star(?:_on|_off)?\.(?:gif|png|jpg)/gi) || []).filter(x => x.includes('on') || !x.includes('off'));
        if (imgs.length) return '★'.repeat(imgs.length);
        const stars = (s.match(/★/g) || []).length;
        return stars ? '★'.repeat(stars) : clean(s).substring(0, 5);
    };

    // Extract all <td> contents from a row's HTML
    const getTds = (rowHtml) => {
        const tds = [];
        const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let m;
        while ((m = re.exec(rowHtml)) !== null) tds.push(m[1]);
        return tds;
    };

    // Build a song object from a td array.
    // USDB columns: [sample_cb, cover_img, artist_link, title_link, genre, year, edition, goldennotes, language, creator, rating_imgs, views, audio_icon]
    const buildSong = (usdbId, tds) => {
        let titleIdx = -1;
        for (let i = 0; i < tds.length; i++) {
            // The title column contains the link to the detail page (e.g., link=detail or id=)
            if (/[?&]id=\d+/i.test(tds[i]) || /link=detail/i.test(tds[i]) || /view=detail/i.test(tds[i])) {
                titleIdx = i;
                break;
            }
        }
        if (titleIdx <= 0 || titleIdx >= tds.length) {
            return null;
        }

        const artistIdx = titleIdx - 1;
        const artist = clean(tds[artistIdx]);
        const title  = clean(tds[titleIdx]);
        if (!artist || !title || artist === 'Artist' || artist === 'Interpret') {
            return null;
        }

        const o = titleIdx;
        return {
            usdbId,
            artist,
            title,
            genre:       clean(tds[o + 1] || ''),
            year:        clean(tds[o + 2] || ''),
            edition:     clean(tds[o + 3] || ''),
            goldenNotes: /yes|ja|true|1/i.test(clean(tds[o + 4] || '')) ? '⭐' : '',
            language:    clean(tds[o + 5] || ''),
            creator:     clean(tds[o + 6] || ''),
            rating:      starCount(tds[o + 7] || ''),
            views:       clean(tds[o + 8] || ''),
        };
    };

    // Strategy 1: rows with explicit data-songid attribute
    const dataRe = /<tr[^>]+data-songid="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let m;
    let usedStrategy1 = false;
    while ((m = dataRe.exec(html)) !== null) {
        usedStrategy1 = true;
        const song = buildSong(m[1], getTds(m[2]));
        if (song) songs.push(song);
    }

    // Strategy 2: rows with explicit id= attribute naming (entry_N, row_N, song_N)
    if (!usedStrategy1) {
        const namedRe = /<tr[^>]+id="(?:entry_|row_|song_)(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
        while ((m = namedRe.exec(html)) !== null) {
            usedStrategy1 = true;
            const song = buildSong(m[1], getTds(m[2]));
            if (song) songs.push(song);
        }
    }

    // Strategy 3: any <tr> containing a view=detail or ?id=N link
    if (!usedStrategy1) {
        const anyRowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        while ((m = anyRowRe.exec(html)) !== null) {
            const rowHtml = m[1];
            const idMatch = rowHtml.match(/view=detail[^"']*[?&]id=(\d+)/i)
                         || rowHtml.match(/[?&]id=(\d+)/);
            if (!idMatch) continue;
            const song = buildSong(idMatch[1], getTds(rowHtml));
            if (song) songs.push(song);
        }
    }

    const match = html.match(/There are\s+(\d+)\s+results on\s+(\d+)\s+page/i);
    let totalResults = songs.length;
    let totalPages = 1;
    if (match) {
        totalResults = parseInt(match[1], 10);
        totalPages = parseInt(match[2], 10);
    }
    return { songs, totalResults, totalPages };
}

async function searchUsdb(filters) {
    // USDB uses POST to /?link=list (confirmed via HAR)
    // Field names differ from what you'd expect:
    //   artist -> interpret, direction -> ud, golden -> golden (val=1), sc -> songcheck
    let cookie;
    try {
        cookie = await getUsdbCookie();
    } catch (e) {
        throw new Error('USDB requires login to search. Please save your credentials above.');
    }

    const {
        title = '', artist = '', edition = '', language = '',
        genre = '', year = '', creator = '',
        limit = '30', order = 'id', direction = 'asc',
        golden = '0', sc = '0', offset = '0'
    } = filters;

    const params = new URLSearchParams({
        interpret: artist,
        title,
        edition,
        language,
        genre,
        year,
        creator,
        user: '',
        order,
        ud: direction,
        limit,
        details: '1',
        start: offset.toString(),
        newsearch: 'Start Search',
        ...(golden === '1' ? { golden: '1' } : {}),
        ...(sc     === '1' ? { songcheck: '1' } : {}),
    });

    let res = await httpsPost(
        'https://usdb.animux.de/?link=list',
        params.toString(),
        { Cookie: cookie }
    );

    if (res.status === 200 && res.body.includes('You are not logged in')) {
        // Session expired, retry login once
        try {
            cookie = await getUsdbCookie(true);
            res = await httpsPost(
                'https://usdb.animux.de/?link=list',
                params.toString(),
                { Cookie: cookie }
            );
        } catch (e) {
            throw new Error('USDB login failed. Please check your credentials.');
        }
    }

    if (res.status !== 200) throw new Error(`USDB search HTTP ${res.status}`);
    if (res.body.includes('You are not logged in')) {
        throw new Error('USDB requires login to search. Please save your credentials above.');
    }
    return parseUsdbSearch(res.body);
}

async function fetchUsdbTxt(usdbId, cookie) {
    const url = `https://usdb.animux.de/?link=gettxt&id=${usdbId}`;
    const body = new URLSearchParams({ wd: '1' }).toString();
    const res = await httpsPost(url, body, cookie ? { Cookie: cookie } : {});
    if (res.status !== 200) throw new Error(`USDB txt fetch HTTP ${res.status}`);
    
    // Extract txt from textarea
    const match = res.body.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
    if (!match) {
        throw new Error('Could not find lyrics textarea in USDB response. Make sure you are logged in.');
    }
    return stripHtml(match[1]).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sanitizeFilename(str) {
    return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim();
}

// --- Download job runner ---

async function runDownloadJob(job) {
    try {
        job.status = 'running';
        const { usdbId, artist, title, videoMode } = job;

        // 1. Ensure yt-dlp is available
        const ytBin = await ensureYtDlp(job);

        // 2. Prepare output folder
        const dlBase = config.downloadDir || (config.directories[0] || process.cwd());
        const safeName = `${sanitizeFilename(artist)} - ${sanitizeFilename(title)}`;
        const songDir  = path.join(dlBase, safeName);
        fs.mkdirSync(songDir, { recursive: true });
        job.log.push(`📁 Folder: ${songDir}`);

        // 3. Fetch .txt from USDB (Option A: with credentials)
        let txtContent = null;
        if (config.usdbUsername && config.usdbPassword) {
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
        } else {
            job.log.push('⚠️ No USDB credentials – generating minimal .txt.');
        }
        job.progress = 15;

        // 4. Download audio and thumbnail via yt-dlp
        const audioOut = path.join(songDir, `${safeName}.mp3`);
        job.log.push('🎵 Downloading audio and cover...');
        await spawnYtDlp(ytBin, [
            '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
            '--write-thumbnail', '--convert-thumbnails', 'jpg',
            '-o', audioOut, '--no-playlist',
            `ytsearch1:${artist} ${title} audio`
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
            await spawnYtDlp(ytBin, [
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '-o', videoOut, '--no-playlist',
                `ytsearch1:${artist} ${title}`
            ], l => job.log.push(l));
            videoHeaderValue = `${safeName}.mp4`;
            job.log.push('✅ Video done.');
        } else if (videoMode === 'stream') {
            job.log.push('📡 Resolving YouTube URL...');
            const ytOut = await spawnYtDlp(ytBin, [
                '--print', 'webpage_url', '--no-playlist',
                `ytsearch1:${artist} ${title}`
            ]);
            videoHeaderValue = ytOut.trim().split('\n')[0];
            job.log.push(`📡 Stream URL: ${videoHeaderValue}`);
        }
        job.progress = 85;

        // 6. Write .txt file
        const txtPath = path.join(songDir, `${safeName}.txt`);
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
            
            // Check for downloaded cover thumbnail
            if (fs.existsSync(targetCover)) {
                lines.splice(lastHeaderIdx + offset, 0, `#COVER:${safeName}-cover.jpg`);
            }
            
            fs.writeFileSync(txtPath, lines.join('\n'), 'utf-8');
        } else {
            // Generate minimal UltraStar .txt
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

// --- USDB API routes & Queue ---

const jobQueue = [];
let isQueueRunning = false;

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

app.get('/api/usdb/search', async (req, res) => {
    const { title, artist, edition, language, genre, year, creator,
            limit, order, direction, golden, sc, offset } = req.query;
    // Require at least one filter field
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

app.post('/api/usdb/download', (req, res) => {
    let requests = req.body;
    if (!Array.isArray(requests)) {
        requests = [requests]; // Normalize to array
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
    
    processJobQueue(); // process sequentially
    res.json({ jobIds });
});

app.get('/api/usdb/jobs', (req, res) => {
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

app.get('/api/usdb/status/:jobId', (req, res) => {
    const job = DOWNLOAD_JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ status: job.status, progress: job.progress, log: job.log.slice(-30), error: job.error });
});

app.get('/api/config/download-dir', (req, res) => {
    res.json({ downloadDir: config.downloadDir || config.directories[0] || null });
});

app.post('/api/config/download-dir', (req, res) => {
    const { dir } = req.body;
    if (!dir || !fs.existsSync(dir)) return res.status(400).json({ error: 'Directory does not exist' });
    config.downloadDir = dir;
    res.json({ downloadDir: config.downloadDir });
});

app.get('/api/config/usdb-credentials', (req, res) => {
    res.json({ username: config.usdbUsername || '', hasPassword: !!config.usdbPassword });
});

app.post('/api/config/usdb-credentials', async (req, res) => {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    let finalPassword = password;
    if (password === '********' || !password) {
        finalPassword = config.usdbPassword;
    }

    try {
        const testCookie = await usdbLogin(username, finalPassword);
        USDB_SESSION_COOKIE = testCookie;
        config.setUsdbCredentials(username, finalPassword);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
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
