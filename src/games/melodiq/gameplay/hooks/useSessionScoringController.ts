import { useRef, useState, useMemo } from 'react';
import { type PlayerRuntime } from './PlayerRuntime';
import { type ScoreDisplayHandle } from '../ScoreDisplay';
import { type SongWithNotes } from '../PitchVisualizer';
import { type PassiveGameState, type ActivePlayer } from '../../types';
import { useScoringEngine } from './useScoringEngine';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';

export interface UseSessionScoringControllerOptions {
    players: PlayerRuntime[];
    ready: boolean;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    virtualTimeRef: React.RefObject<number>;
    isPlayingRef: React.RefObject<boolean>;
    parsedSong: SongWithNotes | null;
    bpmMultiplier?: number;
    trackScoreWeights?: number[];
    goldenNoteMultiplier?: number;
    isPassive?: boolean;
    passiveState?: PassiveGameState | null;
    isClient?: boolean;
    duration: number;
    micLatency?: number;
    onPlaybackUpdate?: (state: { isPlaying: boolean; currentTime: number; duration: number; progress: number }) => void;
    activeSessionOverride?: ActivePlayer[] | null;
    clientDeviceId?: string;
    customLayouts?: Record<number, string>;
}

const DEFAULT_TRACK_SCORE_WEIGHTS = [1, 1];

export function filterVisiblePlayers(
    players: PlayerRuntime[],
    activeParticipantKeys: Set<string>,
    isClient?: boolean,
    clientDeviceId?: string,
    customLayouts?: Record<number, string>
): PlayerRuntime[] {
    let list = players.filter(p => {
        if (p.config.isRemote && !(p.mic || p.webRtcManager)) return false;
        if (p.config.hidePitch) return false;

        if (activeParticipantKeys.size > 0) {
            const devId = p.config.deviceId;
            const profId = p.config.id;
            const peerId = p.remotePeerId;
            const isInActiveSession = (profId && activeParticipantKeys.has(profId)) ||
                                      (devId && activeParticipantKeys.has(devId)) ||
                                      (peerId && activeParticipantKeys.has(peerId));
            if (!isInActiveSession) return false;
        }

        return true;
    });

    if (isClient && clientDeviceId) {
        list = list.filter(p => p.config.deviceId === clientDeviceId);
    }

    const numPlayers = list.length;
    const layoutRule = customLayouts ? customLayouts[numPlayers] : '';
    if (layoutRule === '0') {
        return [];
    }
    return list;
}

export function computeGridLayout(
    numPlayers: number,
    customLayouts?: Record<number, string>
): { rows: number[]; columnWidthPercent: number } {
    let layout = { rows: [1], columnWidthPercent: 100 };
    let layoutRule = customLayouts ? customLayouts[numPlayers] : '';

    if (layoutRule && layoutRule !== 'auto' && layoutRule !== '0') {
        const rows = layoutRule.split(/[\.\-]/).map(Number).filter(n => !isNaN(n) && n > 0);
        if (rows.length > 0) {
            const maxCols = Math.max(...rows);
            return { rows, columnWidthPercent: 100 / maxCols };
        } else {
            layoutRule = '';
        }
    }

    if (!layoutRule || layoutRule === 'auto') {
        if (numPlayers > 0) {
            const cols = Math.ceil(Math.sqrt(numPlayers));
            const numRows = Math.ceil(numPlayers / cols);
            const rows = Array(numRows).fill(cols);
            const remainder = numPlayers % cols;
            if (remainder !== 0) {
                rows[numRows - 1] = remainder;
            }
            layout = { rows, columnWidthPercent: 100 / cols };
        } else {
            layout = { rows: [], columnWidthPercent: 100 };
        }
    }

    return layout;
}

export function useSessionScoringController({
    players,
    ready,
    audioRef,
    vocalsRef,
    videoRef,
    virtualTimeRef,
    isPlayingRef,
    parsedSong,
    bpmMultiplier = 1,
    trackScoreWeights = DEFAULT_TRACK_SCORE_WEIGHTS,
    goldenNoteMultiplier = 2.0,
    isPassive = false,
    passiveState,
    isClient = false,
    duration,
    micLatency = 0,
    onPlaybackUpdate,
    activeSessionOverride = null,
    clientDeviceId,
    customLayouts
}: UseSessionScoringControllerOptions) {
    const scoreDisplayRef = useRef<ScoreDisplayHandle>(null);
    const progressLineRef = useRef<HTMLDivElement>(null);
    const [devPitchOverride, setDevPitchOverride] = useState<number | null>(null);

    const activeParticipantKeys = useMemo(() => {
        const session = activeSessionOverride || JSON.parse(storage.get(STORAGE_KEYS.ACTIVE_SESSION) || '[]');
        const keys = new Set<string>();
        if (Array.isArray(session)) {
            session.forEach((p: ActivePlayer) => {
                if (p.profileId) keys.add(p.profileId);
                if (p.deviceId) keys.add(p.deviceId);
            });
        }
        return keys;
    }, [activeSessionOverride]);

    useScoringEngine({
        players,
        ready,
        audioRef,
        vocalsRef,
        videoRef,
        scoreDisplayRef,
        progressLineRef,
        isPlayingRef,
        parsedSong,
        bpmMultiplier,
        trackScoreWeights,
        goldenNoteMultiplier,
        devPitchOverride,
        isPassive,
        passiveState,
        isClient,
        _duration: duration,
        micLatency,
        onPlaybackUpdate,
        virtualTimeRef
    });

    const visiblePlayers = useMemo(() => {
        return filterVisiblePlayers(players, activeParticipantKeys, isClient, clientDeviceId, customLayouts);
    }, [players, activeParticipantKeys, isClient, clientDeviceId, customLayouts]);

    const gridLayout = useMemo(() => {
        return computeGridLayout(visiblePlayers.length, customLayouts);
    }, [visiblePlayers.length, customLayouts]);

    return {
        scoreDisplayRef,
        progressLineRef,
        devPitchOverride,
        setDevPitchOverride,
        visiblePlayers,
        gridLayout,
        activeParticipantKeys
    };
}
