/**
 * Shared types for Melodiq game
 */

// Color presets for player customization
export const COLOR_PRESETS = [
    { name: 'Cyan', hue: 190, color: 'hsl(190, 100%, 50%)' },
    { name: 'Green', hue: 120, color: 'hsl(120, 100%, 50%)' },
    { name: 'Blue', hue: 240, color: 'hsl(240, 100%, 50%)' },
    { name: 'Purple', hue: 270, color: 'hsl(270, 100%, 50%)' },
    { name: 'Pink', hue: 330, color: 'hsl(330, 100%, 50%)' },
    { name: 'Red', hue: 0, color: 'hsl(0, 100%, 50%)' },
    { name: 'Orange', hue: 30, color: 'hsl(30, 100%, 50%)' },
];

export type ClientRole = 'admin' | 'queue_manager' | 'queue_contributor' | 'singer';

export interface UserProfile {
    id: string;
    name: string;
    hue: number;
    hidePitch?: boolean;
}

export interface ActivePlayer {
    profileId: string;
    deviceId: string;
    volume?: number;
    muted?: boolean;
    latency?: number;
    isRemote?: boolean;
    hidePitch?: boolean;
    name?: string;
    hue?: number;
}

import { type SungSegment } from './gameplay/PitchVisualizer';
import { type PitchResult } from './audio/MicrophoneManager';
import { type RatingType } from './gameplay/ScoreDisplay';

export interface PassivePlayerState {
    id: string;
    name: string;
    hue: number;
    score: number;
    trackScores: Record<number, number>;
    currentPitch: PitchResult | null;
    activeSegments: Record<number, SungSegment | null>;
    sungSegments?: Record<number, SungSegment[]>;
    combo: number;
    lastHit: { rating: RatingType, score: number, timestamp: number } | null;
}

export interface PassiveGameState {
    players: PassivePlayerState[];
    isPlaying: boolean;
    isFinished: boolean;
    isPausedForScore: boolean;
    currentTime: number;
    hostTimestamp?: number;
    activeSongId?: string | null;
    lyricsScale?: number;
    enableLyricsZoom?: boolean;
    lyricsPosition?: 'bottom' | 'center';
}

export interface MelodiqProfile {
    id?: string;
    deviceId: string;
    name: string;
    hue: number;
    customName?: string;
    peerId?: string;
    isRemote?: boolean;
    micDeviceId?: string;
    displayMode?: 'lyrics' | 'self' | 'all';
    latency?: number;
}

export interface MelodiqParticipant {
    deviceId: string;
    name?: string;
    profileId?: string;
    hue?: number;
    volume?: number;
    muted?: boolean;
    latency?: number;
    isRemote?: boolean;
    role?: 'singer' | 'spectator' | ClientRole;
}

export interface UsdbSongItem {
    id?: number | string;
    usdbId?: string | number;
    artist: string;
    title: string;
    year?: string | number;
    language?: string;
    genre?: string;
    edition?: string;
    coverUrl?: string;
    isDownloaded?: boolean;
    jobId?: string;
}

export interface MelodiqHostStateUpdate {
    songId?: string;
    status?: 'idle' | 'playing' | 'paused' | 'ended';
    currentTime?: number;
    players?: Array<{ config?: MelodiqProfile; id?: string; deviceId?: string; name?: string; hue?: number }>;
    activeSongId?: string | null;
    activeSong?: { id: string; title?: string; artist?: string } | null;
    isPlaying?: boolean;
    isFinished?: boolean;
    isPausedForScore?: boolean;
    hostTimestamp?: number;
}

export interface PresentationConnection extends EventTarget {
    state?: string;
    send: (data: string) => void;
    close?: () => void;
    terminate?: () => void;
    onmessage: ((ev: MessageEvent) => void) | null;
}

export interface PresentationConnectionList extends EventTarget {
    connections: PresentationConnection[];
    onconnectionavailable: ((ev: { connection: PresentationConnection }) => void) | null;
}

export interface PresentationReceiver {
    connectionList: Promise<PresentationConnectionList>;
}

export interface NavigatorWithPresentation extends Navigator {
    presentation?: {
        receiver?: PresentationReceiver;
    };
}

export interface MelodiqRosterMember {
    deviceId: string;
    peerId?: string;
    name: string;
    hue: number;
    role?: string;
}

export interface MelodiqNetworkMessage {
    type: string;
    state?: PassiveGameState & {
        activeSong?: { id: string; title?: string; artist?: string } | null;
        players?: Array<{ id?: string; deviceId?: string; name?: string; hue?: number; config?: MelodiqProfile }>;
    };
    participants?: MelodiqParticipant[];
    activeSong?: { id: string; title?: string; artist?: string } | null;
    roster?: MelodiqRosterMember[];
    reqId?: string;
    chunk?: string;
    index?: number;
    total?: number;
    command?: string;
    [key: string]: unknown;
}

export type { Song, SongMeta } from './db';
export type { LocalSong } from './logic/localLibraryProvider';
