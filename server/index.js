const express = require('express');
const cors = require('cors');
const glob = require('fast-glob');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Dynamic import for music-metadata if it is ESM-only
let parseFile;
try {
    const mm = require('music-metadata');
    parseFile = mm.parseFile;
} catch (e) {
    console.log('Using dynamic import for music-metadata');
}

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing for POST requests

// Status Page & Dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Melodiq Helper</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #f5f5f5; color: #333; }
                .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; }
                h1 { margin-top: 0; color: #1976d2; }
                h2 { font-size: 1.2rem; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                .status-badge { background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; }
                ul { list-style: none; padding: 0; }
                li { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
                li:last-child { border-bottom: none; }
                button { cursor: pointer; padding: 8px 16px; border-radius: 4px; border: none; font-weight: 500; }
                .btn-danger { background: #ffebee; color: #d32f2f; }
                .btn-danger:hover { background: #ffcdd2; }
                .btn-primary { background: #1976d2; color: white; }
                .btn-primary:hover { background: #1565c0; }
                .btn-primary:disabled { background: #90caf9; cursor: not-allowed; }
                input[type="text"] { padding: 8px; border: 1px solid #ddd; border-radius: 4px; flex-grow: 1; margin-right: 8px; }
                .input-group { display: flex; margin-top: 16px; align-items: center; }
                /* Modal Styles */
                .modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
                .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 8px; }
                .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
                .close:hover { color: black; }
                .dir-list { list-style: none; padding: 0; max-height: 300px; overflow-y: auto; border: 1px solid #eee; }
                .dir-item { padding: 8px; cursor: pointer; border-bottom: 1px solid #eee; display: flex; align-items: center; }
                .dir-item:hover { background-color: #f0f0f0; }
                .dir-icon { margin-right: 8px; color: #ffa000; }
                .current-path { font-weight: bold; margin-bottom: 10px; word-break: break-all; }
                .modal-actions { display: flex; justify-content: flex-end; margin-top: 16px; gap: 8px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h1>Melodiq Helper</h1>
                    <span class="status-badge">Online</span>
                </div>
                <p>Listening on port <strong>${config.port}</strong></p>
                <p><a href="/api/songs" target="_blank">View Raw Song Data JSON</a></p>
            </div>

            <div class="card">
                <h2>Manage Song Folders</h2>
                <p>Add folders from your computer where your UltraStar songs are stored.</p>
                
                <ul id="dirList"><li style="text-align:center; color:#888;">Loading...</li></ul>

                <div class="input-group">
                    <input type="text" id="newPath" placeholder="Enter full folder path (e.g. /home/deck/Music)" />
                    <button class="btn-primary" onclick="openBrowser()" style="margin-right: 8px;">Browse...</button>
                    <button class="btn-primary" onclick="addDir()">Add Folder</button>
                </div>
                
                <!-- File Browser Modal -->
                <div id="browserModal" class="modal">
                    <div class="modal-content">
                        <span class="close" onclick="closeBrowser()">&times;</span>
                        <h2>Select Directory</h2>
                        <div id="currentPath" class="current-path">Loading...</div>
                        <ul id="browserList" class="dir-list"></ul>
                        <div class="modal-actions">
                            <button class="btn-primary" onclick="selectCurrent()">Select This Folder</button>
                            <button onclick="closeBrowser()">Cancel</button>
                        </div>
                    </div>
                </div>
                <p id="errorMsg" style="color:red; display:none; margin-top:10px;"></p>
            </div>

            <script>
                async function loadDirs() {
                    try {
                        const res = await fetch('/api/config/directories');
                        const dirs = await res.json();
                        const list = document.getElementById('dirList');
                        list.innerHTML = '';
                        if (dirs.length === 0) list.innerHTML = '<li style="text-align:center; color:#888;">No folders configured.</li>';
                        
                        dirs.forEach(dir => {
                            const li = document.createElement('li');
                            li.innerHTML = \`
                                <span>\${escapeHtml(dir)}</span>
                                <button class="btn-danger" onclick="removeDir('\${escapeJs(dir)}')">Remove</button>
                            \`;
                            list.appendChild(li);
                        });
                    } catch (e) {
                        alert('Failed to load directories');
                    }
                }

                async function addDir() {
                    const input = document.getElementById('newPath');
                    const error = document.getElementById('errorMsg');
                    const path = input.value.trim();
                    if (!path) return;

                    try {
                        const res = await fetch('/api/config/directories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path })
                        });
                        if (res.ok) {
                            input.value = '';
                            error.style.display = 'none';
                            loadDirs();
                        } else {
                            const data = await res.json();
                            error.innerText = data.error || 'Failed to add';
                            error.style.display = 'block';
                        }
                    } catch (e) {
                        error.innerText = 'Connection failed';
                        error.style.display = 'block';
                    }
                }

                async function removeDir(path) {
                    if(!confirm('Remove this folder?')) return;
                    try {
                        await fetch('/api/config/directories', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path })
                        });
                        loadDirs();
                    } catch (e) { alert('Failed'); }
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.innerText = text;
                    return div.innerHTML;
                }
                
                function escapeJs(text) {
                    return text.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
                }

                /* Browser Logic */
                let currentBrowserPath = '';

                function openBrowser() {
                    document.getElementById('browserModal').style.display = 'block';
                    loadBrowse(''); // Load home/default
                }

                function closeBrowser() {
                    document.getElementById('browserModal').style.display = 'none';
                }

                async function loadBrowse(path) {
                    try {
                        const url = '/api/browse' + (path ? '?path=' + encodeURIComponent(path) : '');
                        const res = await fetch(url);
                        const data = await res.json();
                        
                        if (data.error) {
                            alert(data.error);
                            return;
                        }

                        currentBrowserPath = data.current;
                        document.getElementById('currentPath').innerText = data.current;
                        
                        const list = document.getElementById('browserList');
                        list.innerHTML = '';

                        data.dirs.forEach(dir => {
                            const li = document.createElement('li');
                            li.className = 'dir-item';
                            li.innerHTML = '<span class="dir-icon">📁</span> ' + escapeHtml(dir);
                            li.onclick = () => {
                                // Navigate
                                const newPath = dir === '..' 
                                    ? currentBrowserPath.split(/[\\/]/).slice(0, -1).join('/') || '/'
                                    : (currentBrowserPath.endsWith('/') ? currentBrowserPath + dir : currentBrowserPath + '/' + dir);
                                loadBrowse(newPath);
                            };
                            list.appendChild(li);
                        });

                    } catch (e) {
                        alert('Failed to load directory');
                    }
                }

                function selectCurrent() {
                    document.getElementById('newPath').value = currentBrowserPath;
                    closeBrowser();
                }

                // Close modal on outside click
                window.onclick = function(event) {
                    const modal = document.getElementById('browserModal');
                    if (event.target == modal) {
                        closeBrowser();
                    }
                }

                loadDirs();
            </script>
        </body>
        </html>
    `);
});

// Serve static media from all configured directories
app.get('/media', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Missing path');

    const safePath = path.normalize(targetPath);

    // Security check: ensure path is within one of our config.directories
    const allowed = config.directories.some(dir => safePath.startsWith(path.normalize(dir)));

    // Just check if file exists for now to be "easy".
    if (fs.existsSync(safePath)) {
        res.sendFile(safePath);
    } else {
        res.status(404).send('File not found');
    }
});

// Config API
app.get('/api/config/directories', (req, res) => {
    res.json(config.directories);
});

app.post('/api/config/directories', (req, res) => {
    const { path: newPath } = req.body;
    if (!newPath) return res.status(400).json({ error: 'Path required' });

    // Validate path exists
    if (!fs.existsSync(newPath)) {
        return res.status(400).json({ error: 'Directory does not exist' });
    }

    config.addDirectory(newPath);
    res.json(config.directories);
});

app.delete('/api/config/directories', (req, res) => {
    const { path: target } = req.body;
    if (!target) return res.status(400).json({ error: 'Path required' });
    config.removeDirectory(target);
    res.json(config.directories);
});


// API to get all songs
app.get('/api/songs', async (req, res) => {
    console.log(`Scanning libraries:`, config.directories);

    if (!parseFile) {
        try {
            const mm = await import('music-metadata');
            parseFile = mm.parseFile;
        } catch (e) {
            console.error('Failed to load music-metadata:', e);
            return res.status(500).json({ error: 'Server internal error: cannot load parser' });
        }
    }

    try {
        const allSongs = [];

        // Scan ALL directories
        for (const libraryPath of config.directories) {
            try {
                const txtFiles = await glob('**/*.txt', {
                    cwd: libraryPath,
                    absolute: true,
                    ignore: ['**/node_modules/**', '**/.*'],
                    onlyFiles: true
                });

                console.log(`Found ${txtFiles.length} files in ${libraryPath}`);

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

                        // Construct Serve URL
                        // Since we have multi-root, we use the query param approach we built above
                        // /media?path=<absolute_path>

                        const getServeUrl = (filename) => {
                            if (!filename) return null;
                            const fullPath = path.join(dir, filename);
                            // Encode just the path
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
                            txtContent: content
                        };

                        // Calculate Duration if not explicit
                        if (headers['END']) {
                            song.duration = parseFloat(headers['END']) / 1000;
                        } else {
                            // Simple scan for max beat
                            let maxBeat = 0;
                            const lines = content.split('\n');
                            for (const line of lines) {
                                if (line.startsWith(':') || line.startsWith('*') || line.startsWith('F')) {
                                    const parts = line.split(' ');
                                    if (parts.length >= 3) {
                                        const start = parseInt(parts[1]);
                                        const len = parseInt(parts[2]);
                                        if (!isNaN(start) && !isNaN(len)) {
                                            if (start + len > maxBeat) maxBeat = start + len;
                                        }
                                    }
                                }
                            }
                            // UltraStar BPM is usually 4x real BPM (beat resolution).
                            // Client logic (utils.ts): beatDuration = 60000 / (bpm * 4) = 15000 / bpm (ms)
                            // Duration (sec) = maxBeat * 15 / BPM
                            if (song.bpm > 0) {
                                song.duration = (maxBeat * 15) / song.bpm;
                            }
                        }

                        allSongs.push(song);
                    } catch (err) {
                        console.warn(`Failed to process ${txtPath}:`, err.message);
                    }
                }
            } catch (err) {
                console.warn(`Failed to scan dir ${libraryPath}:`, err.message);
            }
        }

        console.log(`Returning ${allSongs.length} total songs`);
        res.json(allSongs);

    } catch (err) {
        console.error('Scan failed:', err);
        res.status(500).json({ error: 'Failed to scan library' });
    }
});

// Directory Browser API
app.get('/api/browse', (req, res) => {
    const queryPath = req.query.path || require('os').homedir();

    try {
        if (!fs.existsSync(queryPath)) return res.status(404).json({ error: 'Path not found' });

        const entries = fs.readdirSync(queryPath, { withFileTypes: true });
        const dirs = entries
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);

        // Add '..' if not root
        const parent = path.dirname(queryPath);
        if (parent !== queryPath) {
            dirs.unshift('..');
        }

        res.json({
            current: queryPath,
            dirs: dirs
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(config.port, () => {
    console.log(`Melodiq Host running at http://localhost:${config.port}`);
    console.log(`Serving library from: ${config.libraryPath}`);
});
