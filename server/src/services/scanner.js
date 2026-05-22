const fs = require('fs');
const path = require('path');
const { glob } = require('fast-glob');
const mm = require('music-metadata');
const config = require('../../config');
const { generateId } = require('../utils/helpers');

let SONG_CACHE = [];
let IS_SCANNING = false;

const getSongCache = () => SONG_CACHE;
const setSongCache = (val) => { SONG_CACHE = val; };
const isScanning = () => IS_SCANNING;

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
                        txtPath: txtPath,
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

module.exports = {
    getSongCache,
    setSongCache,
    isScanning,
    scanSongs
};
