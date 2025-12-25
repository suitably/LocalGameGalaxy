import { useCallback } from 'react';
import type { GameState } from '../logic/types';

const STORAGE_KEY = 'werewolf-game-state';

export interface SavedGameInfo {
    round: number;
    phase: string;
    playerCount: number;
    savedAt: string;
}

export const useGameStatePersistence = () => {
    const saveGameState = useCallback((state: GameState) => {
        // Only save if game has started (not in SETUP phase)
        if (state.phase !== 'SETUP') {
            const dataToSave = {
                state,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
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
