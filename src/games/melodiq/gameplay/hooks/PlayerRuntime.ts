import React from 'react';
import { MicrophoneManager, type PitchResult } from '../../audio/MicrophoneManager';
import { WebRTCMicManager } from '../../audio/WebRTCMicManager';
import { type UserProfile } from '../../MelodiqSettings';
import { type RatingType } from '../ScoreDisplay';
import { type SungSegment } from '../PitchVisualizer';

/**
 * `PlayerRuntime` — Real-Time Multiplayer State Manager
 * 
 * Manages the high-frequency runtime gameplay state for a single player
 * (either a local player using the host microphone or a remote player streaming via WebRTC).
 * 
 * ## Local vs Remote Audio Routing
 * - If `isRemote` is `false`, instantiates a local `MicrophoneManager`.
 * - If `isRemote` is `true`, routes pitch queries to the global `WebRTCMicManager` using the remote client's `peerId`.
 * 
 * ## Performance Throttling
 * Pitch detection algorithms are CPU-heavy. `getPitch()` enforces a throttle window of `PITCH_THROTTLE_MS` (~30fps)
 * by caching and returning the last calculated `PitchResult` instead of calling `autoCorrelate` on every animation frame.
 * 
 * ## Rendering Optimization
 * To prevent React from re-rendering the DOM at 60fps during game loops:
 * - High-frequency updates (current pitch, sung line segments) are stored in standard React `RefObject`s (`pitchRef`, `segmentsRef`).
 * - These refs are read directly by the HTML5 Canvas in `PitchVisualizer.tsx`, bypassing React's virtual DOM diffing entirely.
 */
export class PlayerRuntime {
    // Local Mic
    public mic: MicrophoneManager | null = null;

    // Remote Mic
    public webRtcManager?: WebRTCMicManager;
    public remotePeerId?: string;

    // Per-Track Scoring
    public trackScores: Record<number, number> = {};
    public score: number = 0; // Keeping for compatibility / total sum or caching

    // Stable refs for high-frequency updates without React renders
    public pitchRef: React.RefObject<PitchResult | null>;
    public segmentsRef: React.RefObject<Record<number, SungSegment[]>>;

    // Helper to track active segment for optimization - Per Track
    public activeSegments: Record<number, SungSegment | null> = {};

    // Combo Tracking
    public combo: number = 0;
    public maxCombo: number = 0;
    public lastHit: { rating: RatingType, score: number, timestamp: number } | null = null;

    // Duet: Current Track Index (0 = P1, 1 = P2)
    public trackIndex: number = 0;

    public config: UserProfile & { deviceId: string; volume?: number; muted?: boolean; latency?: number; isRemote?: boolean; hidePitch?: boolean };

    constructor(config: UserProfile & { deviceId?: string, volume?: number, muted?: number | boolean, latency?: number, isRemote?: boolean, hidePitch?: boolean }, manager?: WebRTCMicManager) {
        this.config = {
            id: config.id,
            name: config.name,
            hue: config.hue,
            deviceId: config.deviceId || '', // Fallback to empty string if undefined
            volume: config.volume ?? 1.0,
            muted: (config.muted === 1 || config.muted === true),
            latency: config.latency ?? 0,
            isRemote: config.isRemote ?? false,
            hidePitch: config.hidePitch ?? false
        };
        this.pitchRef = { current: null };
        this.segmentsRef = { current: {} };
        // Initialize scores
        this.trackScores = { 0: 0, 1: 0 };

        if (this.config.isRemote && manager) {
            this.webRtcManager = manager;
            this.remotePeerId = this.config.deviceId; // For remote, deviceId is the peerId
        } else {
            this.mic = new MicrophoneManager();
        }
    }

    // Pitch caching for performance throttling
    private lastPitchTime: number = 0;
    private cachedPitch: PitchResult | null = null;
    private static PITCH_THROTTLE_MS = 33; // ~30fps for pitch detection

    getPitch(): PitchResult | null {
        const now = performance.now();

        // Return cached pitch if within throttle window
        if (now - this.lastPitchTime < PlayerRuntime.PITCH_THROTTLE_MS) {
            return this.cachedPitch;
        }

        this.lastPitchTime = now;

        if (this.mic) {
            this.cachedPitch = this.mic.getPitch();
        } else if (this.webRtcManager && this.remotePeerId) {
            this.cachedPitch = this.webRtcManager.getPitch(this.remotePeerId);
        } else {
            this.cachedPitch = null;
        }

        return this.cachedPitch;
    }

    start(): Promise<void> {
        if (this.mic && this.config.deviceId && this.config.deviceId !== 'BOT' && !this.config.isRemote) {
            return this.mic.start(this.config.deviceId);
        }
        return Promise.resolve();
    }

    async stop(): Promise<void> {
        if (this.mic) {
            await this.mic.stop();
        }
    }

    attachRemotePeer(manager: WebRTCMicManager, peerId: string) {
        this.webRtcManager = manager;
        this.remotePeerId = peerId;
        // Stop local mic if it was running
        if (this.mic && this.mic.isActive) {
            this.mic.stop();
            this.mic = null; // Disable local mic effectively
        }
    }
}
