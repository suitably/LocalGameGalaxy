import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanLocalDirectory, revokeLocalCoverUrls } from './localLibraryProvider';

// Helper to create mock FileSystemFileHandle
function createMockFileHandle(name: string, content: string | Blob): FileSystemFileHandle {
    const file = content instanceof Blob
        ? new File([content], name)
        : new File([content], name, { type: 'text/plain' });

    return {
        kind: 'file',
        name,
        getFile: vi.fn().mockResolvedValue(file),
        isSameEntry: vi.fn(),
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted')
    } as unknown as FileSystemFileHandle;
}

// Helper to create mock FileSystemDirectoryHandle
function createMockDirHandle(
    name: string,
    entries: Array<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
): FileSystemDirectoryHandle {
    const entriesMap = new Map(entries);

    return {
        kind: 'directory',
        name,
        entries: async function* () {
            for (const entry of entriesMap.entries()) {
                yield entry;
            }
        },
        values: async function* () {
            for (const val of entriesMap.values()) {
                yield val;
            }
        },
        getFileHandle: vi.fn((fileName: string) => {
            const h = entriesMap.get(fileName);
            if (h && h.kind === 'file') return Promise.resolve(h);
            return Promise.reject(new Error('File not found'));
        }),
        getDirectoryHandle: vi.fn((dirName: string) => {
            const h = entriesMap.get(dirName);
            if (h && h.kind === 'directory') return Promise.resolve(h);
            return Promise.reject(new Error('Directory not found'));
        }),
        isSameEntry: vi.fn(),
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted')
    } as unknown as FileSystemDirectoryHandle;
}

describe('localLibraryProvider', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Mock URL.createObjectURL and URL.revokeObjectURL
        global.URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-${blob.size}`);
        global.URL.revokeObjectURL = vi.fn();
    });

    it('scans and parses a standard UltraStar song folder', async () => {
        const ultraStarTxt = `
#TITLE:Bohemian Rhapsody
#ARTIST:Queen
#BPM:140
#GAP:500
#MP3:song.mp3
#VIDEO:video.mp4
#COVER:cover.jpg
#YEAR:1975
#GENRE:Rock
: 0 4 60 Is
: 4 4 62 this
: 8 4 64 the
: 12 8 65 real
- 20
E
`;
        const songTxtHandle = createMockFileHandle('Queen - Bohemian Rhapsody.txt', ultraStarTxt);
        const mp3Handle = createMockFileHandle('song.mp3', new Blob(['mp3-data'], { type: 'audio/mpeg' }));
        const videoHandle = createMockFileHandle('video.mp4', new Blob(['mp4-data'], { type: 'video/mp4' }));
        const coverHandle = createMockFileHandle('cover.jpg', new Blob(['jpg-data'], { type: 'image/jpeg' }));

        const songDir = createMockDirHandle('Queen - Bohemian Rhapsody', [
            ['Queen - Bohemian Rhapsody.txt', songTxtHandle],
            ['song.mp3', mp3Handle],
            ['video.mp4', videoHandle],
            ['cover.jpg', coverHandle]
        ]);

        const rootDir = createMockDirHandle('UltraStar Songs', [
            ['Queen - Bohemian Rhapsody', songDir]
        ]);

        const songs = await scanLocalDirectory(rootDir);

        expect(songs).toHaveLength(1);
        const song = songs[0];
        expect(song.source).toBe('local');
        expect(song.title).toBe('Bohemian Rhapsody');
        expect(song.artist).toBe('Queen');
        expect(song.year).toBe('1975');
        expect(song.genre).toBe('Rock');
        expect(song.hasCover).toBe(true);
        expect(song.hasVideo).toBe(true);
        expect(song.audioHandle).toBe(mp3Handle);
        expect(song.videoHandle).toBe(videoHandle);
        expect(song.coverHandle).toBe(coverHandle);
        expect(song.duration).toBeGreaterThan(0);
        expect(song.txtContent).toBe(ultraStarTxt);
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('matches media files case-insensitively and falls back to extensions', async () => {
        const ultraStarTxt = `
#TITLE:Sweet Child O Mine
#ARTIST:Guns N Roses
#BPM:125
#MP3:SweetChild.MP3
#VIDEO:clip.webm
#COVER:Front.PNG
: 0 4 60 Where
E
`;
        // Disk files have lower/different case
        const songTxtHandle = createMockFileHandle('song.txt', ultraStarTxt);
        const mp3Handle = createMockFileHandle('sweetchild.mp3', new Blob(['audio'], { type: 'audio/mpeg' }));
        const webmHandle = createMockFileHandle('clip.webm', new Blob(['video'], { type: 'video/webm' }));
        const pngHandle = createMockFileHandle('front.png', new Blob(['image'], { type: 'image/png' }));

        const rootDir = createMockDirHandle('Rock', [
            ['song.txt', songTxtHandle],
            ['sweetchild.mp3', mp3Handle],
            ['clip.webm', webmHandle],
            ['front.png', pngHandle]
        ]);

        const songs = await scanLocalDirectory(rootDir);

        expect(songs).toHaveLength(1);
        expect(songs[0].title).toBe('Sweet Child O Mine');
        expect(songs[0].audioHandle).toBe(mp3Handle);
        expect(songs[0].videoHandle).toBe(webmHandle);
        expect(songs[0].coverHandle).toBe(pngHandle);
    });

    it('handles YouTube URLs in #VIDEO tag without requiring a local video file', async () => {
        const ultraStarTxt = `
#TITLE:Never Gonna Give You Up
#ARTIST:Rick Astley
#BPM:113
#VIDEO:https://www.youtube.com/watch?v=dQw4w9WgXcQ
#MP3:rick.mp3
: 0 4 60 Never
E
`;
        const songTxtHandle = createMockFileHandle('rick.txt', ultraStarTxt);
        const mp3Handle = createMockFileHandle('rick.mp3', new Blob(['audio'], { type: 'audio/mpeg' }));

        const rootDir = createMockDirHandle('Rick', [
            ['rick.txt', songTxtHandle],
            ['rick.mp3', mp3Handle]
        ]);

        const songs = await scanLocalDirectory(rootDir);

        expect(songs).toHaveLength(1);
        expect(songs[0].video).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(songs[0].hasVideo).toBe(true);
        expect(songs[0].videoHandle).toBeNull();
    });

    it('detects separated stems (#VOCALS and #INSTRUMENTAL)', async () => {
        const ultraStarTxt = `
#TITLE:Billie Jean
#ARTIST:Michael Jackson
#BPM:117
#MP3:billie.mp3
#VOCALS:billie_vocals.mp3
#INSTRUMENTAL:billie_instr.mp3
: 0 4 60 She
E
`;
        const songTxtHandle = createMockFileHandle('billie.txt', ultraStarTxt);
        const mp3Handle = createMockFileHandle('billie.mp3', new Blob(['audio']));
        const vocalsHandle = createMockFileHandle('billie_vocals.mp3', new Blob(['audio']));
        const instrHandle = createMockFileHandle('billie_instr.mp3', new Blob(['audio']));

        const rootDir = createMockDirHandle('MJ', [
            ['billie.txt', songTxtHandle],
            ['billie.mp3', mp3Handle],
            ['billie_vocals.mp3', vocalsHandle],
            ['billie_instr.mp3', instrHandle]
        ]);

        const songs = await scanLocalDirectory(rootDir);

        expect(songs).toHaveLength(1);
        expect(songs[0].hasSeparation).toBe(true);
        expect(songs[0].vocalsAudio).toBe(vocalsHandle);
        expect(songs[0].instrumentalAudio).toBe(instrHandle);
    });

    it('ignores non-UltraStar .txt files and hidden folders', async () => {
        const nonUltraStarTxt = 'This is a readme file with instructions for karaoke.';
        const readmeHandle = createMockFileHandle('readme.txt', nonUltraStarTxt);

        const hiddenTxt = '#TITLE:Hidden\n#BPM:120\n: 0 4 60 A';
        const hiddenDir = createMockDirHandle('.git', [
            ['hidden.txt', createMockFileHandle('hidden.txt', hiddenTxt)]
        ]);

        const rootDir = createMockDirHandle('Root', [
            ['readme.txt', readmeHandle],
            ['.git', hiddenDir]
        ]);

        const songs = await scanLocalDirectory(rootDir);
        expect(songs).toHaveLength(0);
    });

    it('revokes cover Blob URLs on revokeLocalCoverUrls', async () => {
        const ultraStarTxt = `
#TITLE:Song
#ARTIST:Artist
#BPM:120
#MP3:song.mp3
#COVER:cover.jpg
: 0 4 60 Test
E
`;
        const songTxtHandle = createMockFileHandle('song.txt', ultraStarTxt);
        const coverHandle = createMockFileHandle('cover.jpg', new Blob(['img']));
        const mp3Handle = createMockFileHandle('song.mp3', new Blob(['audio']));

        const rootDir = createMockDirHandle('Test', [
            ['song.txt', songTxtHandle],
            ['cover.jpg', coverHandle],
            ['song.mp3', mp3Handle]
        ]);

        await scanLocalDirectory(rootDir);
        expect(URL.createObjectURL).toHaveBeenCalled();

        revokeLocalCoverUrls();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
});
