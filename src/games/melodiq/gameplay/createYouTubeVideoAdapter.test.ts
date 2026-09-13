import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createYouTubeVideoAdapter } from './createYouTubeVideoAdapter';
import type { YTPlayerInstance } from './youtubeApi';

describe('createYouTubeVideoAdapter', () => {
    let mockPlayer: Partial<YTPlayerInstance>;
    let isReady = false;

    beforeEach(() => {
        isReady = false;
        mockPlayer = {
            getCurrentTime: vi.fn().mockReturnValue(10),
            seekTo: vi.fn(),
            playVideo: vi.fn(),
            pauseVideo: vi.fn(),
            getPlayerState: vi.fn().mockReturnValue(1),
            getPlaybackRate: vi.fn().mockReturnValue(1),
            setPlaybackRate: vi.fn(),
            mute: vi.fn(),
            setVolume: vi.fn(),
        };
    });

    it('initializes with correct properties and default time', () => {
        const adapter = createYouTubeVideoAdapter({
            videoId: 'dQw4w9WgXcQ',
            getPlayer: () => mockPlayer as YTPlayerInstance,
            isPlayerReady: () => isReady,
            initialTime: 5,
        });

        expect(adapter.src).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(adapter.currentTime).toBe(5);
        expect(adapter.readyState).toBe(0);
        expect(adapter.paused).toBe(true);
    });

    it('reads currentTime from player when ready', () => {
        isReady = true;
        const adapter = createYouTubeVideoAdapter({
            videoId: 'dQw4w9WgXcQ',
            getPlayer: () => mockPlayer as YTPlayerInstance,
            isPlayerReady: () => isReady,
        });

        expect(adapter.currentTime).toBe(10);
        expect(adapter.readyState).toBe(4);
    });

    describe('soft drift tolerance & seek rate-limiting', () => {
        it('does not seek if drift is within tolerance (e.g. 0.8s with tolerance 1.8s)', () => {
            isReady = true;
            mockPlayer.getCurrentTime = vi.fn().mockReturnValue(10.0);

            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
                driftToleranceSec: 1.8,
                seekCooldownMs: 3000,
            });

            // Minor drift of 0.8s
            adapter.currentTime = 10.8;

            expect(mockPlayer.seekTo).not.toHaveBeenCalled();
            expect(adapter.currentTime).toBe(10);
        });

        it('seeks when drift exceeds tolerance (e.g. 2.5s > 1.8s)', () => {
            isReady = true;
            mockPlayer.getCurrentTime = vi.fn().mockReturnValue(10.0);

            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
                driftToleranceSec: 1.8,
                seekCooldownMs: 3000,
            });

            // Desync of 2.5s exceeds 1.8s
            adapter.currentTime = 12.5;

            expect(mockPlayer.seekTo).toHaveBeenCalledWith(12.5, true);
        });

        it('enforces seek cooldown between consecutive seeks', () => {
            isReady = true;
            mockPlayer.getCurrentTime = vi.fn().mockReturnValue(10.0);

            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
                driftToleranceSec: 1.8,
                seekCooldownMs: 3000,
            });

            // First seek: should trigger
            adapter.currentTime = 15.0;
            expect(mockPlayer.seekTo).toHaveBeenCalledTimes(1);

            // Immediate second seek: cooldown not elapsed, should not call seekTo again
            adapter.currentTime = 20.0;
            expect(mockPlayer.seekTo).toHaveBeenCalledTimes(1);
        });
    });

    describe('paused state reporting', () => {
        it('reports not paused during state 1 (PLAYING) and state 3 (BUFFERING)', () => {
            isReady = true;
            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
            });

            mockPlayer.getPlayerState = vi.fn().mockReturnValue(1); // PLAYING
            expect(adapter.paused).toBe(false);

            mockPlayer.getPlayerState = vi.fn().mockReturnValue(3); // BUFFERING
            expect(adapter.paused).toBe(false);
        });

        it('reports paused during state 2 (PAUSED) and state 0 (ENDED)', () => {
            isReady = true;
            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
            });

            mockPlayer.getPlayerState = vi.fn().mockReturnValue(2); // PAUSED
            expect(adapter.paused).toBe(true);

            mockPlayer.getPlayerState = vi.fn().mockReturnValue(0); // ENDED
            expect(adapter.paused).toBe(true);
        });
    });

    describe('play/pause deduplication', () => {
        it('calls playVideo when not playing, but avoids redundant calls when already playing', async () => {
            isReady = true;
            mockPlayer.getPlayerState = vi.fn().mockReturnValue(2); // Initially paused

            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
            });

            await adapter.play();
            expect(mockPlayer.playVideo).toHaveBeenCalledTimes(1);

            // When already playing (state 1), second play() call should not trigger playVideo again
            mockPlayer.getPlayerState = vi.fn().mockReturnValue(1);
            await adapter.play();
            expect(mockPlayer.playVideo).toHaveBeenCalledTimes(1);
        });

        it('calls pauseVideo when playing, but avoids redundant calls when already paused', async () => {
            isReady = true;
            mockPlayer.getPlayerState = vi.fn().mockReturnValue(1); // Playing

            const adapter = createYouTubeVideoAdapter({
                videoId: 'dQw4w9WgXcQ',
                getPlayer: () => mockPlayer as YTPlayerInstance,
                isPlayerReady: () => isReady,
            });

            await adapter.play(); // Set internal playing state
            adapter.pause();
            expect(mockPlayer.pauseVideo).toHaveBeenCalledTimes(1);

            // Second pause() call while already paused should not call pauseVideo again
            mockPlayer.getPlayerState = vi.fn().mockReturnValue(2);
            adapter.pause();
            expect(mockPlayer.pauseVideo).toHaveBeenCalledTimes(1);
        });
    });
});
