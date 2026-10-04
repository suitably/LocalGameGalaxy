import { storage } from '../../../lib/storage';
import { melodiqFetchDirect } from '../api/melodiqFetch';
import { type Song, type SongMeta } from '../db';

interface HostApiRequestOptions {
    manager: any;
    peerId: string;
    data: any;
    songs: SongMeta[];
    getSongById: (id: string) => Promise<Song | undefined>;
}

export async function handleHostApiRequest({
    manager,
    peerId,
    data,
    songs,
    getSongById
}: HostApiRequestOptions): Promise<void> {
    try {
        let resData: unknown;
        const path = String(data.path || '');
        const isSongList = path === '/api/songs' || path === '/api/songs/' || path.startsWith('/api/songs?');

        if (isSongList) {
            if (songs && songs.length > 0) {
                resData = songs.map(s => ({
                    id: s.id,
                    source: s.source,
                    title: s.title,
                    artist: s.artist,
                    bpm: (s as unknown as { bpm?: number }).bpm,
                    duration: s.duration,
                    year: s.year,
                    genre: s.genre,
                    language: s.language,
                    edition: s.edition,
                    album: s.album,
                    hasCover: s.hasCover ?? Boolean(s.cover),
                    hasVideo: s.hasVideo ?? Boolean(s.video),
                    hasSeparation: s.hasSeparation,
                    cover: typeof s.cover === 'string' ? s.cover : undefined,
                    video: typeof s.video === 'string' ? s.video : undefined
                }));
            } else if (storage.isHelperActive()) {
                try {
                    resData = await melodiqFetchDirect(data.path, data.options);
                } catch {
                    resData = [];
                }
            } else {
                resData = [];
            }
        } else if (path.startsWith('/api/songs/') && path !== '/api/songs/refresh') {
            let songId = path.substring(11);
            try { songId = decodeURIComponent(songId); } catch { /* ignore */ }
            if (songId) {
                const fullSong = await getSongById(songId);
                if (fullSong) {
                    resData = {
                        id: fullSong.id,
                        source: fullSong.source,
                        title: fullSong.title,
                        artist: fullSong.artist,
                        bpm: fullSong.bpm,
                        gap: fullSong.gap,
                        year: fullSong.year,
                        genre: fullSong.genre,
                        language: fullSong.language,
                        edition: fullSong.edition,
                        album: fullSong.album,
                        duration: fullSong.duration,
                        hasCover: fullSong.hasCover ?? Boolean(fullSong.cover),
                        hasVideo: fullSong.hasVideo ?? Boolean(fullSong.video),
                        hasSeparation: fullSong.hasSeparation,
                        video: typeof fullSong.video === 'string' ? fullSong.video : undefined,
                        cover: typeof fullSong.cover === 'string' ? fullSong.cover : undefined,
                        txtContent: fullSong.txtContent
                    };
                }
            }
        }

        if (!resData && storage.isHelperActive()) {
            try {
                resData = await melodiqFetchDirect(data.path, data.options);
            } catch (e) {
                if (isSongList) resData = [];
                else throw e;
            }
        }

        // Strip heavy fields from /api/songs to keep payload manageable
        if (isSongList && Array.isArray(resData)) {
            resData = resData.map((s: Record<string, unknown>) => {
                const { txtContent: _txt, ...rest } = s;
                return rest;
            });
        }

        const jsonStr = JSON.stringify({
            type: 'api_response',
            reqId: data.reqId,
            status: 200,
            data: resData
        });

        const chunkSize = 16000;
        const totalChunks = Math.ceil(jsonStr.length / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
            manager.sendToPeer(peerId, {
                type: 'api_response_chunk',
                reqId: data.reqId,
                chunk: jsonStr.substring(i * chunkSize, (i + 1) * chunkSize),
                index: i,
                total: totalChunks
            });
        }
    } catch (error: unknown) {
        console.error('[Host] API Request Error:', error);
        const err = error as Error;
        const errorPayload = {
            type: 'api_response',
            reqId: data.reqId,
            status: 500,
            error: err.message || 'Host API Request Failed'
        };
        const errorStr = JSON.stringify(errorPayload);
        manager.sendToPeer(peerId, {
            type: 'api_response_chunk',
            reqId: data.reqId,
            chunk: errorStr,
            index: 0,
            total: 1
        });
        manager.sendToPeer(peerId, errorPayload);
    }
}
