const fs = require('fs');
const path = require('path');
const { glob } = require('fast-glob');
const mm = require('music-metadata');
const config = require('../../config');
const { generateId } = require('../utils/helpers');

let SONG_CACHE = [];
let IS_SCANNING = false;
let SCAN_REQUESTED_WHILE_BUSY = false;

const getSongCache = () => SONG_CACHE;
const setSongCache = (val) => { SONG_CACHE = val; };
const isScanning = () => IS_SCANNING;

/**
 * Parses a single UltraStar .txt file into a song object.
 * @param {string} txtPath Absolute path to the .txt file
 * @param {string} [libraryPath] Optional root library directory path
 * @returns {Promise<Object|null>}
 */
async function parseSongFile(txtPath, libraryPath) {
    if (!fs.existsSync(txtPath)) return null;
    const dir = path.dirname(txtPath);

    if (!libraryPath) {
        libraryPath = (config.directories || []).find(d => txtPath.startsWith(d)) || dir;
    }

    let relativePath = path.relative(libraryPath, dir);
    if (relativePath === '') relativePath = '.';

    let content;
    try {
        content = fs.readFileSync(txtPath, 'utf-8');
    } catch (e) {
        return null;
    }
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const headers = {};

    content.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#')) {
            const parts = trimmedLine.substring(1).split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim().toUpperCase();
                const value = parts.slice(1).join(':').trim();
                headers[key] = value;
            }
        }
    });

    if (!headers['TITLE'] || !headers['ARTIST']) {
        return null;
    }

    const extractYouTubeId = (str) => {
        if (!str || typeof str !== 'string') return null;
        let decoded = str;
        try {
            if (str.includes('%')) decoded = decodeURIComponent(str);
        } catch (_) {}

        const urlMatch = decoded.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (urlMatch) return urlMatch[1];

        const usdbMatch = decoded.match(/(?:^|[,\s])(?:v|a)=([a-zA-Z0-9_-]{11})(?:[,\s]|$)/);
        if (usdbMatch) return usdbMatch[1];

        const trimmed = decoded.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
            return trimmed;
        }
        return null;
    };

    const getServeUrl = (filename) => {
        if (!filename) return null;
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
            return filename;
        }
        const ytId = extractYouTubeId(filename);
        if (ytId) {
            return `https://www.youtube.com/watch?v=${ytId}`;
        }
        const floatPath = path.resolve(dir, filename);
        if (fs.existsSync(floatPath)) return floatPath;
        return null;
    };

    const audioPath = getServeUrl(headers['MP3'] || headers['AUDIO']);
    let instrumentalPath = getServeUrl(headers['INSTRUMENTAL']);
    let vocalsPath = getServeUrl(headers['VOCALS']);
    let originalAudioPath = getServeUrl(headers['ORIGINAL'] || headers['ORIGINALAUDIO']);
    const videoPath = getServeUrl(headers['VIDEO']);
    const coverPath = getServeUrl(headers['COVER']);
    const backgroundPath = getServeUrl(headers['BACKGROUND']);

    if (!instrumentalPath && audioPath && (headers['MP3'] || '').toLowerCase().includes('instrumental')) {
        instrumentalPath = audioPath;
    }

    try {
        const dirFiles = fs.readdirSync(dir);
        if (!vocalsPath) {
            const vFile = dirFiles.find(f => f.toLowerCase().endsWith('.mp3') && f.toLowerCase().includes('vocals'));
            if (vFile) vocalsPath = path.resolve(dir, vFile);
        }
        if (!instrumentalPath) {
            const iFile = dirFiles.find(f => f.toLowerCase().endsWith('.mp3') && f.toLowerCase().includes('instrumental'));
            if (iFile) instrumentalPath = path.resolve(dir, iFile);
        }
        if (!originalAudioPath) {
            if (vocalsPath || instrumentalPath) {
                const oFile = dirFiles.find(f => {
                    const lower = f.toLowerCase();
                    const isAudio = lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.ogg') || lower.endsWith('.flac') || lower.endsWith('.wav');
                    return isAudio && !lower.includes('instrumental') && !lower.includes('vocals');
                });
                if (oFile) originalAudioPath = path.resolve(dir, oFile);
            } else {
                originalAudioPath = audioPath;
            }
        }
    } catch (e) { /* ignore */ }

    if (!originalAudioPath && audioPath) {
        originalAudioPath = audioPath;
    }

    const hasSeparation = !!(vocalsPath && (instrumentalPath || audioPath));

    // DURATION CALCULATION
    let duration = 0;
    const durationAudioTarget = originalAudioPath || audioPath || instrumentalPath;
    if (durationAudioTarget) {
        try {
            const metadata = await mm.parseFile(durationAudioTarget, { duration: true, skipCovers: true });
            if (metadata.format.duration) {
                duration = metadata.format.duration;
            }
        } catch (e) {
            // Ignore duration read error
        }
    }

    // Fallback Duration
    if (!duration && headers['END']) {
        duration = parseFloat(headers['END']) / 1000;
    }

    return {
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
        originalAudio: originalAudioPath,
        instrumentalAudio: instrumentalPath,
        vocalsAudio: vocalsPath,
        hasSeparation: hasSeparation,
        cover: coverPath,
        background: backgroundPath,
        txtPath: txtPath,
        txtContent: content,
        duration: duration,
        searchString: `${headers['TITLE']} ${headers['ARTIST']} ${headers['GENRE']} ${headers['LANGUAGE']}`.toLowerCase()
    };
}

/**
 * Instantly indexes or updates a single song in SONG_CACHE without waiting for a full scan.
 * @param {string} txtPath Absolute path to the .txt file
 * @returns {Promise<Object|null>} The parsed song or null
 */
async function addOrUpdateSongInCache(txtPath) {
    try {
        const song = await parseSongFile(txtPath);
        if (!song) return null;
        SONG_CACHE = SONG_CACHE.filter(s => s.id !== song.id && s.txtPath !== song.txtPath);
        SONG_CACHE.push(song);
        console.log(`[Scanner] Instantly indexed song: ${song.artist} - ${song.title} (${SONG_CACHE.length} songs in cache)`);
        return song;
    } catch (e) {
        console.warn(`[Scanner] Failed to index single song for ${txtPath}:`, e.message);
        return null;
    }
}

const scanSongs = async () => {
    if (IS_SCANNING) {
        SCAN_REQUESTED_WHILE_BUSY = true;
        return;
    }
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
                    const song = await parseSongFile(txtPath, libraryPath);
                    if (song) {
                        newSongs.push(song);
                    }
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

    if (SCAN_REQUESTED_WHILE_BUSY) {
        SCAN_REQUESTED_WHILE_BUSY = false;
        setTimeout(scanSongs, 500);
    }
};

module.exports = {
    getSongCache,
    setSongCache,
    isScanning,
    scanSongs,
    parseSongFile,
    addOrUpdateSongInCache
};
