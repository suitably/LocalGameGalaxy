import React from 'react';
import { MicrophoneManager, type PitchResult } from '../../audio/MicrophoneManager';
import { WebRTCMicManager } from '../../audio/WebRTCMicManager';
import { type UserProfile } from '../../MelodiqSettings';
import { type RatingType } from '../ScoreDisplay';
import { type SungSegment } from '../PitchVisualizer';

// Helper class to manage runtime state for a single player
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

    public config: UserProfile & { deviceId: string; volume?: number; muted?: boolean; latency?: number; isRemote?: boolean };

    constructor(config: UserProfile & { deviceId?: string, volume?: number, muted?: number | boolean, latency?: number, isRemote?: boolean }, manager?: WebRTCMicManager) {
        this.config = {
            id: config.id,
            name: config.name,
            hue: config.hue,
            deviceId: config.deviceId || '', // Fallback to empty string if undefined
            volume: config.volume ?? 1.0,
            muted: (config.muted === 1 || config.muted === true),
            latency: config.latency ?? 0,
            isRemote: config.isRemote ?? false
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
            return this.mic.start(this.config.deviceId, this.config.volume, this.config.muted);
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
