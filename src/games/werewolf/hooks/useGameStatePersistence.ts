import { useCallback } from 'react';
import type { GameState } from '../logic/types';

const STORAGE_KEY = 'werewolf-game-state';

export interface SavedGameInfo {
    round: number;
    phase: string;
    playerCount: number;
    savedAt: string;
}

/**
 * `useGameStatePersistence` — Werewolf Session Persistence Hook
 *
 * Provides crash-recovery and session-resume functionality by serializing
 * the active `GameState` to `localStorage` under the key `'werewolf-game-state'`.
 *
 * State is **only saved if the game has started** (i.e., phase !== `'SETUP'`)
 * to avoid persisting pre-game configuration.
 *
 * @returns Object with five stable callback functions:
 *   - `saveGameState(state)` — Serializes and saves the given state.
 *   - `loadGameState()` — Deserializes and returns the saved state, or `null`.
 *   - `getSavedGameInfo()` — Returns lightweight metadata (round, phase, playerCount) without deserializing the full state.
 *   - `clearSavedGame()` — Removes the persisted state (call on game reset).
 *   - `hasSavedGame()` — Returns `true` if a persisted session exists.
 */
export const useGameStatePersistence = () => {
    const saveGameState = useCallback((state: GameState) => {
        // Only save if game has started (not in SETUP phase)
        if (state.phase !== 'SETUP') {
            const dataToSave = {
                state,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    const loadGameState = useCallback((): GameState | null => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.state as GameState;
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
        return null;
    }, []);

    const getSavedGameInfo = useCallback((): SavedGameInfo | null => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const state = parsed.state as GameState;
                return {
                    round: state.round,
                    phase: state.phase,
                    playerCount: state.players.length,
                    savedAt: parsed.savedAt
                };
            }
        } catch (error) {
            console.error('Failed to get saved game info:', error);
        }
        return null;
    }, []);

    const clearSavedGame = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const hasSavedGame = useCallback((): boolean => {
        return localStorage.getItem(STORAGE_KEY) !== null;
    }, []);

    return {
        saveGameState,
        loadGameState,
        getSavedGameInfo,
        clearSavedGame,
        hasSavedGame
    };
};
