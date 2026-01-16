import { db, type Song } from './db';
import { parseUltraStarTxt } from './parser';

/**
 * Generates a unique ID for a song based on its content/path.
 * Simple implementation for now.
 */
const generateId = (title: string, artist: string, path: string) => {
    return btoa(`${artist}-${title}-${path}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

export interface FileSystemHandleCommon {
    name: string;
    kind: 'file' | 'directory';
}

export interface ImportStats {
    totalFound: number;
    processed: number;
    cached: number;
    errors: number;
}

export class MelodiqImporter {
    private stopRequested = false;

    public stop() {
        this.stopRequested = true;
    }

    private readonly SUPPORTED_AUDIO_EXT = ['.mp3', '.ogg', '.wav', '.m4a'];
    private readonly SUPPORTED_VIDEO_EXT = ['.mp4', '.avi', '.webm', '.mkv', '.mpg', '.mpeg'];
    private readonly SUPPORTED_IMAGE_EXT = ['.jpg', '.jpeg', '.png'];

    /**
     * Entry point to import from a directory handle.
     */
    public async importFromHandle(dirHandle: FileSystemDirectoryHandle, onProgress: (stats: ImportStats) => void): Promise<void> {
        this.stopRequested = false;
        const stats: ImportStats = { totalFound: 0, processed: 0, cached: 0, errors: 0 };
        const songDirs = await this.scanForSongDirs(dirHandle);
        stats.totalFound = songDirs.length;
        onProgress(stats);

        // Check for existing cache file in root
        try {
            const cacheFileHandle = await dirHandle.getFileHandle('melodiq_cache.json', { create: false });
            const file = await cacheFileHandle.getFile();
            await file.text(); // Just validation
        } catch {
            // No cache found, ignore
        }

        const newCache: Record<string, Partial<Song>> = {};

        for (const subDir of songDirs) {
            if (this.stopRequested) break;
            try {
                let txtFile: FileSystemFileHandle | undefined;
                const audioFiles: FileSystemFileHandle[] = [];
                const videoFiles: FileSystemFileHandle[] = [];
                const imageFiles: FileSystemFileHandle[] = [];

                // @ts-ignore
                for await (const entry of subDir.values()) {
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
                    const file = await txtFile.getFile();
                    const text = await file.text();
                    const parsed = parseUltraStarTxt(text);
                    const title = parsed.headers['TITLE'] || subDir.name;
                    const artist = parsed.headers['ARTIST'] || 'Unknown';
                    const id = generateId(title, artist, subDir.name);

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
                        // If no specific cover is set, try to find one with "cover" or "background" in name, or just first one
                        chosenImageFile = imageFiles.find(f => f.name.toLowerCase().includes('cover'))
                            || imageFiles.find(f => f.name.toLowerCase().includes('background'))
                            || imageFiles[0];
                    }

                    const song: Song = {
                        id,
                        title,
                        artist,
                        txtContent: text,
                        dirPath: subDir.name,
                        updatedAt: Date.now()
                    };

                    if (chosenAudioFile) {
                        try {
                            song.audio = await chosenAudioFile.getFile();
                        } catch (e) {
                            console.warn('Failed to get audio file', e);
                        }
                    }

                    if (chosenVideoFile) {
                        try {
                            song.video = await chosenVideoFile.getFile();
                        } catch (e) {
                            console.warn('Failed to get video file', e);
                        }
                    }

                    if (chosenImageFile) {
                        try {
                            song.cover = await chosenImageFile.getFile();
                        } catch (e) {
                            console.warn('Failed to get cover file', e);
                        }
                    }

                    await db.songs.put(song);
                    newCache[subDir.name] = { id, title, artist, updatedAt: Date.now() };
                }

                stats.processed++;
                onProgress(stats);

            } catch (err) {
                console.error(err);
                stats.errors++;
            }
        }

        // Write new cache file (if possible)
        try {
            const cacheFileHandle = await dirHandle.getFileHandle('melodiq_cache.json', { create: true });
            const writable = await cacheFileHandle.createWritable();
            await writable.write(JSON.stringify(newCache, null, 2));
            await writable.close();
        } catch (e) {
            console.warn('Could not write cache file to directory', e);
        }
    }

    private async scanForSongDirs(dirHandle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle[]> {
        const results: FileSystemDirectoryHandle[] = [];
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                let hasTxt = false;
                // @ts-ignore
                for await (const sub of entry.values()) {
                    if (sub.kind === 'file' && sub.name.endsWith('.txt')) {
                        hasTxt = true;
                        break;
                    }
                }
                if (hasTxt) {
                    results.push(entry);
                }
            }
        }
        return results;
    }

    /**
     * Fallback for browsers that don't support File System Access API (like Firefox).
     */
    public async importFromFileList(fileList: FileList, onProgress: (stats: ImportStats) => void): Promise<void> {
        this.stopRequested = false;
        const stats: ImportStats = { totalFound: 0, processed: 0, cached: 0, errors: 0 };

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

        for (const files of dirs) {
            if (this.stopRequested) break;
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

                    const title = parsed.headers['TITLE'] || dirName;
                    const artist = parsed.headers['ARTIST'] || 'Unknown';
                    const id = generateId(title, artist, dirName);

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
                        title,
                        artist,
                        txtContent: text,
                        dirPath: dirName,
                        updatedAt: Date.now()
                    };

                    if (chosenAudioFile) {
                        song.audio = chosenAudioFile;
                    }
                    if (chosenVideoFile) {
                        song.video = chosenVideoFile;
                    }
                    if (chosenImageFile) {
                        song.cover = chosenImageFile;
                    }

                    await db.songs.put(song);

                    stats.processed++;
                    onProgress(stats);

                }
            } catch (err) {
                console.error(err);
                stats.errors++;
            }
        }
    }
}
