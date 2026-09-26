import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import * as mm from 'music-metadata';
import { serverConfig } from '../../../config';
import { generateId } from '../../../utils/helpers';
import type { Song } from '../../../core/types';

let SONG_CACHE: Song[] = [];
let IS_SCANNING = false;
let SCAN_REQUESTED_WHILE_BUSY = false;

export const getSongCache = (): Song[] => SONG_CACHE;
export const setSongCache = (val: Song[]): void => {
  SONG_CACHE = val;
};
export const isScanning = (): boolean => IS_SCANNING;

/**
 * Parses a single UltraStar .txt file into a song object.
 */
export async function parseSongFile(txtPath: string, libraryPath?: string): Promise<Song | null> {
  try {
    await fs.promises.access(txtPath);
  } catch {
    return null;
  }
  const dir = path.dirname(txtPath);

  const effectiveLibraryPath =
    libraryPath || (serverConfig.directories || []).find((d) => txtPath.startsWith(d)) || dir;

  let relativePath = path.relative(effectiveLibraryPath, dir);
  if (relativePath === '') relativePath = '.';

  let content: string;
  try {
    content = await fs.promises.readFile(txtPath, 'utf-8');
  } catch {
    return null;
  }
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  const headers: Record<string, string> = {};

  content.split('\n').forEach((line) => {
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

  const extractYouTubeId = (str?: string | null): string | null => {
    if (!str || typeof str !== 'string') return null;
    let decoded = str;
    try {
      if (str.includes('%')) decoded = decodeURIComponent(str);
    } catch {
      // ignore decode error
    }

    const urlMatch = decoded.match(
      /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (urlMatch) return urlMatch[1];

    const usdbMatch = decoded.match(/(?:^|[,\s])(?:v|a)=([a-zA-Z0-9_-]{11})(?:[,\s]|$)/);
    if (usdbMatch) return usdbMatch[1];

    const trimmed = decoded.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  };

  const getServeUrl = async (filename?: string | null): Promise<string | null> => {
    if (!filename) return null;
    const cleanFilename = filename.trim().replace(/^["']|["']$/g, '');
    if (!cleanFilename) return null;
    if (cleanFilename.startsWith('http://') || cleanFilename.startsWith('https://')) {
      return cleanFilename;
    }
    const ytId = extractYouTubeId(cleanFilename);
    if (ytId) {
      return `https://www.youtube.com/watch?v=${ytId}`;
    }
    const floatPath = path.resolve(dir, cleanFilename);
    try {
      await fs.promises.access(floatPath);
      return floatPath;
    } catch {
      return null;
    }
  };

  let [
    audioPath,
    instrumentalPath,
    vocalsPath,
    originalAudioPath,
    videoPath,
    coverPath,
    backgroundPath,
  ] = await Promise.all([
    getServeUrl(headers['MP3'] || headers['AUDIO']),
    getServeUrl(headers['INSTRUMENTAL']),
    getServeUrl(headers['VOCALS']),
    getServeUrl(headers['ORIGINAL'] || headers['ORIGINALAUDIO']),
    getServeUrl(headers['VIDEO']),
    getServeUrl(headers['COVER']),
    getServeUrl(headers['BACKGROUND']),
  ]);

  if (!instrumentalPath && audioPath && (headers['MP3'] || '').toLowerCase().includes('instrumental')) {
    instrumentalPath = audioPath;
  }

  try {
    const dirFiles = await fs.promises.readdir(dir);
    if (!vocalsPath) {
      const vFile = dirFiles.find((f) => f.toLowerCase().endsWith('.mp3') && f.toLowerCase().includes('vocals'));
      if (vFile) vocalsPath = path.resolve(dir, vFile);
    }
    if (!instrumentalPath) {
      const iFile = dirFiles.find((f) => f.toLowerCase().endsWith('.mp3') && f.toLowerCase().includes('instrumental'));
      if (iFile) instrumentalPath = path.resolve(dir, iFile);
    }
    if (!originalAudioPath) {
      if (vocalsPath || instrumentalPath) {
        const oFile = dirFiles.find((f) => {
          const lower = f.toLowerCase();
          const isAudio =
            lower.endsWith('.mp3') ||
            lower.endsWith('.m4a') ||
            lower.endsWith('.ogg') ||
            lower.endsWith('.flac') ||
            lower.endsWith('.wav');
          return isAudio && !lower.includes('instrumental') && !lower.includes('vocals');
        });
        if (oFile) originalAudioPath = path.resolve(dir, oFile);
      } else {
        originalAudioPath = audioPath;
      }
    }
  } catch {
    // Ignore directory read error
  }

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
    } catch {
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
    hasSeparation,
    cover: coverPath,
    background: backgroundPath,
    txtPath,
    txtContent: content,
    duration,
    searchString: `${headers['TITLE']} ${headers['ARTIST']} ${headers['GENRE']} ${headers['LANGUAGE']}`.toLowerCase(),
  };
}

/**
 * Instantly indexes or updates a single song in SONG_CACHE without waiting for a full scan.
 */
export async function addOrUpdateSongInCache(txtPath: string): Promise<Song | null> {
  try {
    const song = await parseSongFile(txtPath);
    if (!song) return null;
    SONG_CACHE = SONG_CACHE.filter((s) => s.id !== song.id && s.txtPath !== song.txtPath);
    SONG_CACHE.push(song);
    console.log(`[Scanner] Instantly indexed song: ${song.artist} - ${song.title} (${SONG_CACHE.length} songs in cache)`);
    return song;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Scanner] Failed to index single song for ${txtPath}:`, msg);
    return null;
  }
}

export const scanSongs = async (): Promise<void> => {
  if (IS_SCANNING) {
    SCAN_REQUESTED_WHILE_BUSY = true;
    return;
  }
  IS_SCANNING = true;
  console.log(`[Scanner] Starting scan of ${serverConfig.directories.length} directories...`);
  const startTime = Date.now();

  const newSongs: Song[] = [];

  if (!serverConfig.directories || !Array.isArray(serverConfig.directories)) {
    console.warn('[Scanner] serverConfig.directories is missing or invalid.');
    SONG_CACHE = [];
    IS_SCANNING = false;
    return;
  }

  for (const libraryPath of serverConfig.directories) {
    try {
      const txtFiles = await fg('**/*.txt', {
        cwd: libraryPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.*'],
        onlyFiles: true,
      });

      for (const txtPath of txtFiles) {
        try {
          const song = await parseSongFile(txtPath, libraryPath);
          if (song) {
            newSongs.push(song);
          }
        } catch {
          // Ignore individual song parse error
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Scanner] Failed to scan ${libraryPath}:`, msg);
    }
  }

  if (newSongs.length === 0) {
    console.warn('[Scanner] No songs found in any of the directories.');
    if (serverConfig.directories.length > 0) {
      console.log(`[Scanner] Checked directories: ${serverConfig.directories.join(', ')}`);
    } else {
      console.warn('[Scanner] No directories configured.');
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
