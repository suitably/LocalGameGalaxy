import db, { type Song, type SongContent, type SongMeta, setCachedFiles } from './db';
import { parseUltraStarTxt } from './parser';
import { calculateSongDuration } from './utils';

/**
 * Generates a unique ID for a song based on its content/path.
 * Simple implementation for now.
 */
const generateId = (title: string, artist: string, path: string) => {
    // Use TextEncoder to safely handle Unicode characters before base64 encoding
    const str = `${artist}-${title}-${path}`;
    const bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binaryString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

/**
 * Creates a small thumbnail from an image file.
 * Used for FileList fallback to reduce storage size.
 * @param file The image file to thumbnail
 * @param maxSize Maximum dimension (width or height) in pixels
 * @returns A small Blob thumbnail, or undefined if creation fails
 */
const createThumbnail = async (file: File, maxSize: number = 150): Promise<Blob | undefined> => {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            // Calculate scaled dimensions
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            // Draw to canvas and export as small JPEG
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(undefined);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => resolve(blob || undefined),
                'image/jpeg',
                0.7 // 70% quality for good compression
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(undefined);
        };

        img.src = url;
    });
};

export interface ImportStats {
    totalFound: number;
    processed: number;
    cached: number;
    removed: number;
    errors: number;
    lastLog?: string;
}

export interface ManifestEntry {
    id: string;
    title: string;
    artist: string;
    dirPath: string; // Relative path to directory
    txtFileName: string;
    audioFileName?: string;
    videoFileName?: string;
    coverFileName?: string;
    // Metadata for faster loading without parsing
    duration?: number;
    year?: string;
    genre?: string;
    language?: string;
    edition?: string;
    album?: string;
    bpm?: number;
    gap?: number;
}

export class MelodiqImporter {
    private stopRequested = false;

    public stop() {
        this.stopRequested = true;
    }

    private readonly SUPPORTED_AUDIO_EXT = ['.mp3', '.ogg', '.wav', '.m4a'];
    private readonly SUPPORTED_VIDEO_EXT = ['.mp4', '.avi', '.webm', '.mkv', '.mpg', '.mpeg'];
    private readonly SUPPORTED_IMAGE_EXT = ['.jpg', '.jpeg', '.png'];
    private readonly BATCH_SIZE = 50;

    /**
     * Checks if a manifest file exists in the directory.
     */
    public async checkManifest(dirHandle: FileSystemDirectoryHandle): Promise<boolean> {
        try {
            await dirHandle.getFileHandle('melodiq_manifest.json', { create: false });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fast import using an existing manifest file.
     */
    public async importFromManifest(dirHandle: FileSystemDirectoryHandle, onProgress: (stats: ImportStats) => void, onLog: (msg: string) => void, libraryId?: string): Promise<void> {
        this.stopRequested = false;
        const stats: ImportStats = { totalFound: 0, processed: 0, cached: 0, removed: 0, errors: 0 };
        const log = (msg: string) => {
            onLog(msg);
            stats.lastLog = msg;
        };

        const songBuffer: Song[] = [];
        const metaBuffer: SongMeta[] = [];
        const contentBuffer: SongContent[] = [];
        const processedIds = new Set<string>();

        const flush = async () => {
            if (songBuffer.length > 0) {
                await db.songs.bulkPut(songBuffer);
                await db.songsMeta.bulkPut(metaBuffer);
                await db.songsContent.bulkPut(contentBuffer);
                songBuffer.length = 0;
                metaBuffer.length = 0;
                contentBuffer.length = 0;
                onProgress(stats);
            }
        };

        try {
            if (!libraryId) {
                // Legacy behavior: clear everything if no specific library targeted
                log('Clearing database (Legacy Mode)...');
                await db.songs.clear();
                await db.songsMeta.clear();
                await db.songsContent.clear();
            } else {
                log(`Updating library: ${libraryId}...`);
            }

            log('Reading manifest file...');
            const fileHandle = await dirHandle.getFileHandle('melodiq_manifest.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            const manifest: ManifestEntry[] = JSON.parse(text);

            stats.totalFound = manifest.length;
            onProgress(stats);
            log(`Found ${manifest.length} songs in manifest.`);

            for (const entry of manifest) {
                if (this.stopRequested) {
                    log('Import stopped by user.');
                    break;
                }

                try {
                    // Start by getting the song directory handle
                    let songDirHandle = dirHandle;
                    if (entry.dirPath && entry.dirPath !== '.') {
                        const parts = entry.dirPath.split('/').filter(p => p && p !== '.');
                        for (const part of parts) {
                            songDirHandle = await songDirHandle.getDirectoryHandle(part);
                        }
                    }

                    // Resolve files
                    let audioFile: FileSystemFileHandle | undefined;
                    if (entry.audioFileName) {
                        try {
                            audioFile = await songDirHandle.getFileHandle(entry.audioFileName);
                        } catch { /* missing file */ }
                    }

                    let videoFile: FileSystemFileHandle | undefined;
                    if (entry.videoFileName) {
                        try {
                            videoFile = await songDirHandle.getFileHandle(entry.videoFileName);
                        } catch { /* missing file */ }
                    }

                    let coverHandle: FileSystemFileHandle | undefined;
                    if (entry.coverFileName) {
                        try {
                            coverHandle = await songDirHandle.getFileHandle(entry.coverFileName);
                        } catch { /* missing file */ }
                    }

                    let txtContent = '';
                    try {
                        const txtHandle = await songDirHandle.getFileHandle(entry.txtFileName);
                        const txtFile = await txtHandle.getFile();
                        txtContent = await txtFile.text();
                    } catch (e) {
                        console.warn(`Missing txt file for ${entry.title}`, e);
                        stats.errors++;
                        continue;
                    }

                    const song: Song = {
                        id: entry.id,
                        libraryId,
                        title: entry.title,
                        artist: entry.artist,
                        // txtContent removed
                        dirPath: entry.dirPath,
                        updatedAt: Date.now(),
                        duration: entry.duration,
                        year: entry.year,
                        genre: entry.genre,
                        language: entry.language,
                        edition: entry.edition,
                        album: entry.album
                    };

                    if (audioFile) song.audio = audioFile;
                    if (videoFile) song.video = videoFile;
                    if (coverHandle) song.cover = coverHandle;

                    // Build lightweight metadata
                    const meta: SongMeta = {
                        id: entry.id,
                        libraryId,
                        title: entry.title,
                        artist: entry.artist,
                        duration: entry.duration,
                        year: entry.year,
                        genre: entry.genre,
                        language: entry.language,
                        edition: entry.edition,
                        album: entry.album,
                        hasCover: !!coverHandle,
                        hasVideo: !!videoFile
                    };

                    songBuffer.push(song);
                    metaBuffer.push(meta);
                    contentBuffer.push({ id: entry.id, txtContent });
                    processedIds.add(entry.id);
                    stats.processed++;
                    onProgress(stats); // Update progress after each song

                    if (stats.processed % this.BATCH_SIZE === 0) {
                        await flush();
                    }

                } catch (songErr) {
                    console.error(`Failed to load song from manifest: ${entry.title}`, songErr);
                    log(`Error loading ${entry.title}: ${songErr}`);
                    stats.errors++;
                }
            }

            await flush();

            // Cleanup removed songs if in library mode
            if (libraryId) {
                const existingSongs = await db.songs.where('libraryId').equals(libraryId).toArray();
                const toRemove = existingSongs.filter(s => !processedIds.has(s.id)).map(s => s.id);
                if (toRemove.length > 0) {
                    log(`Removing ${toRemove.length} obsolete songs...`);
                    await db.songs.bulkDelete(toRemove);
                    await db.songsContent.bulkDelete(toRemove);
                    stats.removed = toRemove.length;
                }
            }

            onProgress(stats);
            log('Import Complete.');

        } catch (err) {
            console.error("Failed to import from manifest", err);
            log(`Critical Error: ${err}`);
            throw err;
        }
    }

    /**
     * Scans the directory, parses files, updates DB, AND writes a manifest file.
     */
    public async scanAndGenerateManifest(dirHandle: FileSystemDirectoryHandle, onProgress: (stats: ImportStats) => void, onLog: (msg: string) => void, libraryId?: string): Promise<void> {
        this.stopRequested = false;
        const stats: ImportStats = { totalFound: 0, processed: 0, cached: 0, removed: 0, errors: 0 };
        const log = (msg: string) => {
            onLog(msg);
            stats.lastLog = msg;
        };

        const songBuffer: Song[] = [];
        const metaBuffer: SongMeta[] = [];
        const contentBuffer: SongContent[] = [];
        const processedIds = new Set<string>();

        const flush = async () => {
            if (songBuffer.length > 0) {
                await db.songs.bulkPut(songBuffer);
                await db.songsMeta.bulkPut(metaBuffer);
                await db.songsContent.bulkPut(contentBuffer);
                songBuffer.length = 0;
                metaBuffer.length = 0;
                contentBuffer.length = 0;
                onProgress(stats);
            }
        };

        try {
            if (!libraryId) {
                log('Clearing database (Legacy)...');
                await db.songs.clear();
                await db.songsMeta.clear();
                await db.songsContent.clear();
            } else {
                log(`Scanning library: ${libraryId}...`);
            }

            log('Scanning directory structure...');
            const songDirs = await this.scanForSongDirs(dirHandle);
            stats.totalFound = songDirs.length;
            onProgress(stats);
            log(`Found ${songDirs.length} song directories.`);

            const manifest: ManifestEntry[] = [];

            for (const { dir, relativePath } of songDirs) {
                if (this.stopRequested) {
                    log('Scan stopped by user.');
                    break;
                }
                try {
                    let txtFile: FileSystemFileHandle | undefined;
                    const audioFiles: FileSystemFileHandle[] = [];
                    const videoFiles: FileSystemFileHandle[] = [];
                    const imageFiles: FileSystemFileHandle[] = [];

                    // @ts-ignore
                    for await (const entry of dir.values()) {
                        if (entry.kind === 'file') {
                            const name = entry.name.toLowerCase();
                            if (name.endsWith('.txt')) {
                                txtFile = entry;
                            } else if (this.SUPPORTED_AUDIO_EXT.some(ext => name.endsWith(ext))) {
                                audioFiles.push(entry);
                            } else if (this.SUPPORTED_VIDEO_EXT.some(ext => name.endsWith(ext))) {
                                videoFiles.push(entry);
                            } else if (this.SUPPORTED_IMAGE_EXT.some(ext => name.endsWith(ext))) {
                                imageFiles.push(entry);
                            }
                        }
                    }

                    if (txtFile) {
                        const txtFileObj = await txtFile.getFile();
                        const text = await txtFileObj.text();
                        const parsed = parseUltraStarTxt(text);
                        const title = parsed.headers['TITLE'] || dir.name;
                        const artist = parsed.headers['ARTIST'] || 'Unknown';
                        const id = generateId(title, artist, relativePath);

                        log(`Processing: ${artist} - ${title}`);

                        // Determine audio file
                        let chosenAudioFile: FileSystemFileHandle | undefined;
                        const headerAudio = parsed.headers['MP3'];
                        if (headerAudio) {
                            chosenAudioFile = audioFiles.find(f => f.name.toLowerCase() === headerAudio.toLowerCase());
                        }
                        if (!chosenAudioFile && audioFiles.length > 0) {
                            chosenAudioFile = audioFiles[0];
                        }

                        // Determine video file
                        let chosenVideoFile: FileSystemFileHandle | undefined;
                        const headerVideo = parsed.headers['VIDEO'];
                        if (headerVideo) {
                            chosenVideoFile = videoFiles.find(f => f.name.toLowerCase() === headerVideo.toLowerCase());
                        }
                        if (!chosenVideoFile && videoFiles.length > 0) {
                            chosenVideoFile = videoFiles[0];
                        }

                        // Determine cover image
                        let chosenImageFile: FileSystemFileHandle | undefined;
                        const headerCover = parsed.headers['COVER'];
                        if (headerCover) {
                            chosenImageFile = imageFiles.find(f => f.name.toLowerCase() === headerCover.toLowerCase());
                        }
                        if (!chosenImageFile && imageFiles.length > 0) {
                            chosenImageFile = imageFiles.find(f => f.name.toLowerCase().includes('cover'))
                                || imageFiles.find(f => f.name.toLowerCase().includes('background'))
                                || imageFiles[0];
                        }

                        // Build Song Object
                        const duration = calculateSongDuration(parsed.notes, parsed.bpm, parsed.gap);
                        const song: Song = {
                            id,
                            libraryId,
                            title,
                            artist,
                            // txtContent removed
                            dirPath: relativePath,
                            updatedAt: Date.now(),
                            duration,
                            year: parsed.headers['YEAR'],
                            genre: parsed.headers['GENRE'],
                            language: parsed.headers['LANGUAGE'],
                            edition: parsed.headers['EDITION'],
                            album: parsed.headers['ALBUM']
                        };

                        if (chosenAudioFile) song.audio = chosenAudioFile; // @ts-ignore
                        if (chosenVideoFile) song.video = chosenVideoFile; // @ts-ignore
                        if (chosenImageFile) song.cover = chosenImageFile; // @ts-ignore

                        // Build lightweight metadata
                        const meta: SongMeta = {
                            id,
                            libraryId,
                            title,
                            artist,
                            duration,
                            year: parsed.headers['YEAR'],
                            genre: parsed.headers['GENRE'],
                            language: parsed.headers['LANGUAGE'],
                            edition: parsed.headers['EDITION'],
                            album: parsed.headers['ALBUM'],
                            hasCover: !!chosenImageFile,
                            hasVideo: !!chosenVideoFile
                        };

                        songBuffer.push(song);
                        metaBuffer.push(meta);
                        contentBuffer.push({ id, txtContent: text });
                        processedIds.add(id);
                        stats.processed++;
                        onProgress(stats); // Update progress after each song

                        // Add to Manifest
                        manifest.push({
                            id,
                            title,
                            artist,
                            dirPath: relativePath,
                            txtFileName: txtFile.name,
                            audioFileName: chosenAudioFile?.name,
                            videoFileName: chosenVideoFile?.name,
                            coverFileName: chosenImageFile?.name,
                            duration,
                            year: song.year,
                            genre: song.genre,
                            language: song.language,
                            edition: song.edition,
                            album: song.album,
                            bpm: parsed.bpm,
                            gap: parsed.gap
                        });

                        if (stats.processed % this.BATCH_SIZE === 0) {
                            await flush();
                        }
                    }
                } catch (err) {
                    console.error(`Error processing dir ${dir.name}`, err);
                    log(`Error processing ${dir.name}: ${err}`);
                    stats.errors++;
                }
            }

            await flush();

            // Cleanup removed songs if in library mode
            if (libraryId) {
                const existingSongs = await db.songs.where('libraryId').equals(libraryId).toArray();
                const toRemove = existingSongs.filter(s => !processedIds.has(s.id)).map(s => s.id);
                if (toRemove.length > 0) {
                    log(`Removing ${toRemove.length} obsolete songs...`);
                    await db.songs.bulkDelete(toRemove);
                    await db.songsMeta.bulkDelete(toRemove);
                    await db.songsContent.bulkDelete(toRemove);
                    stats.removed = toRemove.length;
                }
            }

            onProgress(stats);

            // Write Manifest File
            try {
                log('Writing manifest file...');
                const fileHandle = await dirHandle.getFileHandle('melodiq_manifest.json', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(manifest, null, 2));
                await writable.close();
                log('Manifest saved.');
            } catch (e) {
                console.warn('Failed to write manifest file', e);
                log(`Error writing manifest: ${e}`);
            }
            log('Scan complete.');
        } catch (e) {
            console.error(e);
            log(`Critical Error: ${e}`);
        }
    }

    private async scanForSongDirs(dirHandle: FileSystemDirectoryHandle): Promise<{ dir: FileSystemDirectoryHandle, relativePath: string }[]> {
        const results: { dir: FileSystemDirectoryHandle, relativePath: string }[] = [];

        // Helper to traverse
        async function traverse(currentDir: FileSystemDirectoryHandle, currentPath: string) {
            // Check if this dir IS a song dir (has .txt)
            let hasTxt = false;
            // @ts-ignore
            for await (const entry of currentDir.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
                    hasTxt = true;
                    break;
                }
            }
            if (hasTxt) {
                results.push({ dir: currentDir, relativePath: currentPath });
            }

            // Recurse into subdirs
            // @ts-ignore
            for await (const entry of currentDir.values()) {
                if (entry.kind === 'directory') {
                    // Avoid loop? FileSystemHandle doesn't expose full path, keeping relativePath manually
                    const newPath = currentPath === '.' ? entry.name : `${currentPath}/${entry.name}`;
                    await traverse(entry, newPath);
                }
            }
        }

        await traverse(dirHandle, '.'); // Start with dot as relative root
        return results;
    }

    /**
     * Fallback for browsers that don't support File System Access API (like Firefox).
     * NOTE: Manifest logic is trickier with FileList (no write access). 
     * We will just do a standard scan-and-replace here, no manifest writing.
     */
    /**
     * Fallback for browsers that don't support File System Access API (like Firefox).
     * NOTE: Manifest logic is trickier with FileList (no write access). 
     * We will just do a standard scan-and-replace here, no manifest writing.
     */
    public async importFromFileList(fileList: FileList, onProgress: (stats: ImportStats) => void, onLog: (msg: string) => void, libraryId?: string): Promise<void> {
        this.stopRequested = false;
        const stats: ImportStats = { totalFound: 0, processed: 0, cached: 0, removed: 0, errors: 0 };
        const log = (msg: string) => {
            onLog(msg);
            stats.lastLog = msg;
        };

        const songBuffer: Song[] = [];
        const metaBuffer: SongMeta[] = [];
        const contentBuffer: SongContent[] = [];
        const processedIds = new Set<string>();

        const flush = async () => {
            if (songBuffer.length > 0) {
                await db.songs.bulkPut(songBuffer);
                await db.songsMeta.bulkPut(metaBuffer);
                await db.songsContent.bulkPut(contentBuffer);
                songBuffer.length = 0;
                metaBuffer.length = 0;
                contentBuffer.length = 0;
                onProgress(stats);
            }
        };

        try {
            if (!libraryId) {
                log('Clearing database (Legacy)...');
                await db.songs.clear();
                await db.songsMeta.clear();
                await db.songsContent.clear();
            } else {
                log(`Scanning library: ${libraryId}...`);
            }

            const dirGroups: Record<string, File[]> = {};
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const pathParts = file.webkitRelativePath.split('/');
                pathParts.pop();
                const dirPath = pathParts.join('/');
                if (!dirGroups[dirPath]) {
                    dirGroups[dirPath] = [];
                }
                dirGroups[dirPath].push(file);
            }

            const dirs = Object.values(dirGroups);
            stats.totalFound = dirs.length;
            onProgress(stats);
            log(`Found ${dirs.length} directory groups.`);

            for (const files of dirs) {
                if (this.stopRequested) {
                    log('Stopped by user.');
                    break;
                }
                try {
                    let txtFile: File | undefined;
                    const audioFiles: File[] = [];
                    const videoFiles: File[] = [];
                    const imageFiles: File[] = [];

                    for (const file of files) {
                        const name = file.name.toLowerCase();
                        if (name.endsWith('.txt')) {
                            txtFile = file;
                        } else if (this.SUPPORTED_AUDIO_EXT.some(ext => name.endsWith(ext))) {
                            audioFiles.push(file);
                        } else if (this.SUPPORTED_VIDEO_EXT.some(ext => name.endsWith(ext))) {
                            videoFiles.push(file);
                        } else if (this.SUPPORTED_IMAGE_EXT.some(ext => name.endsWith(ext))) {
                            imageFiles.push(file);
                        }
                    }

                    if (txtFile) {
                        const text = await txtFile.text();
                        const parsed = parseUltraStarTxt(text);
                        const dirName = txtFile.webkitRelativePath.split('/').slice(-2, -1)[0];
                        const fullRelPath = txtFile.webkitRelativePath.split('/').slice(0, -1).join('/');

                        const title = parsed.headers['TITLE'] || dirName;
                        const artist = parsed.headers['ARTIST'] || 'Unknown';
                        const id = generateId(title, artist, fullRelPath);

                        log(`Processing: ${artist} - ${title}`);

                        let chosenAudioFile: File | undefined;
                        const headerAudio = parsed.headers['MP3'];

                        if (headerAudio) {
                            chosenAudioFile = audioFiles.find(f => f.name.toLowerCase() === headerAudio.toLowerCase());
                        }
                        if (!chosenAudioFile && audioFiles.length > 0) {
                            chosenAudioFile = audioFiles[0];
                        }

                        let chosenVideoFile: File | undefined;
                        const headerVideo = parsed.headers['VIDEO'];
                        if (headerVideo) {
                            chosenVideoFile = videoFiles.find(f => f.name.toLowerCase() === headerVideo.toLowerCase());
                        }
                        if (!chosenVideoFile && videoFiles.length > 0) {
                            chosenVideoFile = videoFiles[0];
                        }

                        let chosenImageFile: File | undefined;
                        const headerCover = parsed.headers['COVER'];
                        if (headerCover) {
                            chosenImageFile = imageFiles.find(f => f.name.toLowerCase() === headerCover.toLowerCase());
                        }
                        if (!chosenImageFile && imageFiles.length > 0) {
                            chosenImageFile = imageFiles.find(f => f.name.toLowerCase().includes('cover'))
                                || imageFiles.find(f => f.name.toLowerCase().includes('background'))
                                || imageFiles[0];
                        }

                        const song: Song = {
                            id,
                            libraryId,
                            title,
                            artist,
                            // txtContent removed
                            dirPath: fullRelPath,
                            updatedAt: Date.now(),
                            duration: calculateSongDuration(parsed.notes, parsed.bpm, parsed.gap),
                            year: parsed.headers['YEAR'],
                            genre: parsed.headers['GENRE'],
                            language: parsed.headers['LANGUAGE'],
                            edition: parsed.headers['EDITION'],
                            album: parsed.headers['ALBUM']
                        };

                        // FileList fallback: Store only filenames, not actual file blobs
                        // This prevents QuotaExceededError with large libraries
                        if (chosenAudioFile) song.audio = chosenAudioFile.name;
                        if (chosenVideoFile) song.video = chosenVideoFile.name;

                        // Create small thumbnail for cover (reduces ~500KB to ~10KB)
                        if (chosenImageFile) {
                            const thumbnail = await createThumbnail(chosenImageFile, 150);
                            if (thumbnail) song.cover = thumbnail;
                        }

                        // Cache actual File objects in memory for same-session playback
                        // This avoids the need to re-select folder during current browser session
                        setCachedFiles(id, {
                            audio: chosenAudioFile,
                            video: chosenVideoFile,
                            cover: chosenImageFile
                        });

                        // Build lightweight metadata
                        const meta: SongMeta = {
                            id,
                            libraryId,
                            title,
                            artist,
                            duration: song.duration,
                            year: song.year,
                            genre: song.genre,
                            language: song.language,
                            edition: song.edition,
                            album: song.album,
                            hasCover: !!song.cover,
                            hasVideo: !!chosenVideoFile
                        };

                        songBuffer.push(song);
                        metaBuffer.push(meta);
                        contentBuffer.push({ id, txtContent: text });
                        processedIds.add(id);

                        stats.processed++;
                        onProgress(stats); // Update progress after each song

                        if (stats.processed % this.BATCH_SIZE === 0) {
                            await flush();
                        }
                    }
                } catch (err) {
                    console.error(err);
                    log(`Error: ${err}`);
                    stats.errors++;
                }
            }

            await flush();

            // Cleanup removed songs if in library mode
            if (libraryId) {
                const existingSongs = await db.songs.where('libraryId').equals(libraryId).toArray();
                const toRemove = existingSongs.filter(s => !processedIds.has(s.id)).map(s => s.id);
                if (toRemove.length > 0) {
                    log(`Removing ${toRemove.length} obsolete songs...`);
                    await db.songs.bulkDelete(toRemove);
                    await db.songsMeta.bulkDelete(toRemove);
                    await db.songsContent.bulkDelete(toRemove);
                    stats.removed = toRemove.length;
                }
            }

            onProgress(stats);
            log('Import complete.');
        } catch (e) {
            console.error(e);
            log(`Critical Error: ${e}`);
        }
    }
}
