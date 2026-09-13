import { type SongMeta, type Song } from '../db';
import { melodiqFetch } from '../api/melodiqFetch';
import { getYouTubeVideoId } from '../gameplay/YouTubeBackgroundPlayer';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

export interface HelperConfig {
    url: string;
    token: string;
    enabled: boolean;
}

export const getHelperConfig = (): HelperConfig => ({
    url: storage.get(STORAGE_KEYS.HELPER_URL, 'http://localhost:3000'),
    token: storage.get(STORAGE_KEYS.HELPER_TOKEN, ''),
    enabled: storage.isHelperActive()
});

/**
 * Processes raw server song entries into normalized SongMeta array.
 */
export function processServerSongs(
    rawSongs: Record<string, unknown>[],
    helperUrl: string,
    token: string,
    txtCache?: Map<string, string>
): SongMeta[] {
    const cleanHelperUrl = helperUrl.replace(/\/$/, '');

    return rawSongs.map((s: Record<string, unknown>) => {
        const id = String(s.id || '');
        const txtContent = typeof s.txtContent === 'string' ? s.txtContent : undefined;
        if (id && txtContent && txtCache) {
            txtCache.set(id, txtContent);
        }

        const processUrl = (url?: unknown): string | undefined => {
            if (typeof url === 'string') {
                if (url.includes('/media') && url.includes('path=http')) {
                    try {
                        const parsed = new URL(url, window.location.origin);
                        const rawPath = parsed.searchParams.get('path');
                        if (rawPath && (rawPath.startsWith('http://') || rawPath.startsWith('https://'))) {
                            return rawPath;
                        }
                    } catch {
                        // ignore URL parse errors
                    }
                }
                if (url.startsWith('/media')) {
                    let final = `${cleanHelperUrl}${url}`;
                    if (token && !final.includes('token=')) {
                        final += (final.includes('?') ? '&' : '?') + `token=${token}`;
                    }
                    return final;
                }
                if (url.startsWith(cleanHelperUrl) && url.includes('/media') && token && !url.includes('token=')) {
                    return url + (url.includes('?') ? '&' : '?') + `token=${token}`;
                }
                return url;
            }
            return undefined;
        };

        const rawVideo = s.video;
        const ytId = typeof rawVideo === 'string' ? getYouTubeVideoId(rawVideo) : null;
        const videoStr = ytId ? `https://www.youtube.com/watch?v=${ytId}` : processUrl(rawVideo);

        return {
            id,
            source: 'server',
            title: String(s.title || ''),
            artist: String(s.artist || ''),
            bpm: typeof s.bpm === 'number' ? s.bpm : undefined,
            year: typeof s.year === 'string' || typeof s.year === 'number' ? String(s.year) : undefined,
            language: typeof s.language === 'string' ? s.language : undefined,
            genre: typeof s.genre === 'string' ? s.genre : undefined,
            cover: processUrl(s.cover),
            video: videoStr,
            audio: processUrl(s.audio),
            originalAudio: processUrl(s.originalAudio),
            instrumentalAudio: processUrl(s.instrumentalAudio),
            vocalsAudio: processUrl(s.vocalsAudio),
            hasSeparation: typeof s.hasSeparation === 'boolean'
                ? s.hasSeparation
                : Boolean(s.vocalsAudio || (txtContent && txtContent.includes('#VOCALS:'))),
            duration: typeof s.duration === 'number' ? s.duration : undefined,
            edition: typeof s.edition === 'string' ? s.edition : undefined,
            hasCover: typeof s.hasCover === 'boolean' ? s.hasCover : Boolean(s.cover),
            hasVideo: typeof s.hasVideo === 'boolean' ? s.hasVideo : Boolean(rawVideo || ytId),
            usdbId: typeof s.usdbId === 'number' ? s.usdbId : undefined,
            txtPath: typeof s.txtPath === 'string' ? s.txtPath : undefined
        };
    });
}

const CACHE_NAME = 'melodiq-api-cache';

/**
 * Loads cached server songs from the Cache API for instant UI rendering.
 */
export async function loadCachedServerSongs(helperUrl: string): Promise<Record<string, unknown>[] | null> {
    try {
        if (!('caches' in window)) return null;
        const cache = await caches.open(CACHE_NAME);
        const requestUrl = `${helperUrl.replace(/\/$/, '')}/api/songs`;
        const cachedRes = await cache.match(requestUrl);
        if (cachedRes) {
            const data = await cachedRes.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        }
    } catch (e) {
        console.warn('[ServerSongsProvider] Cache API read failed:', e);
    }
    return null;
}

/**
 * Saves fresh server songs into Cache API.
 */
export async function saveServerSongsToCache(helperUrl: string, songs: unknown[]): Promise<void> {
    try {
        if (!('caches' in window)) return;
        const cache = await caches.open(CACHE_NAME);
        const requestUrl = `${helperUrl.replace(/\/$/, '')}/api/songs`;
        await cache.put(requestUrl, new Response(JSON.stringify(songs)));
    } catch {
        // ignore cache write error
    }
}

/**
 * Fetches fresh songs list from server.
 */
export async function fetchServerSongs(): Promise<Record<string, unknown>[]> {
    const data = await melodiqFetch('/api/songs');
    return Array.isArray(data) ? data : [];
}

/**
 * Fetches full song detail (including txtContent) by id from server.
 */
export async function fetchServerSongDetails(id: string): Promise<Song | undefined> {
    try {
        const res = await melodiqFetch(`/api/songs/${id}`);
        if (res) {
            const ytId = (typeof res.video === 'string' ? getYouTubeVideoId(res.video) : null);
            const finalVideo = ytId ? `https://www.youtube.com/watch?v=${ytId}` : res.video;
            return {
                ...res,
                source: 'server',
                video: finalVideo
            } as Song;
        }
    } catch (e) {
        console.warn('[ServerSongsProvider] Failed to fetch full song data for', id, e);
    }
    return undefined;
}
