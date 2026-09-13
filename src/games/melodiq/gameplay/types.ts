import { type Song } from '../db';
import { type PassiveGameState } from '../types';

export interface MelodiqSessionHandle {
    togglePlay: () => void;
    isPlaying: boolean;
    getDuration: () => number;
    getCurrentTime: () => number;
    finishSong: () => void;
    isFinished: boolean;
    pauseForScore: () => void;
    resumeFromScore: () => void;
    isPausedForScore: boolean;
    handleNext: () => boolean;
    getGameState: () => PassiveGameState;
}

export interface MelodiqSessionProps {
    song: Song;
    initialTime?: number;
    onExit: (forceHome?: boolean) => void;
    onMinimize?: () => void;
    onPlaybackUpdate?: (state: { isPlaying: boolean; currentTime: number; duration: number; progress: number }) => void;
    showDebugOverlay?: boolean;
    showDevSlider?: boolean;
    showMicStatus?: boolean;
    isTVMode?: boolean;
    muteAudio?: boolean;
    isPassive?: boolean;
    passiveState?: PassiveGameState | null;
    activeSessionOverride?: any[] | null;
    suppressResults?: boolean;
    uiScale?: number;
    isClient?: boolean;
    clientDeviceId?: string;
}
