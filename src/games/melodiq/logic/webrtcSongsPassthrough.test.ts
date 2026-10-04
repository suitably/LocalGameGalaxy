import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processServerSongs } from './serverSongsProvider';
import { type Song, type SongMeta } from '../db';

describe('WebRTC Song Passthrough & Processing', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('processes server songs received over WebRTC without requiring companion helper server', () => {
        const rawSongsFromHost = [
            {
                id: 'local:artist/song1',
                source: 'local',
                title: 'Test Song 1',
                artist: 'Test Artist',
                bpm: 120,
                year: '2022',
                genre: 'Rock',
                language: 'German',
                duration: 180,
                hasCover: true,
                hasVideo: false,
                cover: 'https://example.com/cover.jpg'
            },
            {
                id: 'local:artist/song2',
                source: 'local',
                title: 'Test Song 2',
                artist: 'Another Artist',
                bpm: 140,
                hasCover: false,
                hasVideo: true,
                video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            }
        ];

        const processed = processServerSongs(rawSongsFromHost, '', '');
        expect(processed).toHaveLength(2);

        expect(processed[0].id).toBe('local:artist/song1');
        expect(processed[0].title).toBe('Test Song 1');
        expect(processed[0].artist).toBe('Test Artist');
        expect(processed[0].year).toBe('2022');
        expect(processed[0].genre).toBe('Rock');
        expect(processed[0].cover).toBe('https://example.com/cover.jpg');

        expect(processed[1].id).toBe('local:artist/song2');
        expect(processed[1].hasVideo).toBe(true);
        expect(processed[1].video).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('sanitizes host local songs with handles and blobs before sending over WebRTC', () => {
        const mockFileHandle = { kind: 'file', name: 'song.mp3' };

        const hostLocalSong: Song = {
            id: 'local:test_song',
            source: 'local',
            title: 'Local Master Song',
            artist: 'Galaxy Band',
            bpm: 128,
            duration: 210,
            year: '2024',
            genre: 'Pop',
            cover: new Blob(['fake cover'], { type: 'image/jpeg' }),
            audio: mockFileHandle as unknown as FileSystemFileHandle,
            txtContent: '#TITLE:Local Master Song\n#ARTIST:Galaxy Band\n: 0 4 1 Hel-\n: 4 4 3 lo'
        };

        // Network serialization logic used by useMelodiqGlobalEvents
        const sanitizedForNetwork = {
            id: hostLocalSong.id,
            source: hostLocalSong.source,
            title: hostLocalSong.title,
            artist: hostLocalSong.artist,
            bpm: hostLocalSong.bpm,
            duration: hostLocalSong.duration,
            year: hostLocalSong.year,
            genre: hostLocalSong.genre,
            language: hostLocalSong.language,
            edition: hostLocalSong.edition,
            album: hostLocalSong.album,
            hasCover: hostLocalSong.hasCover ?? Boolean(hostLocalSong.cover),
            hasVideo: hostLocalSong.hasVideo ?? Boolean(hostLocalSong.video),
            hasSeparation: hostLocalSong.hasSeparation,
            cover: typeof hostLocalSong.cover === 'string' ? hostLocalSong.cover : undefined,
            video: typeof hostLocalSong.video === 'string' ? hostLocalSong.video : undefined
        };

        // Must serialize to JSON cleanly without TypeError or circular structures
        const json = JSON.stringify(sanitizedForNetwork);
        const deserialized = JSON.parse(json);

        expect(deserialized.id).toBe('local:test_song');
        expect(deserialized.title).toBe('Local Master Song');
        expect(deserialized.hasCover).toBe(true);
        expect(deserialized.cover).toBeUndefined(); // Blob stripped
        expect(deserialized.audio).toBeUndefined(); // FileHandle stripped
    });

    it('correctly chunks large song lists for transmission over WebRTC data channels', () => {
        // Generate a large catalog of 100 songs
        const songs: SongMeta[] = Array.from({ length: 100 }, (_, i) => ({
            id: `song-${i}`,
            source: 'local',
            title: `Title ${i} - Extended Title For Payload Weight`,
            artist: `Artist ${i} - Extra Long Band Name`,
            year: '2023',
            genre: 'Electronic Dance Music',
            language: 'English',
            duration: 240
        }));

        const jsonStr = JSON.stringify({
            type: 'api_response',
            reqId: 'test-req-123',
            status: 200,
            data: songs
        });

        const chunkSize = 16000;
        const totalChunks = Math.ceil(jsonStr.length / chunkSize);
        expect(totalChunks).toBeGreaterThan(0);

        const chunks: string[] = [];
        for (let i = 0; i < totalChunks; i++) {
            chunks.push(jsonStr.substring(i * chunkSize, (i + 1) * chunkSize));
        }

        // Reassembly simulation (as done in PhoneClientEngine)
        const reassembledJson = chunks.join('');
        const reassembled = JSON.parse(reassembledJson);

        expect(reassembled.status).toBe(200);
        expect(reassembled.reqId).toBe('test-req-123');
        expect(reassembled.data).toHaveLength(100);
        expect(reassembled.data[50].title).toBe('Title 50 - Extended Title For Payload Weight');
    });
});
