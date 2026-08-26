const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { getSongCache, isScanning, scanSongs } = require('../services/scanner');
const { resolveSecurePath } = require('../utils/helpers');
const { searchUsdb } = require('../services/usdb');
const { spawnYtDlp, ensureYtDlp } = require('../services/download');

/**
 * Returns a list of all songs in the library. Supports search queries and pagination.
 */
function getSongs(req, res) {
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
            originalAudio: secureUrl(s.originalAudio),
            instrumentalAudio: secureUrl(s.instrumentalAudio),
            vocalsAudio: secureUrl(s.vocalsAudio),
            hasSeparation: !!s.hasSeparation,
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
}

/**
 * Returns details for a single song by its ID.
 */
function getSongById(req, res) {
    const songId = req.params.id;
    const song = getSongCache().find(s => s.id === songId);
    
    if (!song) {
        return res.status(404).json({ error: 'Song not found' });
    }

    const secureUrl = (absPath) => {
        if (!absPath) return null;
        return '/media?path=' + encodeURIComponent(absPath) + '&token=' + config.token;
    };

    const clientSong = {
        ...song,
        video: secureUrl(song.video),
        audio: secureUrl(song.audio),
        originalAudio: secureUrl(song.originalAudio),
        instrumentalAudio: secureUrl(song.instrumentalAudio),
        vocalsAudio: secureUrl(song.vocalsAudio),
        hasSeparation: !!song.hasSeparation,
        cover: secureUrl(song.cover),
        background: secureUrl(song.background)
    };

    res.json(clientSong);
}

/**
 * Deletes a song by its ID.
 */
async function deleteSong(req, res) {
    if (!req.isMasterToken && (!req.apiKey || !req.apiKey.allowSongDeletion)) {
        return res.status(403).json({ error: 'Permission denied: Song deletion not allowed' });
    }
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
            if (fs.existsSync(song.txtPath)) await fs.promises.unlink(song.txtPath);
            if (song.audio && fs.existsSync(song.audio)) await fs.promises.unlink(song.audio);
            if (song.video && fs.existsSync(song.video)) await fs.promises.unlink(song.video);
            if (song.cover && fs.existsSync(song.cover)) await fs.promises.unlink(song.cover);
            if (song.background && fs.existsSync(song.background)) await fs.promises.unlink(song.background);
        } else {
            // Delete the full song directory
            await fs.promises.rm(safeFolder, { recursive: true, force: true });
        }

        scanSongs();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete song: ' + e.message });
    }
}

/**
 * Updates a song's lyrics/text content.
 */
async function updateSongTxt(req, res) {
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
        await fs.promises.writeFile(safePath, txtContent, 'utf-8');
        scanSongs();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save song file: ' + e.message });
    }
}

/**
 * Uploads a video file for a song and updates its TXT file to point to it.
 */
async function uploadSongVideo(req, res) {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
    
    const songId = req.params.id;
    const song = getSongCache().find(s => s.id === songId);
    if (!song || !song.txtPath) return res.status(404).json({ error: 'Song not found' });
    
    const safePath = resolveSecurePath(song.txtPath);
    if (!safePath) return res.status(403).json({ error: 'Access denied' });

    try {
        let txtContent = await fs.promises.readFile(safePath, 'utf-8');
        let lines = txtContent.split('\n');
        
        // Remove existing #VIDEO
        lines = lines.filter(l => !l.match(/^#VIDEO:/i));
        
        // Find MP3 line or TITLE to insert after
        let insertIdx = lines.findIndex(l => l.match(/^#MP3:/i));
        if (insertIdx === -1) insertIdx = lines.findIndex(l => l.match(/^#TITLE:/i));
        if (insertIdx === -1) insertIdx = 0;
        
        const videoFilename = req.file.filename;
        lines.splice(insertIdx + 1, 0, `#VIDEO:${videoFilename}`);
        
        await fs.promises.writeFile(safePath, lines.join('\n'), 'utf-8');
        scanSongs();
        res.json({ success: true, video: videoFilename });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update song video: ' + e.message });
    }
}

/**
 * Checks if the library is currently scanning.
 */
function getScanStatus(req, res) {
    res.json({
        scanning: isScanning(),
        count: getSongCache().length
    });
}

/**
 * Refreshes/rescans the song library.
 */
async function refreshLibrary(req, res) {
    if (isScanning()) return res.status(409).json({ error: 'Scan already in progress' });
    scanSongs();
    res.json({ message: 'Scan started' });
}

/**
 * Performs a search against USDB database.
 */
async function searchUsdbSongs(req, res) {
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
}

/**
 * Searches for a video on YouTube via yt-dlp.
 */
async function searchYoutube(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing search query' });
    
    try {
        // We pass a dummy job for ensureYtDlp
        const mockJob = { log: [] };
        const ytBin = await ensureYtDlp(mockJob);
        
        // Search yt-dlp using ytsearchN:query, return JSON
        const searchLimit = parseInt(req.query.limit) || 5;
        const ytOut = await spawnYtDlp(ytBin, [
            '--dump-json',
            '--no-playlist',
            `ytsearch${searchLimit}:${query}`
        ]);
        
        // ytOut contains one JSON object per line
        const lines = ytOut.split('\n').filter(l => l.trim() !== '');
        const results = lines.map(line => {
            try {
                const data = JSON.parse(line);
                return {
                    id: data.id,
                    title: data.title,
                    duration: data.duration,
                    duration_string: data.duration_string,
                    uploader: data.uploader,
                    url: data.webpage_url,
                    thumbnail: data.thumbnail
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        
        res.json(results);
    } catch (e) {
        console.error('[YouTube Search] Failed:', e.message);
        res.status(500).json({ error: 'Failed to search YouTube: ' + e.message });
    }
}

module.exports = {
    getSongs,
    getSongById,
    deleteSong,
    updateSongTxt,
    uploadSongVideo,
    getScanStatus,
    refreshLibrary,
    searchUsdbSongs,
    searchYoutube
};

