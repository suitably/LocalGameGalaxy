import { useCallback } from 'react';
import type { GameState } from '../logic/types';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

const STORAGE_KEY = STORAGE_KEYS.WEREWOLF_STATE;

export interface SavedGameInfo {
    round: number;
    phase: string;
    playerCount: number;
    savedAt: string;
}

interface SavedGameData {
    state: GameState;
    savedAt: string;
}

/**
 * `useGameStatePersistence` — Werewolf Session Persistence Hook
 *
 * Provides crash-recovery and session-resume functionality by serializing
 * the active `GameState` to centralized `storage` under `STORAGE_KEYS.WEREWOLF_STATE`.
 *
 * State is **only saved if the game has started** (i.e., phase !== `'SETUP'`)
 * to avoid persisting pre-game configuration.
 */
export const useGameStatePersistence = () => {
    const saveGameState = useCallback((state: GameState) => {
        // Only save if game has started (not in SETUP phase)
        if (state.phase !== 'SETUP') {
            const dataToSave: SavedGameData = {
                state,
                savedAt: new Date().toISOString()
            };
            storage.setJson(STORAGE_KEY, dataToSave);
        } else {
            storage.remove(STORAGE_KEY);
        }
    }, []);

    const loadGameState = useCallback((): GameState | null => {
        const parsed = storage.getJson<SavedGameData | null>(STORAGE_KEY, null);
        if (parsed && parsed.state) {
            return parsed.state;
        }
        return null;
    }, []);

    const getSavedGameInfo = useCallback((): SavedGameInfo | null => {
        const parsed = storage.getJson<SavedGameData | null>(STORAGE_KEY, null);
        if (parsed && parsed.state) {
            return {
                round: parsed.state.round,
                phase: parsed.state.phase,
                playerCount: parsed.state.players.length,
                savedAt: parsed.savedAt
            };
        }
        return null;
    }, []);

    const clearSavedGame = useCallback(() => {
        storage.remove(STORAGE_KEY);
    }, []);

    const hasSavedGame = useCallback((): boolean => {
        return Boolean(storage.get(STORAGE_KEY, ''));
    }, []);

    return {
        saveGameState,
        loadGameState,
        getSavedGameInfo,
        clearSavedGame,
        hasSavedGame
    };
};
