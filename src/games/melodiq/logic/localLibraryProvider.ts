import { type Song } from '../db';
import { parseUltraStarTxt, type ParsedSong } from '../parser';
import { getYouTubeVideoId } from '../gameplay/YouTubeBackgroundPlayer';

export interface LocalSong extends Song {
    source: 'local';
    directoryHandle: FileSystemDirectoryHandle;
    txtHandle: FileSystemFileHandle;
    audioHandle: FileSystemFileHandle | null;
    videoHandle: FileSystemFileHandle | null;
    coverHandle: FileSystemFileHandle | null;
}

export interface ScanProgress {
    scannedFolders: number;
    scannedFiles: number;
    foundSongs: number;
    currentFolder?: string;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.opus', '.webm', '.aac'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Track created blob URLs to prevent memory leaks on rescan
const activeCoverBlobUrls = new Set<string>();

/**
 * Revokes all Blob URLs previously created for local covers.
 */
export function revokeLocalCoverUrls(): void {
    activeCoverBlobUrls.forEach(url => {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // ignore revoke errors
        }
    });
    activeCoverBlobUrls.clear();
}

/**
 * Clean header value: removes surrounding quotes, trim, strip leading path separators
 */
function cleanHeaderFilename(raw?: string): string | null {
    if (!raw) return null;
    const trimmed = raw.trim().replace(/^["']|["']$/g, '');
    if (!trimmed) return null;
    // Strip leading ./ or .\ or /
    return trimmed.replace(/^(\.\/|\.\\|\/|\\)+/, '');
}

/**
 * Finds a file in the directory files map by exact name, case-insensitive name, or extension fallback.
 */
function resolveFileHandle(
    files: Map<string, FileSystemFileHandle>,
    lowerFiles: Map<string, FileSystemFileHandle>,
    headerFilename: string | null,
    fallbackExtensions: string[]
): FileSystemFileHandle | null {
    if (headerFilename) {
        // 1. Exact match
        const exact = files.get(headerFilename);
        if (exact) return exact;

        // 2. Case-insensitive match
        const lower = lowerFiles.get(headerFilename.toLowerCase());
        if (lower) return lower;

        // 3. Basename match without leading directory components
        const baseName = headerFilename.split(/[/\\]/).pop() || '';
        if (baseName) {
            const baseExact = files.get(baseName);
            if (baseExact) return baseExact;
            const baseLower = lowerFiles.get(baseName.toLowerCase());
            if (baseLower) return baseLower;
        }
    }

    // 4. Fallback: first file matching any of the candidate extensions
    for (const [name, handle] of files) {
        const lowerName = name.toLowerCase();
        if (fallbackExtensions.some(ext => lowerName.endsWith(ext))) {
            return handle;
        }
    }

    return null;
}

/**
 * Calculates estimated song duration in seconds from parsed UltraStar data.
 */
function estimateDuration(parsed: ParsedSong): number {
    let maxBeat = 0;
    for (const track of parsed.tracks) {
        for (const note of track.notes) {
            const endBeat = note.start + note.duration;
            if (endBeat > maxBeat) {
                maxBeat = endBeat;
            }
        }
    }

    if (maxBeat > 0 && parsed.bpm > 0) {
        const totalMs = (maxBeat / parsed.bpm) * (60_000 / 4) + (parsed.gap || 0);
        return Math.max(0, Math.ceil(totalMs / 1000));
    }

    return 0;
}

/**
 * Recursively scans a FileSystemDirectoryHandle for UltraStar songs.
 */
export async function scanLocalDirectory(
    dirHandle: FileSystemDirectoryHandle,
    onProgress?: ScanProgressCallback
): Promise<LocalSong[]> {
    revokeLocalCoverUrls();

    const results: LocalSong[] = [];
    const progress: ScanProgress = {
        scannedFolders: 0,
        scannedFiles: 0,
        foundSongs: 0
    };

    async function traverse(currentDir: FileSystemDirectoryHandle, currentPath: string): Promise<void> {
        progress.scannedFolders++;
        progress.currentFolder = currentPath || currentDir.name;
        onProgress?.({ ...progress });

        const files = new Map<string, FileSystemFileHandle>();
        const lowerFiles = new Map<string, FileSystemFileHandle>();
        const subDirs: Array<{ name: string; handle: FileSystemDirectoryHandle }> = [];

        // @ts-ignore - entries() is standard on FileSystemDirectoryHandle in DOM
        for await (const [name, handle] of currentDir.entries()) {
            if (name.startsWith('.') || name.startsWith('$')) continue; // Skip hidden / system files

            if (handle.kind === 'directory') {
                subDirs.push({ name, handle: handle as FileSystemDirectoryHandle });
            } else if (handle.kind === 'file') {
                progress.scannedFiles++;
                files.set(name, handle as FileSystemFileHandle);
                lowerFiles.set(name.toLowerCase(), handle as FileSystemFileHandle);
            }
        }

        // Look for .txt files in the current folder
        for (const [fileName, fileHandle] of files) {
            if (!fileName.toLowerCase().endsWith('.txt')) continue;

            try {
                const file = await fileHandle.getFile();
                // Read text
                const text = await file.text();

                // Check if it looks like an UltraStar file
                if (!text.includes('#TITLE:') || (!text.includes('#BPM:') && !text.includes('#MP3:') && !text.includes('#AUDIO:'))) {
                    continue;
                }

                const parsed = parseUltraStarTxt(text);
                const title = parsed.headers['TITLE'] || fileName.replace(/\.txt$/i, '');
                const artist = parsed.headers['ARTIST'] || 'Unknown Artist';

                const rawMp3 = cleanHeaderFilename(parsed.headers['MP3'] || parsed.headers['AUDIO']);
                const rawVideo = cleanHeaderFilename(parsed.headers['VIDEO']);
                const rawCover = cleanHeaderFilename(parsed.headers['COVER'] || parsed.headers['BACKGROUND']);
                const rawVocals = cleanHeaderFilename(parsed.headers['VOCALS']);
                const rawInstrumental = cleanHeaderFilename(parsed.headers['INSTRUMENTAL']);

                const audioHandle = resolveFileHandle(files, lowerFiles, rawMp3, AUDIO_EXTENSIONS);
                const coverHandle = resolveFileHandle(files, lowerFiles, rawCover, IMAGE_EXTENSIONS);
                const vocalsHandle = rawVocals ? resolveFileHandle(files, lowerFiles, rawVocals, AUDIO_EXTENSIONS) : null;
                const instrumentalHandle = rawInstrumental ? resolveFileHandle(files, lowerFiles, rawInstrumental, AUDIO_EXTENSIONS) : null;

                // Handle video: check if header is YouTube or a local file
                let videoTarget: string | FileSystemFileHandle | undefined;
                let videoHandle: FileSystemFileHandle | null = null;

                if (rawVideo) {
                    const ytId = getYouTubeVideoId(rawVideo);
                    if (ytId) {
                        videoTarget = `https://www.youtube.com/watch?v=${ytId}`;
                    } else {
                        videoHandle = resolveFileHandle(files, lowerFiles, rawVideo, VIDEO_EXTENSIONS);
                        if (videoHandle) videoTarget = videoHandle;
                    }
                } else {
                    // Fallback to video file if present
                    videoHandle = resolveFileHandle(files, lowerFiles, null, VIDEO_EXTENSIONS);
                    if (videoHandle) videoTarget = videoHandle;
                }

                // Create cover Blob URL if cover file exists
                let coverUrl: string | undefined;
                if (coverHandle) {
                    try {
                        const coverFile = await coverHandle.getFile();
                        coverUrl = URL.createObjectURL(coverFile);
                        activeCoverBlobUrls.add(coverUrl);
                    } catch (e) {
                        console.warn('[LocalLibrary] Failed to create cover URL:', e);
                    }
                }

                const duration = estimateDuration(parsed);
                const relativeSongPath = currentPath ? `${currentPath}/${fileName}` : fileName;
                const songId = `local:${relativeSongPath}`;

                const song: LocalSong = {
                    id: songId,
                    source: 'local',
                    title,
                    artist,
                    year: parsed.headers['YEAR'],
                    genre: parsed.headers['GENRE'],
                    language: parsed.headers['LANGUAGE'],
                    edition: parsed.headers['EDITION'],
                    album: parsed.headers['ALBUM'],
                    duration,
                    audio: audioHandle || undefined,
                    originalAudio: audioHandle || undefined,
                    instrumentalAudio: instrumentalHandle || undefined,
                    vocalsAudio: vocalsHandle || undefined,
                    hasSeparation: Boolean(vocalsHandle || instrumentalHandle),
                    video: videoTarget,
                    cover: coverUrl,
                    hasCover: Boolean(coverUrl),
                    hasVideo: Boolean(videoTarget),
                    dirPath: currentPath || currentDir.name,
                    txtContent: text,
                    directoryHandle: currentDir,
                    txtHandle: fileHandle,
                    audioHandle,
                    videoHandle,
                    coverHandle
                };

                results.push(song);
                progress.foundSongs = results.length;
                onProgress?.({ ...progress });
            } catch (e) {
                console.warn(`[LocalLibrary] Failed to parse UltraStar file ${fileName}:`, e);
            }
        }

        // Recurse into subdirectories
        for (const subDir of subDirs) {
            const nextPath = currentPath ? `${currentPath}/${subDir.name}` : subDir.name;
            await traverse(subDir.handle, nextPath);
        }
    }

    await traverse(dirHandle, '');
    return results;
}
